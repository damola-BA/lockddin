"use client";

import { useState } from "react";
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
    <section className="mb-5 rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
        {t.dashboard.yourLink}
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 block truncate font-medium text-accent"
      >
        {display}
      </a>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white"
        >
          {copied ? t.dashboard.copied : t.dashboard.copyLink}
        </button>
        <button
          type="button"
          onClick={share}
          className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink-2"
        >
          {t.dashboard.shareLink}
        </button>
      </div>
    </section>
  );
}
