import { Text } from "@react-email/components";
import { EmailShell, paragraph } from "./base";

export function ClientCancelConfirmed({
  clientFirstName,
  businessName,
  serviceName,
  whenText,
}: {
  clientFirstName: string;
  businessName: string;
  serviceName: string;
  whenText: string;
  locationText: string | null;
}) {
  return (
    <EmailShell preview={`Cancelled: ${serviceName} — ${whenText}`}>
      <Text style={paragraph}>Hi {clientFirstName},</Text>
      <Text style={paragraph}>
        Your appointment with {businessName} is cancelled:
      </Text>
      <Text style={{ ...paragraph, fontFamily: "monospace" }}>
        {serviceName}
        <br />
        {whenText}
      </Text>
      <Text style={{ ...paragraph, color: "#8a7d6b", fontSize: "13px" }}>
        Changed your mind? You can always book again through {businessName}
        &apos;s booking page.
      </Text>
    </EmailShell>
  );
}
