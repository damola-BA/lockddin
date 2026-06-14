"use server";

import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { createServerSupabase } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { normalizePhone } from "@/lib/booking/phone";
import { makeManageToken } from "@/lib/booking/manage-token";
import { resolveServiceSet } from "@/lib/booking/service-set";
import { canOfferInterval } from "@/lib/scheduling/engine";
import { getAvailabilityInput, getDayAvailability } from "@/lib/scheduling/availability";
import { sendEmail } from "@/lib/notifications";
import { appUrl } from "@/lib/app-url";
import { inngest } from "@/lib/inngest/client";

// Manual / walk-in booking (F8). Provider-side; reuses the same scheduling
// engine and one-active-booking rule. No provider self-notification.

async function requireProvider() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");
  return user.id;
}

export type ManualClient = {
  id: string;
  firstName: string;
  phone: string;
  email: string | null;
  hasActiveBooking: boolean;
};

// Step 1: search clients by name or phone, flagging an existing active
// booking (the one-per-client rule is surfaced here).
export async function searchClientsForBooking(
  query: string,
): Promise<ManualClient[]> {
  const providerId = await requireProvider();
  const admin = createAdminClient();
  const term = query.trim();
  let q = admin
    .from("clients")
    .select("id, first_name, phone, email")
    .eq("provider_id", providerId)
    .order("first_name")
    .limit(20);
  if (term) q = q.or(`first_name.ilike.%${term}%,phone.ilike.%${term}%`);
  const { data: clients } = await q;
  if (!clients || clients.length === 0) return [];

  const { data: active } = await admin
    .from("bookings")
    .select("client_id")
    .eq("provider_id", providerId)
    .eq("status", "confirmed")
    .gt("starts_at", new Date().toISOString())
    .in(
      "client_id",
      clients.map((c) => c.id),
    );
  const activeSet = new Set((active ?? []).map((b) => b.client_id));

  return clients.map((c) => ({
    id: c.id,
    firstName: c.first_name,
    phone: c.phone,
    email: c.email,
    hasActiveBooking: activeSet.has(c.id),
  }));
}

export type CreateClientResult =
  | { ok: true; client: ManualClient }
  | { ok: false; error: "invalid" | "server" };

export async function createClientForBooking(
  firstName: string,
  rawPhone: string,
  email: string,
): Promise<CreateClientResult> {
  const providerId = await requireProvider();
  const name = firstName.trim();
  const phone = normalizePhone(rawPhone);
  const cleanEmail = email.trim().toLowerCase() || null;
  if (!name || !phone) return { ok: false, error: "invalid" };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clients")
    .upsert(
      { provider_id: providerId, phone, first_name: name, email: cleanEmail },
      { onConflict: "provider_id,phone" },
    )
    .select("id, first_name, phone, email")
    .single();
  if (error || !data) return { ok: false, error: "server" };

  const { data: active } = await admin
    .from("bookings")
    .select("id")
    .eq("provider_id", providerId)
    .eq("client_id", data.id)
    .eq("status", "confirmed")
    .gt("starts_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  return {
    ok: true,
    client: {
      id: data.id,
      firstName: data.first_name,
      phone: data.phone,
      email: data.email,
      hasActiveBooking: Boolean(active),
    },
  };
}

// Step 2: slots for the chosen service set + date (same engine).
export async function manualSlots(
  serviceIds: string[],
  date: string,
): Promise<{ startsAt: string; label: string }[]> {
  const providerId = await requireProvider();
  const slots = await getDayAvailability({ providerId, serviceIds, date });
  return slots.map((s) => ({
    startsAt: s.startsAt.toISOString(),
    label: formatInTimeZone(s.startsAt, "Europe/Brussels", "HH:mm"),
  }));
}

// Step 3: create the booking. Client gets the standard confirmation email
// if their email is known; the 6h reminder is scheduled; NO provider notify.
export type ManualBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: "existing" | "taken" | "slot_taken" | "invalid" | "server" };

export async function createManualBooking(
  clientId: string,
  serviceIds: string[],
  startsAtIso: string,
  date: string,
): Promise<ManualBookingResult> {
  const providerId = await requireProvider();
  const starts = new Date(startsAtIso);
  if (!clientId || serviceIds.length === 0 || Number.isNaN(starts.getTime())) {
    return { ok: false, error: "invalid" };
  }

  const input = await getAvailabilityInput({ providerId, serviceIds, date });
  if (!input) return { ok: false, error: "invalid" };
  if (!canOfferInterval(input, starts)) return { ok: false, error: "slot_taken" };

  const durationMs = input.service.durationMinutes * 60_000;
  const bufferMs =
    (input.service.bufferMinutes ?? input.provider.globalBufferMinutes) * 60_000;
  const manageToken = makeManageToken();

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_manual_booking", {
    p_provider_id: providerId,
    p_client_id: clientId,
    p_service_ids: serviceIds,
    p_starts_at: starts.toISOString(),
    p_ends_at: new Date(starts.getTime() + durationMs).toISOString(),
    p_effective_end_at: new Date(starts.getTime() + durationMs + bufferMs).toISOString(),
    p_manage_token: manageToken,
  });
  if (error) return { ok: false, error: "server" };
  const row = (data as { booking_id: string | null; error: string | null }[])[0];
  if (!row?.booking_id) {
    return { ok: false, error: (row?.error ?? "server") as "existing" | "taken" };
  }

  // Client confirmation email (if email known) + provider/business details.
  const [{ data: provider }, { data: client }] = await Promise.all([
    admin
      .from("providers")
      .select("email, business_name, provider_name, location_text, timezone, cancellation_window_hours")
      .eq("id", providerId)
      .single(),
    admin.from("clients").select("first_name, email").eq("id", clientId).single(),
  ]);
  if (client?.email && provider) {
    const services = await resolveServiceSet(providerId, serviceIds);
    const businessName = provider.business_name ?? provider.provider_name ?? "";
    const when = formatInTimeZone(starts, provider.timezone, "EEEE d MMMM yyyy 'at' HH:mm");
    const freeUntil = new Date(
      starts.getTime() - provider.cancellation_window_hours * 3_600_000,
    );
    try {
      await sendEmail({
        to: client.email,
        providerId,
        bookingId: row.booking_id,
        fromName: businessName,
        replyTo: provider.email,
        templateKey: "booking.confirmed",
        payload: {
          clientFirstName: client.first_name,
          businessName,
          serviceName: services.label,
          whenText: when,
          locationText: provider.location_text,
          prepInstructions: services.prepInstructions,
          cancellationText: `Free cancellation until ${formatInTimeZone(
            freeUntil,
            provider.timezone,
            "EEEE d MMMM 'at' HH:mm",
          )}.`,
          manageUrl: appUrl(`/manage/${manageToken}`),
        },
      });
    } catch {
      /* logged in notification_log */
    }
  }

  // Schedules the 6h reminder; the provider-notify job skips source=manual.
  await inngest.send({ name: "booking/confirmed", data: { bookingId: row.booking_id } });
  return { ok: true, bookingId: row.booking_id };
}
