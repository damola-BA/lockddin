"use client";

import { startTransition, useActionState } from "react";
import { Check } from "lucide-react";
import { setScheduleType, type ActionState } from "@/lib/schedule/actions";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary();

// How your hours work — the ONLY place to switch modes after onboarding. Both
// options are shown so the choice is legible; only one is active. Changing it is
// forward-only (confirmed): it affects how future days are offered, never booked
// appointments.
export function HoursMode({ current }: { current: "regular" | "flexible" }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setScheduleType, {});

  function choose(next: "regular" | "flexible") {
    if (next === current || pending) return;
    if (!window.confirm(t.settings.hoursModeConfirm)) return;
    const fd = new FormData();
    fd.set("schedule_type", next);
    startTransition(() => action(fd));
  }

  const options = [
    { value: "regular" as const, title: t.settings.hoursModeRegular, sub: t.settings.hoursModeRegularSub },
    { value: "flexible" as const, title: t.settings.hoursModeFlexible, sub: t.settings.hoursModeFlexibleSub },
  ];

  return (
    <section className="mt-4 space-y-3">
      <p className="border-b border-line pb-1 text-xs font-semibold uppercase tracking-wide text-ink-4">
        {t.settings.hoursModeTitle}
      </p>
      <div className="space-y-2">
        {options.map((o) => {
          const active = current === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => choose(o.value)}
              disabled={pending}
              aria-pressed={active}
              className={`flex w-full items-start gap-3 rounded-xl bg-surface p-3.5 text-left disabled:opacity-60 ${
                active
                  ? "border-[1.5px] border-accent [box-shadow:0_0_0_3px_var(--accent-l)]"
                  : "border border-line"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  active ? "bg-accent text-white" : "border-[1.5px] border-desk"
                }`}
              >
                {active && <Check size={12} strokeWidth={3} />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{o.title}</span>
                <span className="mt-0.5 block text-[12.5px] text-ink-3">{o.sub}</span>
              </span>
            </button>
          );
        })}
      </div>
      {state.ok && <p className="text-sm text-ok">{t.settings.hoursModeSaved}</p>}
    </section>
  );
}
