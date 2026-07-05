// Localised copy for transactional email. Kept separate from the app
// dictionaries (lib/i18n) because these strings are server-only, carry
// interpolation, and cover both subjects and body. The provider's
// language drives every booking email (client- and provider-facing);
// auth email (verify/reset) has no provider yet, so it stays English.
//
// NOTE: whenText / locationText are pre-formatted upstream and are passed
// through verbatim — date wording itself is not localised here yet.

export type EmailLang = "en" | "fr" | "nl" | "de";

export type EmailCopy = {
  htmlLang: string;
  // subjects
  subjBooked: (service: string, when: string) => string;
  subjReminder: (service: string, business: string) => string;
  subjNewBooking: (name: string, when: string) => string;
  subjClientCancelled: (service: string, when: string) => string;
  subjProviderClientCancelled: (name: string, when: string) => string;
  subjCancelledByProvider: (when: string) => string;
  // shared
  hi: (name: string) => string;
  beforeAppt: string;
  cancelReschedule: string;
  // booking confirmed
  confirmedPreview: (service: string, when: string) => string;
  youreBooked: (business: string) => string;
  linkPersonal: string;
  // reminder
  reminderPreview: (service: string, when: string) => string;
  reminderIntro: (business: string) => string;
  // client cancel confirmed
  cancelPreview: (service: string, when: string) => string;
  cancelIntro: (business: string) => string;
  cancelChangedMind: (business: string) => string;
  // cancelled by provider
  cbpPreview: (when: string) => string;
  cbpIntro: (business: string) => string;
  cbpTheirMessage: string;
  cbpLoveToSee: string;
  cbpBookNewTime: string;
  // provider: new booking
  pnbPreview: (name: string, when: string) => string;
  pnbYouHave: string;
  pnbOnDashboard: string;
  // provider: client cancelled
  pccPreview: (name: string) => string;
  pccCancelled: (name: string) => string;
  pccOpenAgain: string;
};

const en: EmailCopy = {
  htmlLang: "en",
  subjBooked: (s, w) => `Booked: ${s} — ${w}`,
  subjReminder: (s, b) => `Today: ${s} at ${b}`,
  subjNewBooking: (n, w) => `New booking: ${n} — ${w}`,
  subjClientCancelled: (s, w) => `Cancelled: ${s} — ${w}`,
  subjProviderClientCancelled: (n, w) => `${n} cancelled — ${w} is free again`,
  subjCancelledByProvider: (w) => `Your appointment was cancelled — ${w}`,
  hi: (n) => `Hi ${n},`,
  beforeAppt: "Before your appointment:",
  cancelReschedule: "Cancel or reschedule",
  confirmedPreview: (s, w) => `Booked: ${s} — ${w}`,
  youreBooked: (b) => `You're booked with ${b}.`,
  linkPersonal: "This link is personal to you and works for 7 days.",
  reminderPreview: (s, w) => `Reminder: ${s} — ${w}`,
  reminderIntro: (b) => `A friendly reminder of your appointment with ${b}:`,
  cancelPreview: (s, w) => `Cancelled: ${s} — ${w}`,
  cancelIntro: (b) => `Your appointment with ${b} is cancelled:`,
  cancelChangedMind: (b) =>
    `Changed your mind? You can always book again through ${b}'s booking page.`,
  cbpPreview: (w) => `Your appointment was cancelled — ${w}`,
  cbpIntro: (b) => `We're sorry — ${b} had to cancel your appointment:`,
  cbpTheirMessage: "Their message:",
  cbpLoveToSee:
    "They'd love to see you another time — picking a new slot only takes a minute:",
  cbpBookNewTime: "Book a new time",
  pnbPreview: (n, w) => `New booking: ${n} — ${w}`,
  pnbYouHave: "You have a new booking.",
  pnbOnDashboard: "It's already on your dashboard — nothing to do.",
  pccPreview: (n) => `${n} cancelled — slot free again`,
  pccCancelled: (n) => `${n} cancelled their appointment:`,
  pccOpenAgain: "That time is open for new bookings again.",
};

