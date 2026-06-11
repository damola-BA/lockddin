"use client";

import { useState } from "react";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary();

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-lg border border-stone-600 px-4 py-2 text-sm text-stone-200"
    >
      {copied ? t.dashboard.copied : t.dashboard.copyLink}
    </button>
  );
}
