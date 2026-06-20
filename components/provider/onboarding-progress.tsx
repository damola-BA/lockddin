import { getDictionary, fill } from "@/lib/i18n";

const t = getDictionary();

// Three-segment progress spine for the onboarding steps (Profile → Services →
// Schedule). Filled segments are accent; the current step is the last filled.
export function OnboardingProgress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className={`h-[5px] flex-1 rounded-full ${s <= step ? "bg-accent" : "bg-line"}`}
          />
        ))}
      </div>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-4">
        {fill(t.onboarding.stepOf, { current: step, total: 3 })}
      </p>
    </div>
  );
}
