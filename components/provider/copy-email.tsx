"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useT } from "@/lib/i18n/context";

// A scannable value (client email) with copy-to-clipboard revealed on hover —
// the canonical pattern from the Profile booking-link copy (icon → check swap).
export function CopyEmail({ email }: { email: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the email is still visible to copy by hand */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? t.dashboard.copied : t.dashboard.copyEmail}
      className="group inline-flex max-w-full items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink-2"
    >
      <span className="truncate">{email}</span>
      <span
        className={`shrink-0 transition-opacity ${
          copied ? "text-ok opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
        }`}
      >
        {copied ? (
          <Check size={13} strokeWidth={2.6} />
        ) : (
          <Copy size={12} strokeWidth={2} />
        )}
      </span>
    </button>
  );
}
