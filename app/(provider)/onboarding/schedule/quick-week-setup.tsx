"use client";

import { useState } from "react";
import { getDictionary } from "@/lib/i18n";
import {
  BlocksEditor,
  type Block,
} from "@/app/(provider)/dashboard/schedule/blocks-editor";

const t = getDictionary();

// Onboarding week fields (DD17/DD34): one set of hours + breaks applied to all
// ticked days. Rendered INSIDE the schedule step's single "Finish" form, so
// the week is saved as part of completing onboarding — no separate save button
// to forget (the trap behind DD26). Per-day tweaks live in the dashboard.
export function QuickWeekSetup({
  initialWeekdays,
  initialStart,
  initialEnd,
  initialBlocks,
}: {
  initialWeekdays: number[];
  initialStart: string;
  initialEnd: string;
  initialBlocks: Block[];
}) {
  const [days, setDays] = useState<Set<number>>(
    new Set(initialWeekdays.length > 0 ? initialWeekdays : [0, 1, 2, 3, 4]),
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1 font-medium text-ink">{t.onboarding.quickWeekTitle}</p>
        <p className="mb-3 text-sm text-ink-3">{t.onboarding.quickWeekHint}</p>

        <p className="mb-1.5 text-sm text-ink-3">{t.onboarding.quickWeekDays}</p>
        <div className="flex gap-1.5">
          {t.schedule.weekdays.map((name, weekday) => {
            const on = days.has(weekday);
            return (
              <button
                key={weekday}
                type="button"
                onClick={() => {
                  const next = new Set(days);
                  if (on) next.delete(weekday);
                  else next.add(weekday);
                  setDays(next);
                }}
                className={`flex-1 rounded-lg py-2.5 text-center text-sm ${
                  on
                    ? "bg-accent font-semibold text-white"
                    : "border border-line bg-surface text-ink-3"
                }`}
              >
                {name.slice(0, 2)}
              </button>
            );
          })}
        </div>
        {[...days].map((w) => (
          <input key={w} type="hidden" name="weekdays" value={w} />
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-ink-3">{t.schedule.from}</span>
        <input
          type="time"
          name="start_time"
          defaultValue={initialStart}
          required
          className="rounded border border-line bg-surface px-2 py-1.5 text-ink"
        />
        <span className="text-ink-3">{t.schedule.to}</span>
        <input
          type="time"
          name="end_time"
          defaultValue={initialEnd}
          required
          className="rounded border border-line bg-surface px-2 py-1.5 text-ink"
        />
      </div>

      <div>
        <p className="mb-2 text-sm text-ink-3">{t.onboarding.quickWeekBreaks}</p>
        <BlocksEditor name="blocks" initial={initialBlocks} showLabel />
      </div>
    </div>
  );
}
