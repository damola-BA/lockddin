import { inngest } from "../client";
import { createAdminClient } from "@/lib/db/admin";
import { sendEmail, logSuppressed } from "@/lib/notifications";
import { getBookingFacts } from "@/lib/notifications/booking-facts";
import { appUrl } from "@/lib/app-url";

// F9 timed notifications. All sends go through the gateway; suppressions
// are logged so they're auditable.

// Provider hears about a new client booking after 5 minutes — suppressed
// if the booking was cancelled within the delay (AD10).
export const providerNewBookingNotify = inngest.createFunction(
  { id: "provider-new-booking-notify", triggers: [{ event: "booking/confirmed" }] },
  async ({ event, step }) => {
    await step.sleep("ad10-delay", "5m");

    return await step.run("send-or-suppress", async () => {
      const facts = await getBookingFacts(event.data.bookingId as string);
      if (!facts) return { outcome: "booking_missing" };
      if (facts.status !== "confirmed") {
        await logSuppressed({
          templateKey: "booking.new_for_provider",
          to: facts.providerEmail,
          providerId: facts.providerId,
          bookingId: facts.bookingId,
          reason: "cancelled within the 5-minute delay (AD10)",
        });
        return { outcome: "suppressed" };
      }
      await sendEmail({
        to: facts.providerEmail,
        providerId: facts.providerId,
        bookingId: facts.bookingId,
        templateKey: "booking.new_for_provider",
        payload: {
          clientFirstName: facts.clientFirstName,
          serviceName: facts.serviceName,
          whenText: facts.whenText,
        },
      });
      return { outcome: "sent" };
    });
  },
);

// Reminder 6h before the appointment — only when booked more than 6h in
// advance, one reminder only. Rescheduling cancels the original booking,
// so this run no-ops and the new booking's own event takes over.
export const bookingReminder = inngest.createFunction(
  {
    id: "booking-reminder",
    triggers: [{ event: "booking/confirmed" }, { event: "booking/rescheduled" }],
  },
  async ({ event, step }) => {
    const plan = await step.run("plan", async () => {
      const facts = await getBookingFacts(event.data.bookingId as string);
      if (!facts) return { remindAt: null as string | null };
      const remindAt = new Date(
        new Date(facts.startsAt).getTime() - 6 * 3_600_000,
      );
      // Booked 6h or less in advance → no reminder (same-day quick booking).
      if (remindAt.getTime() <= new Date(facts.createdAt).getTime()) {
        return { remindAt: null };
      }
      return { remindAt: remindAt.toISOString() };
    });
    if (!plan.remindAt) return { outcome: "no_reminder_needed" };

    await step.sleepUntil("until-6h-before", plan.remindAt);

    return await step.run("send-if-still-confirmed", async () => {
      const facts = await getBookingFacts(event.data.bookingId as string);
      if (!facts || facts.status !== "confirmed" || !facts.clientEmail) {
        return { outcome: "skipped" };
      }
      await sendEmail({
        to: facts.clientEmail,
        providerId: facts.providerId,
        bookingId: facts.bookingId,
        fromName: facts.businessName,
        replyTo: facts.providerEmail,
        templateKey: "booking.reminder",
        payload: {
          clientFirstName: facts.clientFirstName,
          businessName: facts.businessName,
          serviceName: facts.serviceName,
          whenText: facts.whenText,
          locationText: facts.locationText,
          prepInstructions: facts.prepInstructions,
          manageUrl: appUrl(`/manage/${facts.manageToken}`),
        },
      });
      return { outcome: "sent" };
    });
  },
);

// Provider hears about a client cancellation after 20 minutes — suppressed
// if the same client rebooked within the delay.
export const clientCancelledProviderNotify = inngest.createFunction(
  {
    id: "client-cancelled-provider-notify",
    triggers: [{ event: "booking/cancelled.by_client" }],
  },
  async ({ event, step }) => {
    await step.sleep("rebook-window", "20m");

    return await step.run("send-or-suppress", async () => {
      const facts = await getBookingFacts(event.data.bookingId as string);
      if (!facts) return { outcome: "booking_missing" };

      const admin = createAdminClient();
      const { data: rebooked } = await admin
        .from("bookings")
        .select("id")
        .eq("provider_id", facts.providerId)
        .eq("client_id", facts.clientId)
        .eq("status", "confirmed")
        .gt("starts_at", new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (rebooked) {
        await logSuppressed({
          templateKey: "booking.client_cancelled_for_provider",
          to: facts.providerEmail,
          providerId: facts.providerId,
          bookingId: facts.bookingId,
          reason: "client rebooked within the 20-minute delay",
        });
        return { outcome: "suppressed" };
      }

      await sendEmail({
        to: facts.providerEmail,
        providerId: facts.providerId,
        bookingId: facts.bookingId,
        templateKey: "booking.client_cancelled_for_provider",
        payload: {
          clientFirstName: facts.clientFirstName,
          serviceName: facts.serviceName,
          whenText: facts.whenText,
        },
      });
      return { outcome: "sent" };
    });
  },
);
