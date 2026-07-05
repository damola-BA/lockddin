"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/context";

export type Block = { start: string; end: string; label: string };

// Shared time-block editor: keeps blocks in state, serialises them into a
// hidden input the server action parses (used for recurring reserved
// blocks and one-off override blocks alike).
export function BlocksEditor({
  name,
  initial,
  showLabel,
}: {
  name: string;
  initial: Block[];
  showLabel: boolean;
}) {
  const t = useT();
  const [blocks, setBlocks] = useState<Block[]>(initial);
  const [draft, setDraft] = useState<Block>({ start: "", end: "", label: "" });

  // Fold a valid-but-not-yet-added draft into what gets submitted, so a
  // break someone typed but forgot to "+ Add" is never silently dropped.
  const draftValid =
    Boolean(draft.start) && Boolean(draft.end) && draft.end > draft.start;
  const submitted = draftValid ? [...blocks, draft] : blocks;

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(submitted)} />
      {blocks.map((b, i) => (
        <div
          key={`${b.start}-${b.end}-${i}`}
          className="flex items-center justify-between rounded border border-line bg-surface px-3 py-2 text-sm"
        >
          <span>
            {b.start}–{b.end}
            {b.label && <span className="ml-2 text-ink-3">{b.label}</span>}
          </span>
          <button
            type="button"
            onClick={() => setBlocks(blocks.filter((_, j) => j !== i))}
            className="text-red-600 underline"
          >
            {t.schedule.removeBlock}
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="time"
          value={draft.start}
          onChange={(e) => setDraft({ ...draft, start: e.target.value })}
          className="rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
        />
        <span className="text-ink-3">–</span>
        <input
          type="time"
          value={draft.end}
          onChange={(e) => setDraft({ ...draft, end: e.target.value })}
          className="rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
        />
        {showLabel && (
          <input
            type="text"
            placeholder={t.schedule.blockLabel}
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            className="w-32 rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink placeholder:text-ink-4"
          />
        )}
        <button
          type="button"
          onClick={() => {
            if (!draft.start || !draft.end || draft.end <= draft.start) return;
            setBlocks([...blocks, draft]);
            setDraft({ start: "", end: "", label: "" });
          }}
          className="text-sm text-accent underline"
        >
          + {t.schedule.addBlock}
        </button>
      </div>
    </div>
  );
}
