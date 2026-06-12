import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { getDayAvailability } from "@/lib/scheduling/availability";
import { lastBookableDate } from "@/lib/scheduling/booking-window";
import { toZonedTime } from "date-fns-tz";
import type { Slot } from "@/lib/scheduling/types";

// Read-side helpers for the public booking page (F5). All run server-side
// with the service role; the page itself never touches tables.

export type PublicProvider = {
  id: string;
  business_name: string | null;
  provider_name: string | null;
  city: string | null;
  location_text: string | null;
  work_photos: unknown[];
  timezone: string;
  booking_window: "3_days" | "current_week" | "current_month" | "3_months";
  cancellation_window_hours: number;
  global_buffer_minutes: number;
  schedule_type: "regular" | "flexible";
  is_active: boolean;
};

export async function getProviderBySlug(
  slug: string,
): Promise<PublicProvider | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("providers")
    .select(
      "id, business_name, provider_name, city, location_text, work_photos, timezone, booking_window, cancellation_window_hours, global_buffer_minutes, schedule_type, is_active, onboarding_step",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!data || data.onboarding_step !== "complete") return null;
  return data as PublicProvider;
}

function* datesFromToday(timezone: string, lastDate: string, now: Date) {
  const local = toZonedTime(now, timezone);
  const cursor = new Date(
    Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()),
  );
  while (true) {
    const date = cursor.toISOString().slice(0, 10);
    if (date > lastDate) return;
    yield date;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

/** The dates a calendar should offer at all (window + day shape only —
 *  actual slot availability is checked when the client taps a day). */
export async function getBookableDays(
  provider: PublicProvider,
  now = new Date(),
): Promise<string[]> {
  const admin = createAdminClient();
  const last = lastBookableDate(provider.booking_window, now, provider.timezone);

  const [{ data: templateDays }, { data: overrides }] = await Promise.all([
    admin
      .from("week_template_days")
      .select("weekday")
      .eq("provider_id", provider.id),
    admin
      .from("day_overrides")
      .select("date, kind")
      .eq("provider_id", provider.id)
      .lte("date", last),
  ]);

  const workingWeekdays = new Set((templateDays ?? []).map((d) => d.weekday));
  const overrideByDate = new Map(
    (overrides ?? []).map((o) => [o.date as string, o.kind as string]),
  );

  const out: string[] = [];
  for (const date of datesFromToday(provider.timezone, last, now)) {
    const override = overrideByDate.get(date);
    if (override === "closed") continue;
    if (provider.schedule_type === "flexible") {
      if (override === "open") out.push(date);
      continue;
    }
    if (override === "open" || override === "modified") {
      out.push(date);
      continue;
    }
    const jsDate = new Date(`${date}T12:00:00Z`);
    const weekday = (jsDate.getUTCDay() + 6) % 7; // 0=Mon..6=Sun
    if (workingWeekdays.has(weekday)) out.push(date);
  }
  return out;
}

export type PublicSlot = { startsAt: string; endsAt: string };

function publicSlots(slots: Slot[]): PublicSlot[] {
  // effective_end (buffer) is invisible to clients (F4).
  return slots.map((s) => ({
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
  }));
}

export async function getSlotsForDay(
  provider: PublicProvider,
  serviceId: string,
  date: string,
  now = new Date(),
): Promise<PublicSlot[]> {
  const slots = await getDayAvailability({
    providerId: provider.id,
    serviceId,
    date,
    now,
  });
  return publicSlots(slots);
}

/** Default picker view (DD05 + DD24): whole days at a time — every slot of
 *  the earliest day with availability is shown before the next day starts,
 *  and we stop once at least `minimum` slots are listed. */
export async function getEarliestSlots(
  provider: PublicProvider,
  serviceId: string,
  minimum = 5,
  now = new Date(),
): Promise<PublicSlot[]> {
  const days = await getBookableDays(provider, now);
  const out: PublicSlot[] = [];
  for (const date of days) {
    if (out.length >= minimum) break;
    const slots = await getDayAvailability({
      providerId: provider.id,
      serviceId,
      date,
      now,
    });
    out.push(...publicSlots(slots)); // never truncate mid-day
  }
  return out;
}
