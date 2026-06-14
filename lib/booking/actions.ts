"use server";

import { formatInTimeZone } from "date-fns-tz";
import { makeManageToken } from "@/lib/booking/manage-token";
import { createAdminClient } from "@/lib/db/admin";
import { claimHold } from "@/lib/scheduling/holds";
import { canOfferInterval } from "@/lib/scheduling/engine";
import { getAvailabilityInput } from "@/lib/scheduling/availability";
import { getProviderBySlug } from "@/lib/booking/slots";
import { normalizePhone } from "@/lib/booking/phone";
import { resolveServiceSet } from "@/lib/booking/service-set";
import { sendEmail } from "@/lib/notifications";
import { appUrl } from "@/lib/app-url";
import { inngest } from "@/lib/inngest/client";

// Public booking actions (F5). Anonymous clients act only through these —
// no table access from the browser.

function whenText(startsAt: string, timezone: string): string {
  return formatInTimeZone(
    new Date(startsAt),
    timezone,
    "EEEE d MMMM yyyy 'at' HH:mm",
  );
}

// ── Step 3→4: place the 5-minute hold ────────────────────────────────

export type HoldState =
  | { ok: true; holdId: string; expiresAt: string }
  | { ok: false; reason: "slot_taken" | "invalid" }
  | { ok?: undefined };

