"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary();

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

// Avatar + account dropdown (desktop top bar). Clicking the avatar opens a panel
// with the provider's identity, a link into their profile/settings, and sign out
// — the one place sign out lives on desktop.
export function AccountMenu({ businessName }: { businessName: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={businessName}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-l font-serif text-[12px] font-semibold text-accent ring-offset-2 ring-offset-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {initials(businessName)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_40px_-18px_rgba(74,46,28,.35)]"
        >
          <div className="flex items-center gap-3 px-4 pb-3.5 pt-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-l font-serif text-[15px] font-semibold text-accent">
              {initials(businessName)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-serif text-[15px] font-semibold text-ink">
                {businessName}
              </p>
              <p className="text-[12px] text-ink-3">{t.dashboard.accountRole}</p>
            </div>
          </div>

          <div className="border-t border-line p-1.5">
            <Link
              href="/dashboard/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-ink-2 hover:bg-surface-2"
            >
              <User size={16} strokeWidth={1.8} className="text-ink-3" />
              {t.settings.navProfile}
            </Link>
          </div>

          <div className="border-t border-line p-1.5">
            <form action={signOut}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium text-ink-2 hover:bg-surface-2"
              >
                <LogOut size={16} strokeWidth={1.8} className="text-ink-3" />
                {t.auth.signOut}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
