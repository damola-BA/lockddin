"use client";

import { useState } from "react";
import { Copy, Link2, Share2 } from "lucide-react";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary();

function useCopied() {
  const [copied, setCopied] = useState(false);
  const flash = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return [copied, flash] as const;
}

// The provider's most-shared asset, front-and-center on the dashboard: one tap
// to copy, or the native share sheet to send it to socials / a client.
export function BookingLinkCard({
  url,
  businessName,
}: {
  url: string;
  businessName?: string;
}) {
  const [copied, flash] = useCopied();
  const display = url.replace(/^https?:\/\//, "");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      flash();
    } catch {
      /* clipboard blocked — the link is still visible to copy by hand */
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: businessName || t.dashboard.yourLink,
          text: businessName ? `Book with ${businessName}` : undefined,
          url,
        });
      } catch {
        /* user dismissed the share sheet */
      }
    } else {
      copy();
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-4">
        {t.dashboard.yourLink}
      </p>
      <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2.5">
        <Link2 size={14} strokeWidth={1.8} className="shrink-0 text-accent" />
        <span className="flex-1 truncate text-[13px] font-semibold text-ink-2 tabular">
          {display}
        </span>
      </div>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2.5 text-[13px] font-semibold text-ink-2"
        >
          <Copy size={14} strokeWidth={1.8} />
          {copied ? t.dashboard.copied : t.dashboard.copyLink}
        </button>
        <button
          type="button"
          onClick={share}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ctrl px-4 py-2.5 text-[13px] font-semibold text-ctrl-ink"
        >
          <Share2 size={14} strokeWidth={1.8} />
          {t.dashboard.shareLink}
        </button>
      </div>
    </section>
  );
}
