"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

// Persisted light/dark switch. The pre-paint script in app/layout.tsx sets the
// initial `dark` class; this reads it (via useSyncExternalStore, so there's no
// setState-in-effect) and flips it, remembering the choice.
function subscribe(cb: () => void) {
  window.addEventListener("themechange", cb);
  return () => window.removeEventListener("themechange", cb);
}
function isDark() {
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  function toggle() {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* storage unavailable — the choice just won't persist */
    }
    window.dispatchEvent(new Event("themechange"));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink-3 transition-colors hover:text-ink ${className}`}
    >
      {dark ? <Sun size={17} strokeWidth={1.9} /> : <Moon size={17} strokeWidth={1.9} />}
    </button>
  );
}
