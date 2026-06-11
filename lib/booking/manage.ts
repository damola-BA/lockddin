"use server";

import { formatInTimeZone } from "date-fns-tz";
import { createAdminClient } from "@/lib/db/admin";
import { checkManageToken, makeManageToken } from "@/lib/booking/manage-token";
import { sendEmail } from "@/lib/notifications";
import { appUrl } from "@/lib/app-url";

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

  // Cancellation email is queued for the F9 sender (DD15); waitlist rounds
  // fire from M7.
  const { data: client } = await admin
    .from("clients")
    .select("email, first_name")
    .eq("id", b.client_id)
    .single();
  if (client?.email) {
    await admin.from("notification_log").insert({
      provider_id: b.provider_id,
      booking_id: b.id,
      recipient_email: client.email,
      template_key: "booking.cancelled_by_client",
      payload: { clientFirstName: client.first_name, startsAt: b.starts_at },
      status: "queued",
    });
  }
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

  // Fresh confirmation email with the new manage link.
  const [{ data: provider }, { data: client }, { data: service }, { data: created }] =
    await Promise.all([
      admin
        .from("providers")
        .select("business_name, provider_name, location_text, timezone")
        .eq("id", b.provider_id)
        .single(),
      admin.from("clients").select("first_name, email").eq("id", b.client_id).single(),
      admin
        .from("services")
        .select("name, prep_instructions")
        .eq("id", b.service_id)
        .single(),
      admin.from("bookings").select("starts_at").eq("id", row.booking_id).single(),
    ]);

  const when = formatInTimeZone(
    new Date(created!.starts_at),
    provider!.timezone,
    "EEEE d MMMM yyyy 'at' HH:mm",
  );
  if (client?.email) {
    const freeUntil = new Date(
      new Date(created!.starts_at).getTime() -
        b.cancellation_window_hours * 3_600_000,
    );
    try {
      await sendEmail({
        to: client.email,
        providerId: b.provider_id,
        templateKey: "booking.confirmed",
        payload: {
          clientFirstName: client.first_name,
          businessName: provider!.business_name ?? provider!.provider_name ?? "",
          serviceName: service?.name ?? "",
          whenText: when,
          locationText: provider!.location_text,
          prepInstructions: service?.prep_instructions ?? null,
          cancellationText: `Free cancellation until ${formatInTimeZone(
            freeUntil,
            provider!.timezone,
            "EEEE d MMMM 'at' HH:mm",
          )}.`,
          manageUrl: appUrl(`/manage/${newToken}`),
        },
      });
    } catch {
      /* logged in notification_log */
    }
  }
  return { ok: true, whenText: when };
}
