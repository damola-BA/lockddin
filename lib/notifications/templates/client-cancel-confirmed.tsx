import { Text } from "@react-email/components";
import { EmailShell, paragraph } from "./base";
import { emailCopy } from "../email-copy";

export function ClientCancelConfirmed({
  clientFirstName,
  businessName,
  serviceName,
  whenText,
  lang,
}: {
  clientFirstName: string;
  businessName: string;
  serviceName: string;
  whenText: string;
  locationText: string | null;
  lang?: string;
}) {
  const t = emailCopy(lang);
  return (
    <EmailShell preview={t.cancelPreview(serviceName, whenText)} lang={t.htmlLang}>
      <Text style={paragraph}>{t.hi(clientFirstName)}</Text>
      <Text style={paragraph}>{t.cancelIntro(businessName)}</Text>
      <Text style={{ ...paragraph, fontFamily: "monospace" }}>
        {serviceName}
        <br />
        {whenText}
      </Text>
      <Text style={{ ...paragraph, color: "#8a7d6b", fontSize: "13px" }}>
        {t.cancelChangedMind(businessName)}
      </Text>
    </EmailShell>
  );
}
