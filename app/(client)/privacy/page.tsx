// Plain-language privacy notice (F5 footer link; AD12 GDPR-light posture).
export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <main className="mx-auto w-full max-w-md px-5 py-10">
        <h1 className="mb-4 font-serif text-2xl text-ink">Privacy notice</h1>
        <div className="space-y-4 text-sm leading-relaxed text-ink-2">
          <p>
            LockdDin is the booking tool your provider uses. When you book, the
            provider is responsible for your details; LockdDin stores them on
            their behalf.
          </p>

          <div>
            <p className="font-medium text-ink">What we store</p>
            <p>
              Your first name, phone number and email address, plus the bookings
              you make. Your phone number is how the provider recognises you — it
              is never shared with other businesses on LockdDin.
            </p>
          </div>

          <div>
            <p className="font-medium text-ink">Why</p>
            <p>
              Only to manage your appointments. Your email is used for booking
              messages — confirmations, reminders and changes. We send no
              marketing, and we don&apos;t ask for marketing consent.
            </p>
          </div>

          <div>
            <p className="font-medium text-ink">Your choices</p>
            <p>
              You can ask your provider to delete your personal details at any
              time, or to give you a copy of what they hold. Deleting your
              details keeps your past bookings only as anonymous records.
            </p>
          </div>

          <p className="text-ink-3">
            Your data is stored in the EU. There are no payments in this booking
            tool, so no card or bank details are ever collected.
          </p>
        </div>
      </main>
    </div>
  );
}
