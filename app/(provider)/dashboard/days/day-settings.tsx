"use client";

import { useActionState, useState } from "react";
import {
  saveDay,
  removeOverride,
  type PreviewState,
  type ActionState,
} from "@/lib/schedule/actions";
import { getDictionary, fill } from "@/lib/i18n";
import { ErrorText } from "@/components/provider/ui";
import { BlocksEditor, type Block } from "../schedule/blocks-editor";
import type { DayManager } from "@/lib/dashboard/queries";

const t = getDictionary();

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("en-BE", {
    timeZone: "Europe/Brussels",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function DaySettings({
  date,
  data,
  scheduleType,
}: {
  date: string;
  data: DayManager;
  scheduleType: "regular" | "flexible";
}) {
  const startDefault = data.override?.start ?? data.template?.start ?? "09:00";
  const endDefault = data.override?.end ?? data.template?.end ?? "18:00";
  const [closed, setClosed] = useState(data.override?.kind === "closed");
  const [restrict, setRestrict] = useState(Boolean(data.override?.serviceIds));

  const [state, action, pending] = useActionState<PreviewState, FormData>(
    saveDay,
    {},
  );
  const [, removeAction, removePending] = useActionState<ActionState, FormData>(
    removeOverride,
    {},
  );
  const needsConfirm = Boolean(state.affected && state.affected.length > 0);

  // open => 'modified' for a regular week (carries hours), 'open' for flexible.
  const openKind = scheduleType === "flexible" ? "open" : "modified";
  const kind = closed ? "closed" : openKind;

  const initialBlocks: Block[] = (data.override?.extraBlocks ?? []).map((b) => ({
    start: b.start,
    end: b.end,
    label: b.label ?? "",
  }));

  // After a successful save, show the result.
  if (state.applied !== undefined) {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm text-emerald-300">
        {state.applied > 0 ? fill(t.schedule.applied, { n: state.applied }) : t.dashboard.daySaved}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="dates" value={date} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="confirm" value={needsConfirm ? "true" : "false"} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setClosed(false)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm ${
            !closed ? "bg-amber-400 font-semibold text-stone-950" : "border border-stone-700 text-stone-300"
          }`}
        >
          {t.dashboard.dayOpen}
        </button>
        <button
          type="button"
          onClick={() => setClosed(true)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm ${
            closed ? "bg-red-500 font-semibold text-white" : "border border-stone-700 text-stone-300"
          }`}
        >
          {t.dashboard.dayClosedToggle}
        </button>
      </div>

      {!closed && (
        <>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-stone-400">{t.schedule.from}</span>
            <input
              type="time"
              name="start_time"
              defaultValue={startDefault}
              required
              className="rounded border border-stone-700 bg-stone-900 px-2 py-1.5 text-stone-100"
            />
            <span className="text-stone-400">{t.schedule.to}</span>
            <input
              type="time"
              name="end_time"
              defaultValue={endDefault}
              required
              className="rounded border border-stone-700 bg-stone-900 px-2 py-1.5 text-stone-100"
            />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-stone-400">{t.dashboard.dayCapLabel}</span>
            <input
              type="number"
              name="daily_cap"
              min={1}
              defaultValue={data.override?.dailyCap ?? ""}
              placeholder={t.dashboard.dayCapNone}
              className="w-24 rounded border border-stone-700 bg-stone-900 px-2 py-1.5 text-stone-100"
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
              {t.dashboard.dayServiceLimit}
            </label>
            {restrict && (
              <div className="mt-2 space-y-1 pl-6">
                {data.services.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="service_ids"
                      value={s.id}
                      defaultChecked={data.override?.serviceIds?.includes(s.id) ?? false}
                      className="accent-amber-400"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm text-stone-400">{t.dashboard.dayBlocks}</p>
            {data.reservedBlocks.length > 0 && (
              <p className="mb-2 text-xs text-stone-600">
                {data.reservedBlocks.map((b) => `${b.start}–${b.end} ${b.label}`).join(", ")}{" "}
                (weekly)
              </p>
            )}
            <BlocksEditor name="blocks" initial={initialBlocks} showLabel />
          </div>
        </>
      )}
      {closed && <input type="hidden" name="blocks" value="[]" />}

      {state.error && <ErrorText>{t.common.somethingWrong}</ErrorText>}

      {needsConfirm && (
        <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3">
          <p className="mb-2 text-sm font-medium text-stone-100">
            {t.schedule.consequencesTitle}
          </p>
          <ul className="mb-3 space-y-1 text-sm text-stone-300">
            {state.affected!.map((b) => (
              <li key={b.booking_id}>
                {fmtTime(b.starts_at)} — {b.client_first_name}, {b.service_name}
              </li>
            ))}
          </ul>
          <label className="text-xs text-stone-400">{t.schedule.cancelReason}</label>
          <input
            name="cancel_reason"
            className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-amber-400 px-4 py-3 font-semibold text-stone-950 disabled:opacity-50"
      >
        {pending
          ? t.common.loading
          : needsConfirm
            ? fill(t.schedule.confirmApply, { n: state.affected!.length })
            : t.common.save}
      </button>

      {data.override && (
        <button
          type="button"
          onClick={() => {
            const fd = new FormData();
            fd.set("date", date);
            removeAction(fd);
          }}
          disabled={removePending}
          className="w-full text-center text-xs text-stone-500 underline disabled:opacity-50"
        >
          {t.schedule.removeOverride}
        </button>
      )}
    </form>
  );
}