const fr: EmailCopy = {
  htmlLang: "fr",
  subjBooked: (s, w) => `Réservé : ${s} — ${w}`,
  subjReminder: (s, b) => `Aujourd'hui : ${s} chez ${b}`,
  subjNewBooking: (n, w) => `Nouvelle réservation : ${n} — ${w}`,
  subjClientCancelled: (s, w) => `Annulé : ${s} — ${w}`,
  subjProviderClientCancelled: (n, w) => `${n} a annulé — ${w} est de nouveau libre`,
  subjCancelledByProvider: (w) => `Votre rendez-vous a été annulé — ${w}`,
  hi: (n) => `Bonjour ${n},`,
  beforeAppt: "Avant votre rendez-vous :",
  cancelReschedule: "Annuler ou reporter",
  confirmedPreview: (s, w) => `Réservé : ${s} — ${w}`,
  youreBooked: (b) => `Votre rendez-vous avec ${b} est confirmé.`,
  linkPersonal: "Ce lien vous est personnel et reste valable 7 jours.",
  reminderPreview: (s, w) => `Rappel : ${s} — ${w}`,
  reminderIntro: (b) => `Un petit rappel de votre rendez-vous avec ${b} :`,
  cancelPreview: (s, w) => `Annulé : ${s} — ${w}`,
  cancelIntro: (b) => `Votre rendez-vous avec ${b} est annulé :`,
  cancelChangedMind: (b) =>
    `Vous avez changé d'avis ? Vous pouvez toujours réserver à nouveau via la page de réservation de ${b}.`,
  cbpPreview: (w) => `Votre rendez-vous a été annulé — ${w}`,
  cbpIntro: (b) => `Nous sommes désolés — ${b} a dû annuler votre rendez-vous :`,
  cbpTheirMessage: "Son message :",
  cbpLoveToSee:
    "Il/elle serait ravi(e) de vous revoir — choisir un nouveau créneau ne prend qu'une minute :",
  cbpBookNewTime: "Réserver un nouveau créneau",
  pnbPreview: (n, w) => `Nouvelle réservation : ${n} — ${w}`,
  pnbYouHave: "Vous avez une nouvelle réservation.",
  pnbOnDashboard: "Elle est déjà dans votre tableau de bord — rien à faire.",
  pccPreview: (n) => `${n} a annulé — créneau de nouveau libre`,
  pccCancelled: (n) => `${n} a annulé son rendez-vous :`,
  pccOpenAgain: "Ce créneau est de nouveau disponible à la réservation.",
};

const nl: EmailCopy = {
  htmlLang: "nl",
  subjBooked: (s, w) => `Geboekt: ${s} — ${w}`,
  subjReminder: (s, b) => `Vandaag: ${s} bij ${b}`,
  subjNewBooking: (n, w) => `Nieuwe boeking: ${n} — ${w}`,
  subjClientCancelled: (s, w) => `Geannuleerd: ${s} — ${w}`,
  subjProviderClientCancelled: (n, w) => `${n} heeft geannuleerd — ${w} is weer vrij`,
  subjCancelledByProvider: (w) => `Uw afspraak is geannuleerd — ${w}`,
  hi: (n) => `Hallo ${n},`,
  beforeAppt: "Vóór uw afspraak:",
  cancelReschedule: "Annuleren of verzetten",
  confirmedPreview: (s, w) => `Geboekt: ${s} — ${w}`,
  youreBooked: (b) => `Uw afspraak bij ${b} is bevestigd.`,
  linkPersonal: "Deze link is persoonlijk voor u en werkt 7 dagen.",
  reminderPreview: (s, w) => `Herinnering: ${s} — ${w}`,
  reminderIntro: (b) => `Een vriendelijke herinnering aan uw afspraak bij ${b}:`,
  cancelPreview: (s, w) => `Geannuleerd: ${s} — ${w}`,
  cancelIntro: (b) => `Uw afspraak bij ${b} is geannuleerd:`,
  cancelChangedMind: (b) =>
    `Van gedachten veranderd? U kunt altijd opnieuw boeken via de boekingspagina van ${b}.`,
  cbpPreview: (w) => `Uw afspraak is geannuleerd — ${w}`,
  cbpIntro: (b) => `Het spijt ons — ${b} moest uw afspraak annuleren:`,
  cbpTheirMessage: "Hun bericht:",
  cbpLoveToSee:
    "Ze zien u graag een andere keer — een nieuw moment kiezen kost maar een minuut:",
  cbpBookNewTime: "Een nieuw moment boeken",
  pnbPreview: (n, w) => `Nieuwe boeking: ${n} — ${w}`,
  pnbYouHave: "U heeft een nieuwe boeking.",
  pnbOnDashboard: "Hij staat al op uw dashboard — u hoeft niets te doen.",
  pccPreview: (n) => `${n} heeft geannuleerd — moment weer vrij`,
  pccCancelled: (n) => `${n} heeft de afspraak geannuleerd:`,
  pccOpenAgain: "Dat moment is weer vrij om te boeken.",
};

