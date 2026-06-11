import { Text } from "@react-email/components";
import { EmailShell, EmailButton, paragraph } from "./base";

export function VerifyEmail({ verifyUrl }: { verifyUrl: string }) {
  return (
    <EmailShell preview="One tap to verify your email">
      <Text style={paragraph}>Hi,</Text>
      <Text style={paragraph}>
        Welcome to LockdDin. Tap the button below to verify your email —
        you can keep setting up your booking page in the meantime.
      </Text>
      <EmailButton href={verifyUrl} label="Verify my email" />
      <Text style={{ ...paragraph, color: "#8a7d6b", fontSize: "13px" }}>
        If you didn&apos;t create a LockdDin account, you can ignore this email.
      </Text>
    </EmailShell>
  );
}
