"use client";

import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary();

const STEPS = [
  { slug: "profile", label: t.onboarding.panelStepProfile, sub: t.onboarding.panelStepProfileSub },
  { slug: "services", label: t.onboarding.panelStepServices, sub: null },
  { slug: "schedule", label: t.onboarding.panelStepSchedule, sub: null },
];

// Vertical stepper for the onboarding brand panel (desktop). Active step is
// accent, completed steps get a green check, upcoming ones are faded. The
// pre-account steps (email/password) sit before step 1; "live" is all-complete.
export function OnboardingStepper() {
  const path = usePathname();
  let current = STEPS.findIndex((s) => path.includes(`/onboarding/${s.slug}`));
  if (path.includes("/onboarding/live")) current = STEPS.length;

  return (
    <div className="mt-10 flex flex-col">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.slug}>
            <div className={`flex items-center gap-3 ${active || done ? "" : "opacity-60"}`}>
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tabular text-white"
                style={{
                  background: active ? "#e0673c" : done ? "#1f6e42" : "transparent",
                  border: active || done ? "none" : "1.5px solid rgba(255,255,255,.35)",
                }}
              >
                {done ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              <div>
                <p className="text-[14.5px] font-bold text-white">{step.label}</p>
                {step.sub && active && (
                  <p className="text-[12px]" style={{ color: "#b8ac9d" }}>
                    {step.sub}
                  </p>
                )}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className="ml-3.5 block h-5 w-0.5"
                style={{ background: "rgba(255,255,255,.14)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
