import { Text } from "@react-email/components";
import { EmailShell, EmailButton, paragraph } from "./base";

export function BookingReminder({
  clientFirstName,
  businessName,
  serviceName,
  whenText,
  locationText,
  prepInstructions,
  manageUrl,
}: {
  clientFirstName: string;
  businessName: string;
  serviceName: string;
  whenText: string;
  locationText: string | null;
  prepInstructions: string | null;
  manageUrl: string;
}) {
  return (
    <EmailShell preview={`Reminder: ${serviceName} — ${whenText}`}>
      <Text style={paragraph}>Hi {clientFirstName},</Text>
      <Text style={paragraph}>
        A friendly reminder of your appointment with {businessName}:
      </Text>
      <Text style={{ ...paragraph, fontFamily: "monospace" }}>
        {serviceName}
        <br />
        {whenText}
        {locationText ? (
          <>
            <br />
            {locationText}
          </>
        ) : null}
      </Text>
      {prepInstructions && (
        <Text style={paragraph}>
          <strong>Before your appointment:</strong> {prepInstructions}
        </Text>
      )}
      <EmailButton href={manageUrl} label="Cancel or reschedule" />
    </EmailShell>
  );
}
