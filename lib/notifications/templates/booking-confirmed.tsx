import { Text } from "@react-email/components";
import { EmailShell, EmailButton, paragraph } from "./base";

export function BookingConfirmed({
  clientFirstName,
  businessName,
  serviceName,
  whenText,
  locationText,
  prepInstructions,
  cancellationText,
  manageUrl,
}: {
  clientFirstName: string;
  businessName: string;
  serviceName: string;
  whenText: string;
  locationText: string | null;
  prepInstructions: string | null;
  cancellationText: string;
  manageUrl: string;
}) {
  return (
    <EmailShell preview={`Booked: ${serviceName} — ${whenText}`}>
      <Text style={paragraph}>Hi {clientFirstName},</Text>
      <Text style={paragraph}>
        You&apos;re booked with {businessName}.
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
      <Text style={{ ...paragraph, color: "#8a7d6b", fontSize: "13px" }}>
        {cancellationText}
      </Text>
      <EmailButton href={manageUrl} label="Cancel or reschedule" />
      <Text style={{ ...paragraph, color: "#8a7d6b", fontSize: "13px" }}>
        This link is personal to you and works for 7 days.
      </Text>
    </EmailShell>
  );
}
