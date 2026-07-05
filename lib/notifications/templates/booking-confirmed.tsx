import { Text } from "@react-email/components";
import { EmailShell, EmailButton, paragraph } from "./base";
import { emailCopy } from "../email-copy";

export function BookingConfirmed({
  clientFirstName,
  businessName,
  serviceName,
  whenText,
  locationText,
  prepInstructions,
  cancellationText,
  manageUrl,
  lang,
}: {
  clientFirstName: string;
  businessName: string;
  serviceName: string;
  whenText: string;
  locationText: string | null;
  prepInstructions: string | null;
  cancellationText: string;
  manageUrl: string;
  lang?: string;
}) {
  const t = emailCopy(lang);
  return (
    <EmailShell preview={t.confirmedPreview(serviceName, whenText)} lang={t.htmlLang}>
      <Text style={paragraph}>{t.hi(clientFirstName)}</Text>
      <Text style={paragraph}>{t.youreBooked(businessName)}</Text>
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
      <Text style={{ ...paragraph, color: "#8a7d6b", fontSize: "13px" }}>
        {cancellationText}
      </Text>
      <EmailButton href={manageUrl} label={t.cancelReschedule} />
      <Text style={{ ...paragraph, color: "#8a7d6b", fontSize: "13px" }}>
        {t.linkPersonal}
      </Text>
    </EmailShell>
  );
}
