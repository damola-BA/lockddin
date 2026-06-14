"use client";

import { useActionState, useState } from "react";
import {
  previewOverride,
  applyOverride,
  removeOverride,
  type ActionState,
  type PreviewState,
} from "@/lib/schedule/actions";
import { getDictionary, fill } from "@/lib/i18n";
import { PageTitle, Hint, Label, ErrorText } from "@/components/provider/ui";
import { BlocksEditor } from "../schedule/blocks-editor";

const t = getDictionary();

type ExistingOverride = {
  date: string;
  kind: string;
  start: string | null;
  end: string | null;
};

function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const end = new Date(`${to}T00:00:00Z`);
  const cursor = new Date(`${from}T00:00:00Z`);
  while (cursor <= end && out.length < 90) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-BE", {
    timeZone: "Europe/Brussels",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RemoveButton({ date }: { date: string }) {
  const [, formAction, pending] = useActionState<ActionState, FormData>(
    removeOverride,
    {},
  );
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="date" value={date} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs text-red-600 underline disabled:opacity-50"
      >
        {t.schedule.removeOverride}
      </button>
    </form>
  );
}

export function DayOverrides({
  scheduleType,
  existing,
}: {
  scheduleType: string;
  existing: ExistingOverride[];
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState<"closed" | "modified" | "open">("closed");

  const [preview, previewAction, previewPending] = useActionState<
    PreviewState,
    FormData
  >(previewOverride, {});
  const [applied, applyAction, applyPending] = useActionState<
    PreviewState,
    FormData
  >(applyOverride, {});

  const dates = from ? datesBetween(from, to || from) : [];
  const needsHours = kind !== "closed";

  const fields = (
    <>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="dates" value={dates.join(",")} />
    </>
  );

  return (
    <div className="mt-4">
      <PageTitle>{t.schedule.daysTitle}</PageTitle>
      <Hint>{t.schedule.daysHint}</Hint>

      <form action={preview.affected ? applyAction : previewAction} className="space-y-4">
        {fields}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="from">{t.schedule.pickDate}</Label>
            <input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink"
            />
          </div>
          <div>
            <Label htmlFor="to">{t.schedule.pickRangeEnd}</Label>
            <input
              id="to"
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["closed", t.schedule.actionClosed],
              ["modified", t.schedule.actionModified],
              ...(scheduleType === "flexible"
                ? ([["open", t.schedule.actionOpen]] as const)
                : []),
            ] as [typeof kind, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={`rounded-lg px-3 py-2 text-sm ${
                kind === value
                  ? "bg-accent font-semibold text-white"
                  : "border border-line bg-surface text-ink-2"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {needsHours && (
          <div className="flex items-center gap-2 text-sm">
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
        )}

        {needsHours ? (
          <div>
            <p className="mb-2 text-sm text-ink-3">{t.schedule.oneOffBlocks}</p>
            <BlocksEditor name="blocks" initial={[]} showLabel />
          </div>
        ) : (
          <input type="hidden" name="blocks" value="[]" />
        )}

        {(preview.error || applied.error) && (
          <ErrorText>{t.common.somethingWrong}</ErrorText>
        )}

        {preview.affected && applied.applied === undefined && (
          <div className="rounded-lg border border-accent/40 bg-accent-l p-4">
            {preview.affected.length === 0 ? (
              <p className="text-sm text-ink">{t.schedule.noConsequences}</p>
            ) : (
              <>
                <p className="mb-2 text-sm font-medium text-ink">
                  {t.schedule.consequencesTitle}
                </p>
                <ul className="mb-3 space-y-1 text-sm text-ink-2">
                  {preview.affected.map((b) => (
                    <li key={b.booking_id}>
                      {fmt(b.starts_at)} — {b.client_first_name}, {b.service_name}
                    </li>
                  ))}
                </ul>
                <Label htmlFor="cancel_reason">{t.schedule.cancelReason}</Label>
                <input
                  id="cancel_reason"
                  name="cancel_reason"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
                />
              </>
            )}
          </div>
        )}

        {applied.applied !== undefined ? (
          <p className="text-sm text-ok">
            {applied.applied > 0
              ? fill(t.schedule.applied, { n: applied.applied })
              : t.schedule.appliedNone}
          </p>
        ) : (
          <button
            type="submit"
            disabled={previewPending || applyPending || dates.length === 0}
            className="w-full rounded-lg bg-accent px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
          >
            {previewPending || applyPending
              ? t.common.loading
              : preview.affected
                ? preview.affected.length > 0
                  ? fill(t.schedule.confirmApply, { n: preview.affected.length })
                  : t.schedule.applyNoCancel
                : t.schedule.preview}
          </button>
        )}
      </form>

      {existing.length > 0 && (
        <div className="mt-8">
          <p className="mb-2 text-sm font-medium text-ink-2">
            {t.schedule.existingOverrides}
          </p>
          <ul className="space-y-2">
            {existing.map((o) => (
              <li
                key={o.date}
                className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm"
              >
                <span>
                  {o.date} —{" "}
                  {o.kind === "closed"
                    ? t.schedule.actionClosed
                    : `${o.start}–${o.end}`}
                </span>
                {o.kind !== "open" && <RemoveButton date={o.date} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
