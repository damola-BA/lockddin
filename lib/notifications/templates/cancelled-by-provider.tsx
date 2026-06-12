import { Text } from "@react-email/components";
import { EmailShell, EmailButton, paragraph } from "./base";

export function CancelledByProvider({
  clientFirstName,
  businessName,
  serviceName,
  whenText,
  reason,
  rebookUrl,
}: {
  clientFirstName: string;
  businessName: string;
  serviceName: string;
  whenText: string;
  locationText: string | null;
  reason: string | null;
  rebookUrl: string;
}) {
  return (
    <EmailShell preview={`Your appointment was cancelled — ${whenText}`}>
      <Text style={paragraph}>Hi {clientFirstName},</Text>
      <Text style={paragraph}>
        We&apos;re sorry — {businessName} had to cancel your appointment:
      </Text>
      <Text style={{ ...paragraph, fontFamily: "monospace" }}>
        {serviceName}
        <br />
        {whenText}
      </Text>
      {reason && (
        <Text style={paragraph}>
          <strong>Their message:</strong> {reason}
        </Text>
      )}
      <Text style={paragraph}>
        They&apos;d love to see you another time — picking a new slot only
        takes a minute:
      </Text>
      <EmailButton href={rebookUrl} label="Book a new time" />
    </EmailShell>
  );
}
