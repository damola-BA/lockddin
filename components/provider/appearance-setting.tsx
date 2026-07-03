"use client";

import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary();

type Pref = "light" | "dark" | "system";

function currentPref(): Pref {
  try {
    const t = localStorage.getItem("theme");
    return t === "dark" || t === "light" ? t : "system";
  } catch {
    return "system";
  }
}

// Persisted appearance control. Shares the same stored preference as the top-bar
// ThemeToggle: "light"/"dark" pin a theme, "system" follows the OS (stored as no
// key, so the pre-paint script in app/layout.tsx falls back to prefers-color-scheme).
export function AppearanceSetting() {
  const [pref, setPref] = useState<Pref | null>(null);

  // Read the stored value after mount (avoids SSR/localStorage mismatch) and
  // stay in sync if the top-bar toggle changes the theme.
  useEffect(() => {
    const sync = () => setPref(currentPref());
    sync();
    window.addEventListener("themechange", sync);
    return () => window.removeEventListener("themechange", sync);
  }, []);

  // While "system" is active, follow live OS changes.
  useEffect(() => {
    if (pref !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", mq.matches);
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [pref]);

  function choose(next: Pref) {
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      /* storage unavailable — the choice just won't persist */
    }
    const dark =
      next === "dark" ||
      (next === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    setPref(next);
    window.dispatchEvent(new Event("themechange"));
  }

  const options: { value: Pref; label: string; sub: string; Icon: typeof Sun }[] = [
    { value: "light", label: t.settings.themeLight, sub: t.settings.themeLightSub, Icon: Sun },
    { value: "dark", label: t.settings.themeDark, sub: t.settings.themeDarkSub, Icon: Moon },
    { value: "system", label: t.settings.themeSystem, sub: t.settings.themeSystemSub, Icon: Monitor },
  ];

  return (
    <div className="mt-3 space-y-2">
      {options.map((o) => {
        const active = pref === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => choose(o.value)}
            aria-pressed={active}
            className={`flex w-full items-center gap-3 rounded-xl bg-surface p-3.5 text-left ${
              active
                ? "border-[1.5px] border-accent [box-shadow:0_0_0_3px_var(--accent-l)]"
                : "border border-line"
            }`}
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-ink-3">
              <o.Icon size={16} strokeWidth={1.9} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">{o.label}</span>
              <span className="mt-0.5 block text-[12.5px] text-ink-3">{o.sub}</span>
            </span>
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
