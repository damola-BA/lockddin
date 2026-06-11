import "server-only";
import { Resend } from "resend";
import type { ReactElement } from "react";
import { createAdminClient } from "@/lib/db/admin";
import { VerifyEmail } from "./templates/verify-email";
import { ResetPassword } from "./templates/reset-password";
import { BookingConfirmed } from "./templates/booking-confirmed";

// The single email gateway (hard rule 6). Every send writes a
// notification_log row first; no ad-hoc Resend calls anywhere else.

const FROM = "LockdDin <bookings@send.lockddin.com>";

type TemplateInput =
  | { templateKey: "auth.verify_email"; payload: { verifyUrl: string } }
  | { templateKey: "auth.reset_password"; payload: { resetUrl: string } }
  | {
      templateKey: "booking.confirmed";
      payload: {
        clientFirstName: string;
        businessName: string;
        serviceName: string;
        whenText: string;
        locationText: string | null;
        prepInstructions: string | null;
        cancellationText: string;
        manageUrl: string;
      };
    };

type SendArgs = TemplateInput & {
  to: string;
  providerId?: string;
  bookingId?: string;
};

function renderTemplate(input: TemplateInput): {
  subject: string;
  react: ReactElement;
} {
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
        subject: `Booked: ${input.payload.serviceName} — ${input.payload.whenText}`,
        react: BookingConfirmed(input.payload),
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

  const { subject, react } = renderTemplate(args);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: sendError } = await resend.emails.send({
    from: FROM,
    to: args.to,
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
