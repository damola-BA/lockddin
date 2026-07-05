import { Text } from "@react-email/components";
import { EmailShell, EmailButton, paragraph } from "./base";
import { emailCopy } from "../email-copy";

export function CancelledByProvider({
  clientFirstName,
  businessName,
  serviceName,
  whenText,
  reason,
  rebookUrl,
  lang,
}: {
  clientFirstName: string;
  businessName: string;
  serviceName: string;
  whenText: string;
  locationText: string | null;
  reason: string | null;
  rebookUrl: string;
  lang?: string;
}) {
  const t = emailCopy(lang);
  return (
    <EmailShell preview={t.cbpPreview(whenText)} lang={t.htmlLang}>
      <Text style={paragraph}>{t.hi(clientFirstName)}</Text>
      <Text style={paragraph}>{t.cbpIntro(businessName)}</Text>
      <Text style={{ ...paragraph, fontFamily: "monospace" }}>
        {serviceName}
        <br />
        {whenText}
      </Text>
      {reason && (
        <Text style={paragraph}>
          <strong>{t.cbpTheirMessage}</strong> {reason}
        </Text>
      )}
      <Text style={paragraph}>{t.cbpLoveToSee}</Text>
      <EmailButton href={rebookUrl} label={t.cbpBookNewTime} />
    </EmailShell>
  );
}
