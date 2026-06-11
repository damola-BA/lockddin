"use client";

import { useActionState, useState } from "react";
import { saveTemplateDay, type ActionState } from "@/lib/schedule/actions";
import { getDictionary } from "@/lib/i18n";
import { PageTitle, Hint, ErrorText } from "@/components/provider/ui";
import { BlocksEditor, type Block } from "./blocks-editor";

const t = getDictionary();

export type TemplateDayData = {
  weekday: number; // 0=Mon..6=Sun
  start: string;
  end: string;
  dailyCap: number | null;
  serviceIds: string[] | null;
  blocks: Block[];
};

type ServiceOption = { id: string; name: string };

function DayCard({
  weekday,
  data,
  services,
}: {
  weekday: number;
  data: TemplateDayData | undefined;
  services: ServiceOption[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveTemplateDay,
    {},
  );
  const [working, setWorking] = useState(Boolean(data));
  const [restrict, setRestrict] = useState(Boolean(data?.serviceIds));

  return (
    <form
      action={formAction}
      className="rounded-lg border border-stone-800 bg-stone-900/60 p-4"
    >
      <input type="hidden" name="weekday" value={weekday} />
      <div className="flex items-center justify-between">
        <span className="font-medium">{t.schedule.weekdays[weekday]}</span>
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            name="working"
            checked={working}
            onChange={(e) => setWorking(e.target.checked)}
            className="accent-amber-400"
          />
          {t.schedule.working}
        </label>
      </div>

      {working && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-stone-400">{t.schedule.from}</span>
            <input
              type="time"
              name="start_time"
              defaultValue={data?.start ?? "09:00"}
              required
              className="rounded border border-stone-700 bg-stone-900 px-2 py-1.5 text-stone-100"
            />
            <span className="text-stone-400">{t.schedule.to}</span>
            <input
              type="time"
              name="end_time"
              defaultValue={data?.end ?? "18:00"}
              required
              className="rounded border border-stone-700 bg-stone-900 px-2 py-1.5 text-stone-100"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm text-stone-400">{t.schedule.reservedBlocks}</p>
            <p className="mb-2 text-xs text-stone-500">{t.schedule.reservedBlocksHint}</p>
            <BlocksEditor name="blocks" initial={data?.blocks ?? []} showLabel />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-stone-400">{t.schedule.dailyCap}</span>
            <input
              type="number"
              name="daily_cap"
              min={1}
              defaultValue={data?.dailyCap ?? ""}
              className="w-20 rounded border border-stone-700 bg-stone-900 px-2 py-1.5 text-stone-100"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-stone-300">
              <input
                type="checkbox"
                name="restrict_services"
                checked={restrict}
                onChange={(e) => setRestrict(e.target.checked)}
                className="accent-amber-400"
              />
              {t.schedule.restrictServices}
            </label>
            {restrict && (
              <div className="mt-2 space-y-1 pl-6">
                {services.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="service_ids"
                      value={s.id}
                      defaultChecked={data?.serviceIds?.includes(s.id) ?? false}
                      className="accent-amber-400"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {state.error && <ErrorText>{t.common.somethingWrong}</ErrorText>}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-stone-950 disabled:opacity-50"
      >
        {pending ? t.common.loading : state.ok ? t.schedule.saved : t.common.save}
      </button>
    </form>
  );
}

export function TemplateEditor({
  days,
  services,
}: {
  days: TemplateDayData[];
  services: ServiceOption[];
}) {
  const byWeekday = new Map(days.map((d) => [d.weekday, d]));
  return (
    <div className="mt-4">
      <PageTitle>{t.schedule.title}</PageTitle>
      <Hint>{t.schedule.templateNote}</Hint>
      <div className="space-y-3">
        {[0, 1, 2, 3, 4, 5, 6].map((weekday) => (
          <DayCard
            key={weekday}
            weekday={weekday}
            data={byWeekday.get(weekday)}
            services={services}
          />
        ))}
      </div>
    </div>
  );
}
