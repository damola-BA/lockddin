"use client";

// Friendly fallback for unhandled errors in the provider app (dashboard,
// onboarding) — a graceful message + retry instead of a raw crash.
export default function ProviderError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10 text-center">
        <h1 className="mb-2 font-serif text-2xl">Something went wrong</h1>
        <p className="mb-6 text-sm text-ink-3">
          That didn&apos;t load as it should. Your data is safe — please try
          again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mx-auto rounded-xl bg-accent px-5 py-3 font-semibold text-white"
        >
          Try again
        </button>
      </main>
    </div>
  );
}
