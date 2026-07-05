import { Text } from "@react-email/components";
import { EmailShell, EmailButton, paragraph } from "./base";
import { emailCopy } from "../email-copy";

export function BookingReminder({
  clientFirstName,
  businessName,
  serviceName,
  whenText,
  locationText,
  prepInstructions,
  manageUrl,
  lang,
}: {
  clientFirstName: string;
  businessName: string;
  serviceName: string;
  whenText: string;
  locationText: string | null;
  prepInstructions: string | null;
  manageUrl: string;
  lang?: string;
}) {
  const t = emailCopy(lang);
  return (
    <EmailShell preview={t.reminderPreview(serviceName, whenText)} lang={t.htmlLang}>
      <Text style={paragraph}>{t.hi(clientFirstName)}</Text>
      <Text style={paragraph}>{t.reminderIntro(businessName)}</Text>
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
          <strong>{t.beforeAppt}</strong> {prepInstructions}
        </Text>
      )}
      <EmailButton href={manageUrl} label={t.cancelReschedule} />
    </EmailShell>
  );
}