export async function placeHold(
  _prev: HoldState,
  formData: FormData,
): Promise<HoldState> {
  const slug = String(formData.get("slug") ?? "");
  const serviceIds = String(formData.get("service_ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const startsAt = String(formData.get("starts_at") ?? "");
  const date = String(formData.get("date") ?? "");
  if (serviceIds.length === 0) return { ok: false, reason: "invalid" };

  const provider = await getProviderBySlug(slug);
  if (!provider || !provider.is_active) return { ok: false, reason: "invalid" };

  const starts = new Date(startsAt);
  if (Number.isNaN(starts.getTime())) return { ok: false, reason: "invalid" };

  // Validate the INTERVAL, not exact slot-list membership (DD22): gap-start
  // slots shift whenever a hold expires or a booking is cancelled, so a
  // time the engine offered seconds ago can vanish from the list while the
  // range itself is still perfectly free. The engine checks the day's
  // shape; the claim transaction + EXCLUDE constraints settle races.
  const input = await getAvailabilityInput({
    providerId: provider.id,
    serviceIds,
    date,
  });
  if (!input) return { ok: false, reason: "invalid" };
  if (!canOfferInterval(input, starts)) {
    return { ok: false, reason: "slot_taken" };
  }

  const durationMs = input.service.durationMinutes * 60_000;
  const bufferMs =
    (input.service.bufferMinutes ?? input.provider.globalBufferMinutes) * 60_000;
  const result = await claimHold({
    providerId: provider.id,
    serviceIds,
    slot: {
      startsAt: starts,
      endsAt: new Date(starts.getTime() + durationMs),
      effectiveEndAt: new Date(starts.getTime() + durationMs + bufferMs),
    },
  });
  if (!result.ok) return { ok: false, reason: "slot_taken" };
  return {
    ok: true,
    holdId: result.holdId,
    expiresAt: result.expiresAt.toISOString(),
  };
}

// Backing out of the details step frees the slot immediately instead of
// leaving it invisible for the rest of the 5 minutes.
export async function releaseHold(holdId: string): Promise<void> {
  if (!holdId) return;
  const admin = createAdminClient();
  await admin
    .from("slot_holds")
    .update({ status: "expired" })
    .eq("id", holdId)
    .eq("status", "active");
}

// ── Phone recognition + existing-booking detection ───────────────────

export type RecognizeResult = {
  firstName?: string;
  email?: string;
  existing?: {
    serviceName: string;
    startsAt: string;
    whenText: string;
    manageToken: string;
  };
};

export async function recognizePhone(
  slug: string,
  rawPhone: string,
): Promise<RecognizeResult> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return {};
  const provider = await getProviderBySlug(slug);
  if (!provider) return {};

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, first_name, email")
    .eq("provider_id", provider.id)
    .eq("phone", phone)
    .maybeSingle();
  if (!client) return {};

  const { data: booking } = await admin
    .from("bookings")
    .select("starts_at, manage_token, service_ids")
    .eq("provider_id", provider.id)
    .eq("client_id", client.id)
    .eq("status", "confirmed")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(1)
    .maybeSingle();

  const services = booking
    ? await resolveServiceSet(provider.id, (booking.service_ids as string[]) ?? [])
    : null;

  return {
    firstName: client.first_name,
    email: client.email ?? undefined,
    existing: booking
      ? {
          serviceName: services!.label,
          startsAt: booking.starts_at,
          whenText: whenText(booking.starts_at, provider.timezone),
          manageToken: booking.manage_token,
        }
      : undefined,
  };
}

// ── Step 5: atomic hold→booking conversion ───────────────────────────

export type ConfirmState =
  | {
      ok: true;
      whenText: string;
      serviceName: string;
      locationText: string | null;
      prepInstructions: string | null;
      cancellationText: string;
      email: string;
      manageToken: string;
    }
  | { ok: false; reason: "released" | "existing" | "taken" | "invalid" }
  | { ok?: undefined };

export async function confirmBooking(
  _prev: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const slug = String(formData.get("slug") ?? "");
  const holdId = String(formData.get("hold_id") ?? "");
  const firstName = String(formData.get("first_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));

  if (!holdId || !firstName || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: "invalid" };
  }
  const provider = await getProviderBySlug(slug);
  if (!provider) return { ok: false, reason: "invalid" };

  const manageToken = makeManageToken();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("confirm_client_booking", {
    p_hold_id: holdId,
    p_phone: phone,
    p_first_name: firstName,
    p_email: email,
    p_manage_token: manageToken,
  });
  if (error) throw new Error(`confirm_client_booking failed: ${error.message}`);

  const row = (data as { booking_id: string | null; error: string | null }[])[0];
  if (!row?.booking_id) {
    const reason = (row?.error ?? "invalid") as "released" | "existing" | "taken";
    return { ok: false, reason };
  }

  // Booking facts for the confirmation screen + email — all services.
  const { data: booking } = await admin
    .from("bookings")
    .select("starts_at, service_ids")
    .eq("id", row.booking_id)
    .single();
  const services = await resolveServiceSet(provider.id, booking!.service_ids ?? []);

  const when = whenText(booking!.starts_at, provider.timezone);
  const freeUntil = new Date(
    new Date(booking!.starts_at).getTime() -
      provider.cancellation_window_hours * 3_600_000,
  );
  const cancellationText = `Free cancellation until ${formatInTimeZone(
    freeUntil,
    provider.timezone,
    "EEEE d MMMM 'at' HH:mm",
  )}.`;

  const businessName =
    provider.business_name ?? provider.provider_name ?? "";
  try {
    await sendEmail({
      to: email,
      providerId: provider.id,
      bookingId: row.booking_id,
      fromName: businessName,
      replyTo: provider.email,
      templateKey: "booking.confirmed",
      payload: {
        clientFirstName: firstName,
        businessName,
        serviceName: services.label,
        whenText: when,
        locationText: provider.location_text,
        prepInstructions: services.prepInstructions,
        cancellationText,
        manageUrl: appUrl(`/manage/${manageToken}`),
      },
    });
  } catch {
    // Send failure is logged in notification_log; the booking stands.
  }

  // Provider notification (5-min delay, AD10) + 6h reminder live in Inngest.
  await inngest.send({
    name: "booking/confirmed",
    data: { bookingId: row.booking_id },
  });

  return {
    ok: true,
    whenText: when,
    serviceName: services.label,
    locationText: provider.location_text,
    prepInstructions: services.prepInstructions,
    cancellationText,
    email,
    manageToken,
  };
}

// ── Edge state: waitlist join (rounds land in M7) ────────────────────

export type WaitlistState = { ok?: boolean; error?: string };

export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const slug = String(formData.get("slug") ?? "");
  const serviceId = String(formData.get("service_id") ?? "");
  const firstName = String(formData.get("first_name") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const datePreference = String(formData.get("date_preference") ?? "") || null;

  if (!firstName || !phone) return { error: "invalid" };
  const provider = await getProviderBySlug(slug);
  if (!provider) return { error: "invalid" };

  const admin = createAdminClient();
  const { data: client, error: clientError } = await admin
    .from("clients")
    .upsert(
      { provider_id: provider.id, phone, first_name: firstName },
      { onConflict: "provider_id,phone" },
    )
    .select("id")
    .single();
  if (clientError) return { error: "server" };

  const { error } = await admin.from("waitlist_entries").insert({
    provider_id: provider.id,
    service_id: serviceId,
    client_id: client.id,
    date_preference: datePreference,
  });
  if (error) return { error: "server" };
  return { ok: true };
}
