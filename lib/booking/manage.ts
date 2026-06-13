"use server";

import { formatInTimeZone } from "date-fns-tz";
import { createAdminClient } from "@/lib/db/admin";
import { checkManageToken, makeManageToken } from "@/lib/booking/manage-token";
import { sendEmail } from "@/lib/notifications";
import { getBookingFacts } from "@/lib/notifications/booking-facts";
import { appUrl } from "@/lib/app-url";
import { inngest } from "@/lib/inngest/client";

// Manage-link actions (F5): cancel / reschedule via emailed token.
// Inside the cancellation window there is no self-service — the attempt is
// logged to late_action_attempts (AD04) and the policy is shown instead.

type ManagedBooking = {
  id: string;
  provider_id: string;
  client_id: string;
  service_id: string;
  starts_at: string;
  cancellation_window_hours: number;
  status: string;
};

async function loadByToken(token: string): Promise<
  | { ok: true; booking: ManagedBooking }
  | { ok: false; reason: "expired" | "invalid" | "gone" }
> {
  const check = checkManageToken(token);
  if (check !== "valid") return { ok: false, reason: check };

  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select(
      "id, provider_id, client_id, service_id, starts_at, cancellation_window_hours, status",
    )
    .eq("manage_token", token)
    .maybeSingle();
  if (!data || data.status !== "confirmed" || data.starts_at <= new Date().toISOString()) {
    return { ok: false, reason: "gone" };
  }
  return { ok: true, booking: data };
}

function hoursBefore(startsAt: string): number {
  return (new Date(startsAt).getTime() - Date.now()) / 3_600_000;
}

function insideWindow(b: ManagedBooking): boolean {
  return hoursBefore(b.starts_at) < b.cancellation_window_hours;
}

async function logLateAttempt(
  b: ManagedBooking,
  kind: "cancel" | "reschedule",
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("late_action_attempts").insert({
    provider_id: b.provider_id,
    booking_id: b.id,
    kind,
    hours_before_start: Math.max(0, Math.round(hoursBefore(b.starts_at) * 100) / 100),
  });
}

export type ManageActionState =
  | { ok: true; newToken?: string; whenText?: string }
  | { ok: false; reason: "late" | "expired" | "invalid" | "gone" | "released" | "taken" | "wrong_service" }
  | { ok?: undefined };

export async function cancelViaToken(
  _prev: ManageActionState,
  formData: FormData,
): Promise<ManageActionState> {
  const token = String(formData.get("token") ?? "");
  const loaded = await loadByToken(token);
  if (!loaded.ok) return { ok: false, reason: loaded.reason };
  const b = loaded.booking;

  if (insideWindow(b)) {
    await logLateAttempt(b, "cancel");
    return { ok: false, reason: "late" };
  }

  const admin = createAdminClient();
  // The token stays: single-use is enforced by the status flip (actions
  // require status='confirmed'), and the kept token lets old links show
  // an honest "this was cancelled" state instead of "expired" (DD21).
  const { error } = await admin
    .from("bookings")
    .update({ status: "cancelled_by_client" })
    .eq("id", b.id)
    .eq("status", "confirmed");
  if (error) return { ok: false, reason: "gone" };

  // Client gets immediate confirmation; the provider hears after 20 min
  // (suppressed if the client rebooks). Waitlist rounds fire from M7.
  const facts = await getBookingFacts(b.id);
  if (facts?.clientEmail) {
    try {
      await sendEmail({
        to: facts.clientEmail,
        providerId: facts.providerId,
        bookingId: facts.bookingId,
        fromName: facts.businessName,
        replyTo: facts.providerEmail,
        templateKey: "booking.cancelled_by_client",
        payload: {
          clientFirstName: facts.clientFirstName,
          businessName: facts.businessName,
          serviceName: facts.serviceName,
          whenText: facts.whenText,
          locationText: facts.locationText,
        },
      });
    } catch {
      // failure is logged in notification_log; the cancellation stands
    }
  }
  await inngest.send({
    name: "booking/cancelled.by_client",
    data: { bookingId: b.id },
  });
  return { ok: true };
}

export async function rescheduleViaToken(
  _prev: ManageActionState,
  formData: FormData,
): Promise<ManageActionState> {
  const token = String(formData.get("token") ?? "");
  const holdId = String(formData.get("hold_id") ?? "");
  const loaded = await loadByToken(token);
  if (!loaded.ok) return { ok: false, reason: loaded.reason };
  const b = loaded.booking;

  if (insideWindow(b)) {
    await logLateAttempt(b, "reschedule");
    return { ok: false, reason: "late" };
  }

  const admin = createAdminClient();
  const newToken = makeManageToken();
  const { data, error } = await admin.rpc("reschedule_booking", {
    p_old_booking_id: b.id,
    p_hold_id: holdId,
    p_new_manage_token: newToken,
  });
  if (error) throw new Error(`reschedule_booking failed: ${error.message}`);

  const row = (data as { booking_id: string | null; error: string | null }[])[0];
  if (!row?.booking_id) {
    const reason = (row?.error ?? "gone") as
      | "gone"
      | "late"
      | "released"
      | "taken"
      | "wrong_service";
    return { ok: false, reason };
  }

  // Schedules the new booking's 6h reminder; no provider email for
  // reschedules (F9 table).
  await inngest.send({
    name: "booking/rescheduled",
    data: { bookingId: row.booking_id },
  });

  // Fresh confirmation email (all services) with the new manage link.
  const facts = await getBookingFacts(row.booking_id);
  if (facts?.clientEmail) {
    const freeUntil = new Date(
      new Date(facts.startsAt).getTime() -
        facts.cancellationWindowHours * 3_600_000,
    );
    try {
      await sendEmail({
        to: facts.clientEmail,
        providerId: facts.providerId,
        bookingId: facts.bookingId,
        fromName: facts.businessName,
        replyTo: facts.providerEmail,
        templateKey: "booking.confirmed",
        payload: {
          clientFirstName: facts.clientFirstName,
          businessName: facts.businessName,
          serviceName: facts.serviceName,
          whenText: facts.whenText,
          locationText: facts.locationText,
          prepInstructions: facts.prepInstructions,
          cancellationText: `Free cancellation until ${formatInTimeZone(
            freeUntil,
            "Europe/Brussels",
            "EEEE d MMMM 'at' HH:mm",
          )}.`,
          manageUrl: appUrl(`/manage/${newToken}`),
        },
      });
    } catch {
      /* logged in notification_log */
    }
  }
  return { ok: true, whenText: facts?.whenText ?? "" };
}
