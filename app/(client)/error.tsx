"use client";

// Friendly fallback for any unhandled error in the client-facing pages
// (booking page, manage links). A client mid-booking never sees a stack.
export default function ClientError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-dvh bg-[#faf6f0] text-ink">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10 text-center">
        <h1 className="mb-2 font-serif text-2xl text-ink">
          Something went wrong
        </h1>
        <p className="mb-6 text-sm text-ink-3">
          That didn&apos;t load as it should. Please try again — your booking
          isn&apos;t affected.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mx-auto rounded-xl bg-ink px-5 py-3 font-semibold text-canvas"
        >
          Try again
        </button>
      </main>
    </div>
  );
}
