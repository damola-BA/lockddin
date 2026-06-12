import { Text } from "@react-email/components";
import { EmailShell, paragraph } from "./base";

export function ProviderNewBooking({
  clientFirstName,
  serviceName,
  whenText,
}: {
  clientFirstName: string;
  serviceName: string;
  whenText: string;
}) {
  return (
    <EmailShell preview={`New booking: ${clientFirstName} — ${whenText}`}>
      <Text style={paragraph}>You have a new booking.</Text>
      <Text style={{ ...paragraph, fontFamily: "monospace" }}>
        {clientFirstName}
        <br />
        {serviceName}
        <br />
        {whenText}
      </Text>
      <Text style={{ ...paragraph, color: "#8a7d6b", fontSize: "13px" }}>
        It&apos;s already on your dashboard — nothing to do.
      </Text>
    </EmailShell>
  );
}
