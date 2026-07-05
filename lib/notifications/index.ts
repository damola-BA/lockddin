import "server-only";
import { Resend } from "resend";
import type { ReactElement } from "react";
import { createAdminClient } from "@/lib/db/admin";
import { VerifyEmail } from "./templates/verify-email";
import { ResetPassword } from "./templates/reset-password";
import { BookingConfirmed } from "./templates/booking-confirmed";
import { BookingReminder } from "./templates/booking-reminder";
import { ProviderNewBooking } from "./templates/provider-new-booking";
import { ClientCancelConfirmed } from "./templates/client-cancel-confirmed";
import { ProviderClientCancelled } from "./templates/provider-client-cancelled";
import { CancelledByProvider } from "./templates/cancelled-by-provider";
import { emailCopy } from "./email-copy";

// The single email gateway (hard rule 6). Every send writes a
// notification_log row first; no ad-hoc Resend calls anywhere else.
// Sender: bookings@{domain} with the provider's business name as the
// from-name; reply-to is the provider's own email (F9).

const FROM_ADDRESS = "bookings@send.lockddin.com";

export type BookingEmailFacts = {
  clientFirstName: string;
  businessName: string;
  serviceName: string;
  whenText: string;
  locationText: string | null;
};

type TemplateInput =
  | { templateKey: "auth.verify_email"; payload: { verifyUrl: string } }
  | { templateKey: "auth.reset_password"; payload: { resetUrl: string } }
  | {
      templateKey: "booking.confirmed";
      payload: BookingEmailFacts & {
        prepInstructions: string | null;
        cancellationText: string;
        manageUrl: string;
      };
    }
  | {
      templateKey: "booking.reminder";
      payload: BookingEmailFacts & {
        prepInstructions: string | null;
        manageUrl: string;
      };
    }
  | {
      templateKey: "booking.new_for_provider";
      payload: { clientFirstName: string; serviceName: string; whenText: string };
    }
  | { templateKey: "booking.cancelled_by_client"; payload: BookingEmailFacts }
  | {
      templateKey: "booking.client_cancelled_for_provider";
      payload: { clientFirstName: string; serviceName: string; whenText: string };
    }
  | {
      templateKey: "booking.cancelled_by_provider";
      payload: BookingEmailFacts & { reason: string | null; rebookUrl: string };
    };

export type SendArgs = TemplateInput & {
  to: string;
  providerId?: string;
  bookingId?: string;
  /** From-name; falls back to "LockdDin" for auth email. */
  fromName?: string;
  replyTo?: string;
  /**
   * Language for subject + body. If omitted, resolved from the provider's
   * `language` column (via providerId). Auth email has no provider → English.
   */
  language?: string;
};

function renderTemplate(
  input: TemplateInput,
  lang: string,
): {
  subject: string;
  react: ReactElement;
} {
  const t = emailCopy(lang);
  switch (input.templateKey) {
    case "auth.verify_email":
      return {
        subject: "Verify your email for LockdDin",
        react: VerifyEmail({ verifyUrl: input.payload.verifyUrl }),
      };
    case "auth.reset_password":
      return {
        subject: "Reset your LockdDin password",
        react: ResetPassword({ resetUrl: input.payload.resetUrl }),
      };
    case "booking.confirmed":
      return {
        subject: t.subjBooked(input.payload.serviceName, input.payload.whenText),
        react: BookingConfirmed({ ...input.payload, lang }),
      };
    case "booking.reminder":
      return {
        subject: t.subjReminder(input.payload.serviceName, input.payload.businessName),
        react: BookingReminder({ ...input.payload, lang }),
      };
    case "booking.new_for_provider":
      return {
        subject: t.subjNewBooking(input.payload.clientFirstName, input.payload.whenText),
        react: ProviderNewBooking({ ...input.payload, lang }),
      };
    case "booking.cancelled_by_client":
      return {
        subject: t.subjClientCancelled(input.payload.serviceName, input.payload.whenText),
        react: ClientCancelConfirmed({ ...input.payload, lang }),
      };
    case "booking.client_cancelled_for_provider":
      return {
        subject: t.subjProviderClientCancelled(
          input.payload.clientFirstName,
          input.payload.whenText,
        ),
        react: ProviderClientCancelled({ ...input.payload, lang }),
      };
    case "booking.cancelled_by_provider":
      return {
        subject: t.subjCancelledByProvider(input.payload.whenText),
        react: CancelledByProvider({ ...input.payload, lang }),
      };
  }
}

export async function sendEmail(args: SendArgs): Promise<void> {
  const supabase = createAdminClient();

  const { data: logRow, error: logError } = await supabase
    .from("notification_log")
    .insert({
      provider_id: args.providerId ?? null,
      booking_id: args.bookingId ?? null,
      recipient_email: args.to,
      template_key: args.templateKey,
      payload: args.payload,
      status: "queued",
    })
    .select("id")
    .single();
  if (logError) throw new Error(`notification_log write failed: ${logError.message}`);

  // Resolve the language: caller-supplied wins; otherwise look it up from the
  // provider (one cheap read — email is not a hot path). Auth email has no
  // provider and no override, so it stays English.
  let language = args.language;
  if (!language && args.providerId) {
    const { data: prov } = await supabase
      .from("providers")
      .select("language")
      .eq("id", args.providerId)
      .single();
    language = prov?.language ?? "en";
  }

  const { subject, react } = renderTemplate(args, language ?? "en");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: sendError } = await resend.emails.send({
    from: `${args.fromName ?? "LockdDin"} <${FROM_ADDRESS}>`,
    to: args.to,
    replyTo: args.replyTo,
    subject,
    react,
  });

  await supabase
    .from("notification_log")
    .update(
      sendError
        ? { status: "failed" }
        : { status: "sent", sent_at: new Date().toISOString() },
    )
    .eq("id", logRow.id);

  if (sendError) throw new Error(`Email send failed: ${sendError.message}`);
}

// A send that was planned but intentionally not made (AD10 and friends):
// log it so the suppression is auditable.
export async function logSuppressed(args: {
  templateKey: string;
  to: string;
  providerId?: string;
  bookingId?: string;
  reason: string;
}): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("notification_log").insert({
    provider_id: args.providerId ?? null,
    booking_id: args.bookingId ?? null,
    recipient_email: args.to,
    template_key: args.templateKey,
    payload: { suppressedBecause: args.reason },
    status: "suppressed",
  });
}