const de: EmailCopy = {
  htmlLang: "de",
  subjBooked: (s, w) => `Gebucht: ${s} — ${w}`,
  subjReminder: (s, b) => `Heute: ${s} bei ${b}`,
  subjNewBooking: (n, w) => `Neue Buchung: ${n} — ${w}`,
  subjClientCancelled: (s, w) => `Storniert: ${s} — ${w}`,
  subjProviderClientCancelled: (n, w) => `${n} hat storniert — ${w} ist wieder frei`,
  subjCancelledByProvider: (w) => `Ihr Termin wurde storniert — ${w}`,
  hi: (n) => `Hallo ${n},`,
  beforeAppt: "Vor Ihrem Termin:",
  cancelReschedule: "Stornieren oder verschieben",
  confirmedPreview: (s, w) => `Gebucht: ${s} — ${w}`,
  youreBooked: (b) => `Ihr Termin bei ${b} ist bestätigt.`,
  linkPersonal: "Dieser Link ist persönlich für Sie und gilt 7 Tage.",
  reminderPreview: (s, w) => `Erinnerung: ${s} — ${w}`,
  reminderIntro: (b) => `Eine freundliche Erinnerung an Ihren Termin bei ${b}:`,
  cancelPreview: (s, w) => `Storniert: ${s} — ${w}`,
  cancelIntro: (b) => `Ihr Termin bei ${b} ist storniert:`,
  cancelChangedMind: (b) =>
    `Doch anders entschieden? Sie können jederzeit erneut über die Buchungsseite von ${b} buchen.`,
  cbpPreview: (w) => `Ihr Termin wurde storniert — ${w}`,
  cbpIntro: (b) => `Es tut uns leid — ${b} musste Ihren Termin stornieren:`,
  cbpTheirMessage: "Ihre Nachricht:",
  cbpLoveToSee:
    "Man würde Sie gerne ein anderes Mal sehen — ein neuer Termin ist in einer Minute gewählt:",
  cbpBookNewTime: "Neuen Termin buchen",
  pnbPreview: (n, w) => `Neue Buchung: ${n} — ${w}`,
  pnbYouHave: "Sie haben eine neue Buchung.",
  pnbOnDashboard: "Sie ist bereits in Ihrem Dashboard — nichts zu tun.",
  pccPreview: (n) => `${n} hat storniert — Termin wieder frei`,
  pccCancelled: (n) => `${n} hat den Termin storniert:`,
  pccOpenAgain: "Dieser Termin ist wieder buchbar.",
};

const COPY: Record<EmailLang, EmailCopy> = { en, fr, nl, de };

export function emailCopy(language: string | null | undefined): EmailCopy {
  return COPY[(language ?? "en") as EmailLang] ?? en;
}
