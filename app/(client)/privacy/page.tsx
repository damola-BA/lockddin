// Plain-language privacy notice (F5 footer link). Hardening pass in M8.
export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-[#faf6f0] text-stone-800">
      <main className="mx-auto w-full max-w-md px-5 py-10">
        <h1 className="mb-4 font-serif text-2xl text-stone-900">Privacy notice</h1>
        <div className="space-y-3 text-sm leading-relaxed text-stone-700">
          <p>
            When you book an appointment, we store your first name, phone
            number and email address. Your phone number identifies you to the
            provider you book with — it is never shared with other businesses.
          </p>
          <p>
            Your email is used only for messages about your appointments:
            confirmations, reminders, and changes. No marketing.
          </p>
          <p>
            You can ask the provider to delete your details at any time.
            Bookings older than needed for the provider&apos;s records are
            removed on request.
          </p>
          <p>Data is stored in the EU.</p>
        </div>
      </main>
    </div>
  );
}
