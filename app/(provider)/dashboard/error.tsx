"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { useT } from "@/lib/i18n/context";

// Recovery state for the provider dashboard (and its nested routes). A load
// failure shows a clear message + a retry that re-runs the failed render,
// instead of a blank screen.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  useEffect(() => {
    // Surfaces in the server/console log for debugging; not shown to the user.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-5 text-center">
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-l text-accent">
        <TriangleAlert size={26} strokeWidth={1.9} />
      </span>
      <h1 className="font-serif text-[21px] font-semibold text-ink">{t.common.errorTitle}</h1>
      <p className="mt-1.5 max-w-[300px] text-[13.5px] text-ink-3">{t.common.errorBody}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-ctrl px-5 py-3 text-sm font-bold text-ctrl-ink"
      >
        <RotateCw size={15} strokeWidth={2.2} /> {t.common.tryAgain}
      </button>
    </div>
  );
}
