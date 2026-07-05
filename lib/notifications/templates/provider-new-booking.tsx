import { Text } from "@react-email/components";
import { EmailShell, paragraph } from "./base";
import { emailCopy } from "../email-copy";

export function ProviderNewBooking({
  clientFirstName,
  serviceName,
  whenText,
  lang,
}: {
  clientFirstName: string;
  serviceName: string;
  whenText: string;
  lang?: string;
}) {
  const t = emailCopy(lang);
  return (
    <EmailShell preview={t.pnbPreview(clientFirstName, whenText)} lang={t.htmlLang}>
      <Text style={paragraph}>{t.pnbYouHave}</Text>
      <Text style={{ ...paragraph, fontFamily: "monospace" }}>
        {clientFirstName}
        <br />
        {serviceName}
        <br />
        {whenText}
      </Text>
      <Text style={{ ...paragraph, color: "#8a7d6b", fontSize: "13px" }}>
        {t.pnbOnDashboard}
      </Text>
    </EmailShell>
  );
}
