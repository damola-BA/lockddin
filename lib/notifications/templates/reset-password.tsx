import { Text } from "@react-email/components";
import { EmailShell, EmailButton, paragraph } from "./base";

export function ResetPassword({ resetUrl }: { resetUrl: string }) {
  return (
    <EmailShell preview="Reset your LockdDin password">
      <Text style={paragraph}>Hi,</Text>
      <Text style={paragraph}>
        Tap the button below to choose a new password. The link works once
        and expires in 30 minutes.
      </Text>
      <EmailButton href={resetUrl} label="Choose a new password" />
      <Text style={{ ...paragraph, color: "#8a7d6b", fontSize: "13px" }}>
        If you didn&apos;t ask for this, you can ignore this email — your
        password stays as it is.
      </Text>
    </EmailShell>
  );
}
