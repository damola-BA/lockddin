"use client";

import { useActionState, useState } from "react";
import { applyOverride, type PreviewState } from "@/lib/schedule/actions";
import { fill } from "@/lib/i18n";
import { useT } from "@/lib/i18n/context";
import { PageTitle, Hint, ErrorText } from "@/components/provider/ui";

function nextDays(count: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// Flexible mode: tick the days you'll work, set default hours, add them in
// one batch — each becomes a kind='open' day override (F4).
export function FlexibleBatchAdd() {
  const t = useT();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, formAction, pending] = useActionState<PreviewState, FormData>(
    applyOverride,
    {},
  );
  const days = nextDays(35);

  return (
    <div className="mt-4">
      <PageTitle>{t.schedule.flexibleTitle}</PageTitle>
      <Hint>{t.schedule.batchHint}</Hint>

      <form action={formAction}>
        <input type="hidden" name="kind" value="open" />
        <input type="hidden" name="dates" value={[...selected].sort().join(",")} />
        <input type="hidden" name="blocks" value="[]" />

        <div className="grid grid-cols-7 gap-1.5">
          {days.map((date) => {
            const d = new Date(`${date}T00:00:00`);
            const on = selected.has(date);
            return (
              <button
                key={date}
                type="button"
                onClick={() => {
                  const next = new Set(selected);
                  if (on) next.delete(date);
                  else next.add(date);
                  setSelected(next);
                }}
                className={`rounded p-1.5 text-center text-xs ${
                  on
                    ? "bg-accent font-semibold text-white"
                    : "border border-line bg-surface text-ink-2"
                }`}
              >
                <span className="block text-[10px] opacity-70">
                  {t.schedule.weekdays[(d.getDay() + 6) % 7].slice(0, 2)}
                </span>
                {d.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-ink-3">{t.schedule.from}</span>
          <input
            type="time"
            name="start_time"
            defaultValue="09:00"
            required
            className="rounded border border-line bg-surface px-2 py-1.5 text-ink"
          />
          <span className="text-ink-3">{t.schedule.to}</span>
          <input
            type="time"
            name="end_time"
            defaultValue="18:00"
            required
            className="rounded border border-line bg-surface px-2 py-1.5 text-ink"
          />
        </div>

        {state.error && <ErrorText>{t.common.somethingWrong}</ErrorText>}
        {state.applied !== undefined && (
          <p className="mt-3 text-sm text-ok">
            {state.applied > 0
              ? fill(t.schedule.applied, { n: state.applied })
              : t.schedule.appliedNone}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || selected.size === 0}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
        >
          {pending ? t.common.loading : t.schedule.batchAdd}
        </button>
      </form>
    </div>
  );
}
