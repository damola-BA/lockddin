"use client";

import { useActionState, useState } from "react";
import { saveWeekBulk, type ActionState } from "@/lib/schedule/actions";
import { getDictionary } from "@/lib/i18n";
import { ErrorText } from "@/components/provider/ui";
import {
  BlocksEditor,
  type Block,
} from "@/app/(provider)/dashboard/schedule/blocks-editor";

const t = getDictionary();

// Onboarding week setup (DD17): one set of hours + breaks applied to all
// ticked days in one go. Per-day fine-tuning lives in the dashboard.
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
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveWeekBulk,
    {},
  );
  const [days, setDays] = useState<Set<number>>(
    new Set(initialWeekdays.length > 0 ? initialWeekdays : [0, 1, 2, 3, 4]),
  );

  return (
    <form action={formAction} className="mt-4 space-y-5">
      <div>
        <p className="mb-1 font-medium text-stone-100">{t.onboarding.quickWeekTitle}</p>
        <p className="mb-3 text-sm text-stone-400">{t.onboarding.quickWeekHint}</p>

        <p className="mb-1.5 text-sm text-stone-400">{t.onboarding.quickWeekDays}</p>
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
                    ? "bg-amber-400 font-semibold text-stone-950"
                    : "border border-stone-700 bg-stone-900 text-stone-400"
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
        <span className="text-stone-400">{t.schedule.from}</span>
        <input
          type="time"
          name="start_time"
          defaultValue={initialStart}
          required
          className="rounded border border-stone-700 bg-stone-900 px-2 py-1.5 text-stone-100"
        />
        <span className="text-stone-400">{t.schedule.to}</span>
        <input
          type="time"
          name="end_time"
          defaultValue={initialEnd}
          required
          className="rounded border border-stone-700 bg-stone-900 px-2 py-1.5 text-stone-100"
        />
      </div>

      <div>
        <p className="mb-2 text-sm text-stone-400">{t.onboarding.quickWeekBreaks}</p>
        <BlocksEditor name="blocks" initial={initialBlocks} showLabel />
      </div>

      {state.error === "no_days" && <ErrorText>{t.onboarding.needWeek}</ErrorText>}
      {state.error && state.error !== "no_days" && (
        <ErrorText>{t.common.somethingWrong}</ErrorText>
      )}
      {state.ok && (
        <p className="text-sm text-emerald-400">{t.onboarding.quickWeekSaved}</p>
      )}

      <button
        type="submit"
        disabled={pending || days.size === 0}
        className="w-full rounded-lg border border-amber-400 px-4 py-3 text-base font-semibold text-amber-300 disabled:opacity-50"
      >
        {pending ? t.common.loading : t.common.save}
      </button>
    </form>
  );
}
