"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { createServerSupabase } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { sendEmail } from "@/lib/notifications";
import { getBookingFacts } from "@/lib/notifications/booking-facts";
import { makeManageToken } from "@/lib/booking/manage-token";
import { canOfferInterval } from "@/lib/scheduling/engine";
import { getAvailabilityInput, getDayAvailability } from "@/lib/scheduling/availability";
import { appUrl } from "@/lib/app-url";
import { inngest } from "@/lib/inngest/client";
import { CANCEL_REASONS } from "@/lib/dashboard/cancel-reasons";

export type DashActionState = { ok?: boolean; error?: string };

async function requireProvider() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");
  return user.id;
}

export async function providerCancelBooking(
  _prev: DashActionState,
  formData: FormData,
): Promise<DashActionState> {
  const providerId = await requireProvider();
  const bookingId = String(formData.get("booking_id") ?? "");
  const reasonKey = String(formData.get("reason") ?? "");
  const reasonText = String(formData.get("reason_text") ?? "").trim();
  if (!bookingId || !CANCEL_REASONS[reasonKey]) return { error: "invalid" };

  const reason =
    reasonKey === "other" ? reasonText || CANCEL_REASONS.other : CANCEL_REASONS[reasonKey];

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("bookings")
    .update({ status: "cancelled_by_provider", cancel_reason: reason })
    .eq("id", bookingId)
    .eq("provider_id", providerId)
    .eq("status", "confirmed")
    .select("id")
    .maybeSingle();
  if (error || !updated) return { error: "gone" };

  // Client email: reason + apology + rebook link (no provider self-notify).
  const facts = await getBookingFacts(bookingId);
  if (facts?.clientEmail) {
    try {
      await sendEmail({
        to: facts.clientEmail,
        providerId,
        bookingId,
        fromName: facts.businessName,
        replyTo: facts.providerEmail,
        templateKey: "booking.cancelled_by_provider",
        payload: {
          clientFirstName: facts.clientFirstName,
          businessName: facts.businessName,
          serviceName: facts.serviceName,
          whenText: facts.whenText,
          locationText: facts.locationText,
          reason,
          rebookUrl: appUrl(`/b/${facts.slug}`),
        },
      });
    } catch {
      // failure recorded in notification_log; the cancellation stands
    }
  }
  // Return a visible success (not a silent redirect) so the provider sees
  // it land; the day manager + dashboard re-render without the booking.
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/days");
  revalidatePath(`/dashboard/booking/${bookingId}`);
  return { ok: true };
}

export async function toggleNoShow(
  _prev: DashActionState,
  formData: FormData,
): Promise<DashActionState> {
  const providerId = await requireProvider();
  const bookingId = String(formData.get("booking_id") ?? "");
  const isNoShow = formData.get("is_no_show") === "true";
  if (!bookingId) return { error: "invalid" };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("set_booking_no_show", {
    p_booking_id: bookingId,
    p_provider_id: providerId,
    p_is_no_show: isNoShow,
  });
  if (error || !data) return { error: "gone" };
  revalidatePath(`/dashboard/booking/${bookingId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

// Provider reschedule: pick a new slot (engine-validated), atomic move.
export async function providerReschedule(
  _prev: DashActionState,
  formData: FormData,
): Promise<DashActionState> {
  const providerId = await requireProvider();
  const bookingId = String(formData.get("booking_id") ?? "");
  const serviceIds = String(formData.get("service_ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const startsAtIso = String(formData.get("starts_at") ?? "");
  const date = String(formData.get("date") ?? "");
  const starts = new Date(startsAtIso);
  if (!bookingId || serviceIds.length === 0 || Number.isNaN(starts.getTime())) {
    return { error: "invalid" };
  }

  const input = await getAvailabilityInput({ providerId, serviceIds, date });
  if (!input || !canOfferInterval(input, starts)) return { error: "slot_taken" };

  const durationMs = input.service.durationMinutes * 60_000;
  const bufferMs =
    (input.service.bufferMinutes ?? input.provider.globalBufferMinutes) * 60_000;
  const newToken = makeManageToken();

  const admin = createAdminClient();
  const { data: newId, error } = await admin.rpc("provider_reschedule_booking", {
    p_old_booking_id: bookingId,
    p_provider_id: providerId,
    p_starts_at: starts.toISOString(),
    p_ends_at: new Date(starts.getTime() + durationMs).toISOString(),
    p_effective_end_at: new Date(starts.getTime() + durationMs + bufferMs).toISOString(),
    p_new_token: newToken,
  });
  if (error) {
    if (error.message.includes("slot_taken")) return { error: "slot_taken" };
    return { error: "gone" };
  }
  if (!newId) return { error: "gone" };

  // Client gets the new time + fresh manage link; reminder re-armed.
  const facts = await getBookingFacts(newId as string);
  if (facts?.clientEmail) {
    const freeUntil = new Date(
      new Date(facts.startsAt).getTime() -
        facts.cancellationWindowHours * 3_600_000,
    );
    try {
      await sendEmail({
        to: facts.clientEmail,
        providerId,
        bookingId: newId as string,
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
          manageUrl: appUrl(`/manage/${facts.manageToken}`),
        },
      });
    } catch {
      /* logged in notification_log */
    }
  }
  await inngest.send({ name: "booking/rescheduled", data: { bookingId: newId } });

  revalidatePath("/dashboard");
  redirect(`/dashboard/booking/${newId}`);
}

// Server-side slot fetch for the reschedule picker.
export async function rescheduleSlots(
  providerId: string,
  serviceIds: string[],
  date: string,
): Promise<{ startsAt: string; label: string }[]> {
  const slots = await getDayAvailability({ providerId, serviceIds, date });
  return slots.map((s) => ({
    startsAt: s.startsAt.toISOString(),
    label: formatInTimeZone(s.startsAt, "Europe/Brussels", "HH:mm"),
  }));
}

export async function deleteClient(
  _prev: DashActionState,
  formData: FormData,
): Promise<DashActionState> {
  const providerId = await requireProvider();
  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return { error: "invalid" };
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("anonymize_client", {
    p_client_id: clientId,
    p_provider_id: providerId,
  });
  if (error || !data) return { error: "gone" };
  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients");
}
