import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { getAvailableSlots } from "./engine";
import { localInstant } from "./windows";
import { toZonedTime } from "date-fns-tz";
import type { AvailabilityInput, Slot } from "./types";

// The single injected DB read (F4 step 6) plus input assembly. Everything
// after the fetch is the pure engine.

export async function getDayAvailability(args: {
  providerId: string;
  serviceId: string;
  date: string; // local "YYYY-MM-DD"
  now?: Date;
}): Promise<Slot[]> {
  const { providerId, serviceId, date } = args;
  const now = args.now ?? new Date();
  const admin = createAdminClient();

  const [{ data: provider }, { data: service }] = await Promise.all([
    admin
      .from("providers")
      .select(
        "timezone, booking_window, min_lead_time_minutes, global_buffer_minutes, schedule_type, is_active",
      )
      .eq("id", providerId)
      .single(),
    admin
      .from("services")
      .select("id, duration_minutes, buffer_minutes, is_active")
      .eq("id", serviceId)
      .single(),
  ]);
  if (!provider || !provider.is_active || !service || !service.is_active) {
    return [];
  }

  // weekday convention: 0=Mon..6=Sun; JS getDay(): 0=Sun..6=Sat
  const local = toZonedTime(localInstant(date, 720, provider.timezone), provider.timezone);
  const weekday = (local.getDay() + 6) % 7;

  const dayStart = localInstant(date, 0, provider.timezone);
  const dayEnd = localInstant(date, 1440, provider.timezone);

  const [templateRes, overrideRes, bookingsRes, holdsRes] = await Promise.all([
    admin
      .from("week_template_days")
      .select(
        "weekday, start_time, end_time, daily_cap, service_ids, reserved_blocks (start_time, end_time)",
      )
      .eq("provider_id", providerId)
      .eq("weekday", weekday)
      .maybeSingle(),
    admin
      .from("day_overrides")
      .select("kind, start_time, end_time, extra_blocks, daily_cap")
      .eq("provider_id", providerId)
      .eq("date", date)
      .maybeSingle(),
    admin
      .from("bookings")
      .select("starts_at, effective_end_at")
      .eq("provider_id", providerId)
      .eq("status", "confirmed")
      .lt("starts_at", dayEnd.toISOString())
      .gt("effective_end_at", dayStart.toISOString()),
    admin
      .from("slot_holds")
      .select("starts_at, effective_end_at")
      .eq("provider_id", providerId)
      .eq("status", "active")
      .gt("expires_at", now.toISOString())
      .lt("starts_at", dayEnd.toISOString())
      .gt("effective_end_at", dayStart.toISOString()),
  ]);

  const template = templateRes.data;
  const override = overrideRes.data;

  const input: AvailabilityInput = {
    provider: {
      timezone: provider.timezone,
      bookingWindow: provider.booking_window,
      minLeadTimeMinutes: provider.min_lead_time_minutes,
      globalBufferMinutes: provider.global_buffer_minutes,
      scheduleType: provider.schedule_type,
    },
    service: {
      id: service.id,
      durationMinutes: service.duration_minutes,
      bufferMinutes: service.buffer_minutes,
    },
    date,
    now,
    templateDay: template
      ? {
          weekday: template.weekday,
          start: template.start_time.slice(0, 5),
          end: template.end_time.slice(0, 5),
          dailyCap: template.daily_cap,
          serviceIds: template.service_ids,
          reservedBlocks: (template.reserved_blocks ?? []).map((b) => ({
            start: b.start_time.slice(0, 5),
            end: b.end_time.slice(0, 5),
          })),
        }
      : null,
    override: override
      ? {
          kind: override.kind,
          start: override.start_time?.slice(0, 5) ?? null,
          end: override.end_time?.slice(0, 5) ?? null,
          extraBlocks: (
            (override.extra_blocks ?? []) as { start: string; end: string }[]
          ).map((b) => ({ start: b.start, end: b.end })),
          dailyCap: override.daily_cap,
        }
      : null,
    occupied: {
      confirmedBookings: (bookingsRes.data ?? []).map((b) => ({
        startsAt: new Date(b.starts_at),
        effectiveEndAt: new Date(b.effective_end_at),
      })),
      activeHolds: (holdsRes.data ?? []).map((h) => ({
        startsAt: new Date(h.starts_at),
        effectiveEndAt: new Date(h.effective_end_at),
      })),
    },
  };

  return getAvailableSlots(input);
}
