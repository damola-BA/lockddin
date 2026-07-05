"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { setLanguage } from "@/lib/dashboard/settings-actions";
import { LANGUAGES } from "@/lib/i18n";

// Provider language picker. Persists to providers.language; the client-facing
// booking/reschedule pages and emails render in the chosen language.
export function LanguageSetting({ current }: { current: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState(current);

  function choose(code: string) {
    if (code === selected || pending) return;
    setSelected(code);
    start(async () => {
      await setLanguage(code);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 space-y-2">
      {LANGUAGES.map((l) => {
        const active = selected === l.code;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => choose(l.code)}
            disabled={pending}
            aria-pressed={active}
            className={`flex w-full items-center justify-between gap-3 rounded-xl bg-surface p-3.5 text-left disabled:opacity-60 ${
              active
                ? "border-[1.5px] border-accent [box-shadow:0_0_0_3px_var(--accent-l)]"
                : "border border-line"
            }`}
          >
            <span className="text-sm font-semibold text-ink">{l.label}</span>
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                active ? "bg-accent text-white" : "border-[1.5px] border-desk"
              }`}
            >
              {active && <Check size={12} strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
