import { Text } from "@react-email/components";
import { EmailShell, paragraph } from "./base";

export function ProviderClientCancelled({
  clientFirstName,
  serviceName,
  whenText,
}: {
  clientFirstName: string;
  serviceName: string;
  whenText: string;
}) {
  return (
    <EmailShell preview={`${clientFirstName} cancelled — slot free again`}>
      <Text style={paragraph}>
        {clientFirstName} cancelled their appointment:
      </Text>
      <Text style={{ ...paragraph, fontFamily: "monospace" }}>
        {serviceName}
        <br />
        {whenText}
      </Text>
      <Text style={{ ...paragraph, color: "#8a7d6b", fontSize: "13px" }}>
        That time is open for new bookings again.
      </Text>
    </EmailShell>
  );
}
