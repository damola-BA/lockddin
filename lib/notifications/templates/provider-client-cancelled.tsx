import { Text } from "@react-email/components";
import { EmailShell, paragraph } from "./base";
import { emailCopy } from "../email-copy";

export function ProviderClientCancelled({
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
    <EmailShell preview={t.pccPreview(clientFirstName)} lang={t.htmlLang}>
      <Text style={paragraph}>{t.pccCancelled(clientFirstName)}</Text>
      <Text style={{ ...paragraph, fontFamily: "monospace" }}>
        {serviceName}
        <br />
        {whenText}
      </Text>
      <Text style={{ ...paragraph, color: "#8a7d6b", fontSize: "13px" }}>
        {t.pccOpenAgain}
      </Text>
    </EmailShell>
  );
}
