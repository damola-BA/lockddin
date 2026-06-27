"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Copy, Link2, Share2 } from "lucide-react";
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
  viewUrl,
}: {
  url: string;
  businessName?: string;
  viewUrl?: string;
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
    <section className="rounded-[18px] border border-line bg-surface p-4 shadow-[var(--shadow-sm)] md:p-[18px]">
      <div className="mb-3 flex items-center justify-between gap-2.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-4">
          {t.dashboard.yourLink}
        </p>
        {viewUrl && (
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-3 hover:text-ink-2"
          >
            {t.profile.viewLivePage}
            <ArrowUpRight size={12} strokeWidth={2} />
          </a>
        )}
      </div>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div
          className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border bg-canvas px-3.5 py-3 transition ${
            copied ? "border-ok [box-shadow:0_0_0_3px_var(--ok-l)]" : "border-line"
          }`}
        >
          <Link2 size={16} strokeWidth={1.9} className="shrink-0 text-accent" />
          <span className="flex-1 truncate text-[14px] font-semibold text-ink-2 tabular">
            {display}
          </span>
        </div>
        <div className="flex gap-2.5 sm:shrink-0">
          <button
            type="button"
            onClick={copy}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-4 py-3 text-[13.5px] font-bold transition sm:flex-none ${
              copied
                ? "border-ok bg-ok-l text-ok"
                : "border-line bg-surface text-ink-2"
            }`}
          >
            {copied ? <Check size={15} strokeWidth={2.6} /> : <Copy size={14} strokeWidth={1.9} />}
            {copied ? t.dashboard.copied : t.dashboard.copyLink}
          </button>
          <button
            type="button"
            onClick={share}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ctrl px-4 py-3 text-[13.5px] font-bold text-ctrl-ink sm:flex-none"
          >
            <Share2 size={15} strokeWidth={1.9} />
            {t.dashboard.shareLink}
          </button>
        </div>
      </div>
    </section>
  );
}
