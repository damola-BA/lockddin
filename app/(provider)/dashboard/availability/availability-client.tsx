"use client";

import { startTransition, useActionState, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  X,
} from "lucide-react";
import {
  saveUsualWeek,
  saveTemplateDay,
  saveDay,
  removeOverride,
  applyOverride,
  type ActionState,
  type PreviewState,
} from "@/lib/schedule/actions";
import { updateBookingRules, type SettingsState } from "@/lib/dashboard/settings-actions";
import { BlocksEditor, type Block } from "@/app/(provider)/dashboard/schedule/blocks-editor";
import { HoursMode } from "@/components/provider/hours-mode";
import { getDictionary, fill } from "@/lib/i18n";
import type {
  AvailabilityRules,
  UpcomingChange,
  WeekDay,
} from "./page";

const t = getDictionary();
const A = t.availability;
const WEEKDAYS = t.schedule.weekdays; // 0=Mon..6=Sun

type Service = { id: string; name: string };

function prettyDate(date: string, tz: string): string {
  return new Intl.DateTimeFormat("en-BE", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00Z`));
}

// The day the change-a-day sheet targets: either a weekday (tapped in the weekly
// list, offers "every <weekday>" or "just one date") or a fixed date (tapped in
// the calendar provider's open-days list — always "just this date").
type SheetTarget =
  | { weekday: number; day: WeekDay | null }
  | { presetDate: string; start: string | null; end: string | null };

export function AvailabilityClient({
  timezone,
  today,
  week,
  upcoming,
  rules,
  services,
}: {
  timezone: string;
  today: string;
  week: WeekDay[];
  upcoming: UpcomingChange[];
  rules: AvailabilityRules;
  services: Service[];
}) {
  // The mode is decided at onboarding (and changed only in Settings) — there's
  // no toggle here. Each mode gets its own focused dashboard.
  const mode = rules.scheduleType;
  const [sheet, setSheet] = useState<SheetTarget | null>(null);

  const byWeekday = new Map(week.map((d) => [d.weekday, d]));
  const closures = upcoming.filter((c) => c.kind !== "open");
  const openDays = upcoming.filter((c) => c.kind === "open");

  return (
    <>
      <a
        href="/dashboard"
        className="mb-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-3 md:hidden"
      >
        <ChevronLeft size={15} strokeWidth={2.2} /> {A.back}
      </a>
      <h1 className="font-serif text-[26px] font-semibold md:text-[28px]">{t.settings.settingsTitle}</h1>

      {mode === "regular" ? (
        <>
          <UsualWeek week={week} />
          <WeekList
            week={byWeekday}
            timezone={timezone}
            onTap={(weekday) => setSheet({ weekday, day: byWeekday.get(weekday) ?? null })}
          />
          <TimeOff closures={closures} timezone={timezone} today={today} />
        </>
      ) : (
        <>
          <FlexibleMode today={today} timezone={timezone} />
          <YourOpenDays
            openDays={openDays}
            timezone={timezone}
            onEdit={(c) => setSheet({ presetDate: c.date, start: c.start, end: c.end })}
          />
        </>
      )}

      <BookingRules rules={rules} />

      <section className="mt-7">
        <h2 className="font-serif text-[18px] font-semibold">{t.settings.hoursModeTitle}</h2>
        <p className="mb-1 text-[13px] text-ink-3">{t.settings.settingsIntro}</p>
        <HoursMode current={mode} />
      </section>

      {sheet && (
        <ChangeDaySheet
          target={sheet}
          services={services}
          today={today}
          timezone={timezone}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

// ── Your usual week ──────────────────────────────────────────────────

function UsualWeek({ week }: { week: WeekDay[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveUsualWeek, {});
  const initialDays = week.length > 0 ? week.map((d) => d.weekday) : [0, 1, 2, 3, 4];
  const [days, setDays] = useState<Set<number>>(new Set(initialDays));
  const base = week[0];
  const initialBlocks: Block[] = base?.blocks ?? [];

  return (
    <section className="mt-6">
      <h2 className="font-serif text-[18px] font-semibold">{A.usualWeek}</h2>
      <p className="mb-3 text-[13px] text-ink-3">{A.usualWeekHint}</p>
      <form action={action} className="rounded-2xl border border-line bg-surface p-4">
        <p className="mb-2 text-[12.5px] font-semibold text-ink-2">{A.workingDays}</p>
        <div className="flex gap-1.5">
          {WEEKDAYS.map((name, weekday) => {
            const on = days.has(weekday);
            return (
              <button
                key={weekday}
                type="button"
                onClick={() =>
                  setDays((cur) => {
                    const next = new Set(cur);
                    if (on) next.delete(weekday);
                    else next.add(weekday);
                    return next;
                  })
                }
                className={`flex-1 rounded-lg py-2.5 text-center text-[12.5px] font-bold ${
                  on ? "bg-accent text-white" : "bg-surface-2 text-ink-4"
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

        <div className="mt-4 flex items-center gap-2.5">
          <span className="text-[12.5px] text-ink-3">{t.schedule.hours}</span>
          <input
            type="time"
            name="start_time"
            defaultValue={base?.start ?? "09:00"}
            required
            className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm font-bold tabular text-ink"
          />
          <span className="text-[12.5px] text-ink-3">{t.schedule.to}</span>
          <input
            type="time"
            name="end_time"
            defaultValue={base?.end ?? "18:00"}
            required
            className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm font-bold tabular text-ink"
          />
        </div>

        <div className="mt-3.5 border-t border-line-2 pt-3.5">
          <p className="mb-2 text-[12.5px] font-semibold text-ink-2">{A.breaks}</p>
          <BlocksEditor name="blocks" initial={initialBlocks} showLabel />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-ctrl px-5 py-2.5 text-sm font-bold text-ctrl-ink disabled:opacity-50"
          >
            {pending ? t.common.loading : A.saveWeek}
          </button>
          {state.ok && <span className="text-sm text-ok">{A.weekSaved}</span>}
          {state.error && <span className="text-sm text-red-600">{t.common.somethingWrong}</span>}
        </div>
      </form>
    </section>
  );
}

// ── The week as a tappable day list ──────────────────────────────────

function WeekList({
  week,
  onTap,
}: {
  week: Map<number, WeekDay>;
  timezone: string;
  onTap: (weekday: number) => void;
}) {
  return (
    <div className="mt-3.5 overflow-hidden rounded-2xl border border-line bg-surface">
      {WEEKDAYS.map((name, weekday) => {
        const day = week.get(weekday);
        return (
          <button
            key={weekday}
            type="button"
            onClick={() => onTap(weekday)}
            className="flex w-full items-center justify-between border-b border-line-2 px-4 py-3.5 text-left last:border-b-0"
          >
            <span className={`text-[14.5px] font-semibold ${day ? "text-ink" : "text-ink-4"}`}>
              {name}
            </span>
            <span className="inline-flex items-center gap-2">
              {day ? (
                <span className="text-[13.5px] tabular text-ink-2">
                  {day.start}–{day.end}
                </span>
              ) : (
                <span className="text-[13.5px] text-ink-4">{A.closed}</span>
              )}
              <ChevronRight size={15} strokeWidth={2} className="text-faint" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Time off & one-off changes (weekly dashboard) ────────────────────
// Only dates that differ from the usual week: closures + modified-hours days.

function TimeOff({
  closures,
  timezone,
  today,
}: {
  closures: UpcomingChange[];
  timezone: string;
  today: string;
}) {
  const [, removeAction] = useActionState<ActionState, FormData>(removeOverride, {});
  const [closing, setClosing] = useState(false);

  return (
    <section className="mt-7">
      <h2 className="font-serif text-[18px] font-semibold">{A.timeOffChanges}</h2>
      <p className="mb-3 text-[13px] text-ink-3">{A.timeOffHint}</p>
      <div className="flex flex-col gap-2.5">
        {closures.length === 0 && !closing && (
          <p className="text-[13px] text-ink-3">{A.noUpcoming}</p>
        )}
        {closures.map((c) => (
          <div
            key={`${c.date}-${c.kind}`}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3"
          >
            <span
              className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg ${
                c.kind === "closed" ? "bg-accent-l text-accent" : "bg-surface-2 text-ink-3"
              }`}
            >
              {c.kind === "closed" ? <X size={16} strokeWidth={2} /> : <Check size={16} strokeWidth={2} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold tabular">
                {c.kind === "closed"
                  ? A.closedOn
                  : c.start && c.end
                    ? `${c.start}–${c.end}`
                    : A.open}
              </p>
              <p className="text-[12.5px] text-ink-3">
                {prettyDate(c.date, timezone)}
                {c.kind === "modified" || c.kind === "open" ? ` · ${A.justThisDate}` : ""}
              </p>
            </div>
            <form action={removeAction}>
              <input type="hidden" name="date" value={c.date} />
              <button type="submit" className="text-[12.5px] font-semibold text-ink-3 underline">
                {A.remove}
              </button>
            </form>
          </div>
        ))}

        {closing ? (
          <CloseDateForm today={today} onDone={() => setClosing(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setClosing(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-line py-3 text-[13.5px] font-bold text-accent"
          >
            <Plus size={16} strokeWidth={2.2} /> {A.closeDateRange}
          </button>
        )}
      </div>
    </section>
  );
}

// Close a single date or an inclusive range → saveDay (kind=closed) with the
// destructive consequence preview.
function CloseDateForm({ today, onDone }: { today: string; onDone: () => void }) {
  const [state, action, pending] = useActionState<PreviewState, FormData>(saveDay, {});
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState("");

  const dates = buildDateRange(from, to || from);
  const affected = state.affected ?? [];

  if (state.applied !== undefined) {
    return (
      <p className="rounded-xl border border-ok/40 bg-ok-l px-4 py-3 text-sm text-ok">
        {fill(t.schedule.applied, { n: state.applied })}
      </p>
    );
  }

  return (
    <form action={action} className="rounded-xl border border-line bg-surface p-4">
      <input type="hidden" name="kind" value="closed" />
      <input type="hidden" name="dates" value={dates.join(",")} />
      {affected.length > 0 && <input type="hidden" name="confirm" value="true" />}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-ink-3">From</span>
        <input
          type="date"
          value={from}
          min={today}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-line bg-surface-2 px-2.5 py-2 tabular text-ink"
        />
        <span className="text-ink-3">to</span>
        <input
          type="date"
          value={to}
          min={from}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-line bg-surface-2 px-2.5 py-2 tabular text-ink"
        />
      </div>

      {affected.length > 0 && (
        <div className="mt-3 rounded-lg border border-accent/40 bg-accent-l p-3">
          <p className="text-[13px] font-bold text-accent-d">
            {fill(A.cancelsBookings, { n: affected.length })}
          </p>
          <ul className="mt-1.5 space-y-1">
            {affected.map((b) => (
              <li key={b.booking_id} className="text-[12.5px] text-ink-2">
                {b.client_first_name} · {b.service_name}
              </li>
            ))}
          </ul>
          <input
            name="cancel_reason"
            placeholder={A.messageToClients}
            className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          />
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={pending || dates.length === 0}
          className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending
            ? t.common.loading
            : affected.length > 0
              ? fill(A.applyNotify, { n: affected.length })
              : A.closeDateRange}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink-2"
        >
          {t.common.cancel}
        </button>
      </div>
    </form>
  );
}

// ── Booking rules (plain language) ───────────────────────────────────

const LEAD_OPTIONS = [0, 60, 120, 240, 720, 1440, 2880, 10080, 20160];
const BUFFER_OPTIONS = [0, 5, 10, 15, 20, 30, 45, 60];

function leadLabel(minutes: number): string {
  if (minutes === 0) return t.onboarding.minLeadNone;
  if (minutes < 1440) return `${minutes / 60}h`;
  if (minutes < 10080) return `${minutes / 1440} days`;
  return `${minutes / 10080} week${minutes > 10080 ? "s" : ""}`;
}

function BookingRules({ rules }: { rules: AvailabilityRules }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateBookingRules, {});
  // "How far ahead can people book?" is meaningless for a calendar provider —
  // they open the exact dates themselves, so the relative window never applies
  // (DD42). Hide it, but keep submitting the stored value so the save validates.
  const isFlexible = rules.scheduleType === "flexible";

  return (
    <section className="mt-7">
      <h2 className="font-serif text-[18px] font-semibold">{A.bookingRules}</h2>
      <p className="mb-3 text-[13px] text-ink-3">{A.bookingRulesHint}</p>
      <form action={action} className="space-y-4 rounded-2xl border border-line bg-surface p-4">
        {isFlexible ? (
          <input type="hidden" name="booking_window" value={rules.bookingWindow} />
        ) : (
          <Rule label={A.ruleWindow}>
            <select
              name="booking_window"
              defaultValue={rules.bookingWindow}
              className="max-w-[55%] rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-right text-[13px] font-semibold text-accent-d focus:border-accent focus:outline-none"
            >
              {(["3_days", "current_week", "current_month", "3_months"] as const).map((v) => (
                <option key={v} value={v}>
                  {t.onboarding[`bookingWindow_${v}`]}
                </option>
              ))}
            </select>
          </Rule>
        )}
        <Rule label={A.ruleLead}>
          <select
            name="min_lead_time_minutes"
            defaultValue={rules.minLeadTimeMinutes}
            className="max-w-[55%] rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-right text-[13px] font-semibold text-accent-d focus:border-accent focus:outline-none"
          >
            {LEAD_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {leadLabel(m)}
              </option>
            ))}
          </select>
        </Rule>
        <Rule label={A.ruleBuffer}>
          <select
            name="global_buffer_minutes"
            defaultValue={rules.globalBufferMinutes}
            className="max-w-[55%] rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-right text-[13px] font-semibold text-accent-d focus:border-accent focus:outline-none"
          >
            {BUFFER_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m === 0 ? t.onboarding.bufferNone : fill(t.onboarding.minutes, { n: m })}
              </option>
            ))}
          </select>
        </Rule>
        <Rule label={A.ruleCancel}>
          <select
            name="cancellation_window_hours"
            defaultValue={rules.cancellationWindowHours}
            className="max-w-[55%] rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-right text-[13px] font-semibold text-accent-d focus:border-accent focus:outline-none"
          >
            {[12, 24, 48, 72].map((h) => (
              <option key={h} value={h}>
                {fill(t.onboarding.hoursBefore, { hours: h })}
              </option>
            ))}
            <option value={168}>{t.onboarding.oneWeekBefore}</option>
          </select>
        </Rule>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-ctrl px-5 py-2.5 text-sm font-bold text-ctrl-ink disabled:opacity-50"
          >
            {pending ? t.common.loading : t.common.save}
          </button>
          {state.ok && <span className="text-sm text-ok">{A.rulesSaved}</span>}
          {state.error && <span className="text-sm text-red-600">{t.common.somethingWrong}</span>}
        </div>
      </form>
    </section>
  );
}

function Rule({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[13.5px] font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

// ── Change-a-day bottom sheet ────────────────────────────────────────

function ChangeDaySheet({
  target,
  services,
  today,
  timezone,
  onClose,
}: {
  target: SheetTarget;
  services: Service[];
  today: string;
  timezone: string;
  onClose: () => void;
}) {
  // Two entry points: a weekday tapped in the weekly list (offers every/once),
  // or a fixed date from the calendar provider's open-days list (always once).
  const isPreset = "presetDate" in target;
  const weekday = isPreset ? null : target.weekday;
  const day = isPreset ? null : target.day;
  const headingDay = isPreset ? prettyDate(target.presetDate, timezone) : WEEKDAYS[target.weekday];
  const defaultStart = isPreset ? target.start ?? "09:00" : day?.start ?? "09:00";
  const defaultEnd = isPreset ? target.end ?? "18:00" : day?.end ?? "18:00";

  const [scopeState, setScope] = useState<"every" | "once">("every");
  const scope = isPreset ? "once" : scopeState;
  const [open, setOpen] = useState(isPreset ? true : day !== null);
  const [dateState, setDate] = useState(today);
  const date = isPreset ? target.presetDate : dateState;
  const [cap, setCap] = useState<number | null>(day?.dailyCap ?? null);
  const [restrict, setRestrict] = useState<boolean>(Boolean(day?.serviceIds));
  const [picked, setPicked] = useState<Set<string>>(new Set(day?.serviceIds ?? []));

  // "Just one date" closures/changes go through saveDay (consequence preview);
  // "Every <weekday>" writes the template (saveTemplateDay, never cancels).
  const [dayState, dayAction, dayPending] = useActionState<PreviewState, FormData>(saveDay, {});
  const [tplState, tplAction, tplPending] = useActionState<ActionState, FormData>(saveTemplateDay, {});

  const affected = dayState.affected ?? [];
  const done = tplState.ok || dayState.applied !== undefined;
  if (done) {
    // Close once the write lands (revalidation refreshes the page beneath).
    setTimeout(onClose, 350);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-[rgba(34,29,25,.34)] md:flex-row md:justify-end"
      onClick={onClose}
    >
      <div
        className="max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-canvas px-5 pb-9 pt-2.5 shadow-[0_-18px_40px_-20px_rgba(34,29,25,.4)] md:h-dvh md:max-h-none md:w-[380px] md:rounded-none md:rounded-l-3xl md:px-6 md:pb-8 md:pt-6 md:shadow-[-18px_0_40px_-20px_rgba(34,29,25,.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-desk md:hidden" />

        {affected.length > 0 ? (
          <DestructiveConfirm
            affected={affected}
            pending={dayPending}
            action={dayAction}
            buildFields={() => buildOnceFields({ open, date, cap, restrict, picked, confirm: true })}
            onCancel={onClose}
          />
        ) : (
          <>
            <h2 className="font-serif text-[21px] font-semibold">
              {fill(A.changeDay, { day: headingDay })}
            </h2>
            {!isPreset && <p className="mt-1.5 text-[13.5px] text-ink-3">{A.applyTo}</p>}

            {!isPreset && (
              <div className="mt-4 flex flex-col gap-2.5">
                <ScopeOption
                  active={scope === "every"}
                  title={fill(A.everyWeekday, { day: headingDay })}
                  hint={A.everyWeekdayHint}
                  onClick={() => setScope("every")}
                />
                <ScopeOption
                  active={scope === "once"}
                  title={A.justOneDate}
                  hint={fill(A.justOneDateHint, { day: headingDay })}
                  onClick={() => setScope("once")}
                />
              </div>
            )}

            {!isPreset && scope === "once" && (
              <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                <span className="text-[13.5px] font-semibold">{A.pickDate}</span>
                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 tabular text-ink"
                />
              </label>
            )}

            <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
              {/* Open / Closed */}
              <div className="mb-3.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className={`flex-1 rounded-xl py-2.5 text-center text-sm font-bold ${
                    open ? "bg-ctrl text-ctrl-ink" : "border border-line text-ink-2"
                  }`}
                >
                  {A.openClosed}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={`flex-1 rounded-xl py-2.5 text-center text-sm font-bold ${
                    !open ? "bg-ctrl text-ctrl-ink" : "border border-line text-ink-2"
                  }`}
                >
                  {A.closed}
                </button>
              </div>

              {open && (
                <SheetOpenFields
                  defaultStart={defaultStart}
                  defaultEnd={defaultEnd}
                  defaultBlocks={day?.blocks ?? []}
                  services={services}
                  cap={cap}
                  setCap={setCap}
                  restrict={restrict}
                  setRestrict={setRestrict}
                  picked={picked}
                  setPicked={setPicked}
                />
              )}
            </div>

            {(tplState.error || dayState.error) && (
              <p className="mt-3 text-sm text-red-600">{t.common.somethingWrong}</p>
            )}

            <SheetSaveButton
              scope={scope}
              pending={tplPending || dayPending}
              onEvery={() => {
                if (weekday === null) return; // never reached: preset is always "once"
                const fd = buildEveryFields({ weekday, open, cap, restrict, picked });
                startTransition(() => tplAction(fd));
              }}
              onOnce={() => {
                const fd = buildOnceFields({ open, date, cap, restrict, picked, confirm: false });
                startTransition(() => dayAction(fd));
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function ScopeOption({
  active,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-2xl bg-surface p-4 text-left ${
        active ? "border-[1.5px] border-accent [box-shadow:0_0_0_3px_var(--accent-l)]" : "border border-line"
      }`}
    >
      <span
        className={`mt-0.5 flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full ${
          active ? "bg-accent text-white" : "border-[1.5px] border-desk"
        }`}
      >
        {active && <Check size={12} strokeWidth={3} />}
      </span>
      <span>
        <span className="block text-[15px] font-bold">{title}</span>
        <span className="mt-0.5 block text-[12.5px] text-ink-3">{hint}</span>
      </span>
    </button>
  );
}

function SheetOpenFields({
  defaultStart,
  defaultEnd,
  defaultBlocks,
  services,
  cap,
  setCap,
  restrict,
  setRestrict,
  picked,
  setPicked,
}: {
  defaultStart: string;
  defaultEnd: string;
  defaultBlocks: Block[];
  services: Service[];
  cap: number | null;
  setCap: (n: number | null) => void;
  restrict: boolean;
  setRestrict: (b: boolean) => void;
  picked: Set<string>;
  setPicked: (s: Set<string>) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2.5">
        <span className="text-[12.5px] text-ink-3">{t.schedule.hours}</span>
        <input
          type="time"
          name="sheet_start"
          defaultValue={defaultStart}
          className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm font-bold tabular text-ink"
        />
        <span className="text-[12.5px] text-ink-3">{t.schedule.to}</span>
        <input
          type="time"
          name="sheet_end"
          defaultValue={defaultEnd}
          className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm font-bold tabular text-ink"
        />
      </div>

      {/* breaks */}
      <div className="mt-3.5 border-t border-line-2 pt-3.5">
        <p className="mb-2 text-[12.5px] font-semibold text-ink-2">{A.breaks}</p>
        <BlocksEditor name="sheet_blocks" initial={defaultBlocks} showLabel />
      </div>

      {/* daily cap stepper */}
      <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-line-2 pt-3.5">
        <div>
          <p className="text-[13.5px] font-semibold">{A.mostBookings}</p>
          <p className="text-[12px] text-ink-3">{A.mostBookingsHint}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => setCap(cap === null ? null : Math.max(0, cap - 1) || null)}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-line bg-surface-2"
          >
            <Minus size={15} />
          </button>
          <span className="min-w-[28px] text-center text-[15px] font-bold tabular">
            {cap ?? A.noLimit}
          </span>
          <button
            type="button"
            onClick={() => setCap((cap ?? 0) + 1)}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-line bg-surface-2"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      {/* restrict services */}
      <div className="mt-3.5 border-t border-line-2 pt-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13.5px] font-semibold">{A.onlySomeServices}</p>
            <p className="text-[12px] text-ink-3">{A.onlySomeServicesHint}</p>
          </div>
          <button
            type="button"
            onClick={() => setRestrict(!restrict)}
            className={`relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors ${
              restrict ? "bg-accent" : "bg-desk"
            }`}
          >
            <span
              className={`absolute top-[3px] h-5 w-5 rounded-full bg-white transition-all ${
                restrict ? "right-[3px]" : "left-[3px]"
              }`}
            />
          </button>
        </div>
        {restrict && (
          <div className="mt-3 flex flex-wrap gap-2">
            {services.map((s) => {
              const on = picked.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    const next = new Set(picked);
                    if (on) next.delete(s.id);
                    else next.add(s.id);
                    setPicked(next);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold ${
                    on
                      ? "border border-accent/40 bg-accent-l text-accent-d"
                      : "border border-line bg-surface-2 text-ink-4"
                  }`}
                >
                  {on && <Check size={11} strokeWidth={3} />}
                  {s.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function SheetSaveButton({
  scope,
  pending,
  onEvery,
  onOnce,
}: {
  scope: "every" | "once";
  pending: boolean;
  onEvery: () => void;
  onOnce: () => void;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => (scope === "every" ? onEvery() : onOnce())}
      className="mt-4 w-full rounded-2xl bg-ctrl py-4 text-[15.5px] font-bold text-ctrl-ink shadow-[var(--shadow)] disabled:opacity-50"
    >
      {pending ? t.common.loading : t.common.save}
    </button>
  );
}

function DestructiveConfirm({
  affected,
  pending,
  action,
  buildFields,
  onCancel,
}: {
  affected: NonNullable<PreviewState["affected"]>;
  pending: boolean;
  action: (fd: FormData) => void;
  buildFields: () => FormData;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div>
      <span className="inline-flex items-center gap-2 rounded-full bg-accent-l px-3 py-1.5">
        <AlertTriangle size={15} strokeWidth={2} className="text-accent" />
        <span className="text-[12.5px] font-bold text-accent-d">{A.headsUp}</span>
      </span>
      <h2 className="mt-3.5 font-serif text-[21px] font-semibold leading-tight">
        {fill(A.cancelsBookings, { n: affected.length })}
      </h2>
      <p className="mt-2 text-[13.5px] text-ink-2">{A.cancelsBookingsBody}</p>

      <div className="mt-3.5 overflow-hidden rounded-2xl border border-line bg-surface">
        {affected.map((b) => (
          <div
            key={b.booking_id}
            className="flex items-center justify-between border-b border-line-2 px-4 py-3 last:border-b-0"
          >
            <div>
              <p className="text-[14px] font-semibold">{b.client_first_name}</p>
              <p className="text-[12.5px] text-ink-3">{b.service_name}</p>
            </div>
            <span className="text-[13px] font-bold tabular text-ink-2">
              {new Intl.DateTimeFormat("en-BE", {
                timeZone: "Europe/Brussels",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(b.starts_at))}
            </span>
          </div>
        ))}
      </div>

      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={A.messageToClients}
        className="mt-3.5 w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink"
      />

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const fd = buildFields();
          fd.set("cancel_reason", reason);
          startTransition(() => action(fd));
        }}
        className="mt-3.5 w-full rounded-2xl bg-accent py-4 text-[15px] font-bold text-white disabled:opacity-50"
      >
        {pending ? t.common.loading : fill(A.applyNotify, { n: affected.length })}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="mt-2.5 w-full rounded-2xl border border-line bg-surface py-3.5 text-[14.5px] font-semibold text-ink-2"
      >
        {A.keepOpen}
      </button>
    </div>
  );
}

// ── Flexible mode ────────────────────────────────────────────────────

function FlexibleMode({ today, timezone }: { today: string; timezone: string }) {
  const [state, action, pending] = useActionState<PreviewState, FormData>(applyOverride, {});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [monthAnchor, setMonthAnchor] = useState(today);

  const dates = [...selected].sort();

  return (
    <section className="mt-6">
      <h2 className="font-serif text-[18px] font-semibold">{A.openYourDays}</h2>
      <p className="mb-3 text-[13px] text-ink-3">{A.openYourDaysHint}</p>

      <MiniCalendar
        anchor={monthAnchor}
        today={today}
        timezone={timezone}
        selected={selected}
        onToggle={(d) =>
          setSelected((cur) => {
            const next = new Set(cur);
            if (next.has(d)) next.delete(d);
            else next.add(d);
            return next;
          })
        }
        onMonth={setMonthAnchor}
      />

      <form action={action} className="mt-3.5">
        <input type="hidden" name="kind" value="open" />
        <input type="hidden" name="dates" value={dates.join(",")} />
        <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3">
          <span className="text-[12.5px] text-ink-3">{A.hoursForSelected}</span>
          <input type="time" name="start_time" defaultValue="09:00" className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-sm font-bold tabular text-ink" />
          <span className="text-ink-3">–</span>
          <input type="time" name="end_time" defaultValue="17:00" className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-sm font-bold tabular text-ink" />
        </div>
        <button
          type="submit"
          disabled={pending || dates.length === 0}
          className="mt-3.5 w-full rounded-2xl bg-accent py-3.5 text-[15px] font-bold text-white disabled:opacity-50"
        >
          {pending ? t.common.loading : fill(A.openNDates, { n: dates.length })}
        </button>
        {state.applied !== undefined && (
          <p className="mt-2 text-center text-sm text-ok">{t.schedule.appliedNone}</p>
        )}
      </form>
      <p className="mt-3 text-center text-[12.5px] text-ink-4">{A.sameRules}</p>
    </section>
  );
}

// The calendar provider's list of upcoming opened dates. Tapping one opens the
// change-a-day sheet pinned to that date (edit hours, or set it Closed to drop it).
function YourOpenDays({
  openDays,
  timezone,
  onEdit,
}: {
  openDays: UpcomingChange[];
  timezone: string;
  onEdit: (c: UpcomingChange) => void;
}) {
  return (
    <section className="mt-7">
      <h2 className="font-serif text-[18px] font-semibold">{A.yourOpenDays}</h2>
      <p className="mb-3 text-[13px] text-ink-3">{A.yourOpenDaysHint}</p>
      {openDays.length === 0 ? (
        <p className="text-[13px] text-ink-3">{A.noOpenDays}</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          {openDays.map((c) => (
            <button
              key={c.date}
              type="button"
              onClick={() => onEdit(c)}
              className="flex w-full items-center justify-between border-b border-line-2 px-4 py-3.5 text-left last:border-b-0"
            >
              <span>
                <span className="block text-[14px] font-semibold">{prettyDate(c.date, timezone)}</span>
                {c.start && c.end && (
                  <span className="text-[12.5px] tabular text-ink-3">{c.start}–{c.end}</span>
                )}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent">
                {A.editDay}
                <ChevronRight size={14} strokeWidth={2} className="text-faint" />
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function MiniCalendar({
  anchor,
  today,
  timezone,
  selected,
  onToggle,
  onMonth,
}: {
  anchor: string;
  today: string;
  timezone: string;
  selected: Set<string>;
  onToggle: (date: string) => void;
  onMonth: (anchor: string) => void;
}) {
  const [y, m] = anchor.split("-").map(Number);
  const year = y;
  const month = m - 1;
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  const prevMonth = month === 0 ? `${year - 1}-12-01` : `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 11 ? `${year + 1}-01-01` : `${year}-${String(month + 2).padStart(2, "0")}-01`;
  const monthLabel = new Intl.DateTimeFormat("en-BE", {
    timeZone: timezone,
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month, 15)));

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => onMonth(prevMonth)} className="text-ink-3">
          <ChevronLeft size={16} strokeWidth={2.2} />
        </button>
        <span className="font-serif text-[15px] font-medium">{monthLabel}</span>
        <button type="button" onClick={() => onMonth(nextMonth)} className="text-ink-3">
          <ChevronRight size={16} strokeWidth={2.2} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-[10px] font-semibold text-faint">{d}</span>
        ))}
        {cells.map((cell, i) =>
          cell === null ? (
            <span key={`e${i}`} />
          ) : (
            <button
              key={cell}
              type="button"
              disabled={cell < today}
              onClick={() => onToggle(cell)}
              className={`flex aspect-square items-center justify-center rounded-[10px] text-[12px] font-semibold tabular ${
                selected.has(cell)
                  ? "bg-accent text-white"
                  : cell < today
                    ? "text-faint"
                    : "text-ink-2 hover:bg-surface-2"
              }`}
            >
              {Number(cell.slice(-2))}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

// ── form-field builders (shared by sheet + confirm) ──────────────────

function readSheetInputs() {
  const start = (document.querySelector('input[name="sheet_start"]') as HTMLInputElement)?.value || "09:00";
  const end = (document.querySelector('input[name="sheet_end"]') as HTMLInputElement)?.value || "18:00";
  const blocks = (document.querySelector('input[name="sheet_blocks"]') as HTMLInputElement)?.value || "[]";
  return { start, end, blocks };
}

function buildEveryFields({
  weekday,
  open,
  cap,
  restrict,
  picked,
}: {
  weekday: number;
  open: boolean;
  cap: number | null;
  restrict: boolean;
  picked: Set<string>;
}): FormData {
  const fd = new FormData();
  fd.set("weekday", String(weekday));
  if (!open) return fd; // working off → deletes the template day
  const { start, end, blocks } = readSheetInputs();
  fd.set("working", "on");
  fd.set("start_time", start);
  fd.set("end_time", end);
  fd.set("blocks", blocks);
  if (cap !== null) fd.set("daily_cap", String(cap));
  if (restrict && picked.size > 0) {
    fd.set("restrict_services", "on");
    picked.forEach((id) => fd.append("service_ids", id));
  }
  return fd;
}

function buildOnceFields({
  open,
  date,
  cap,
  restrict,
  picked,
  confirm,
}: {
  open: boolean;
  date: string;
  cap: number | null;
  restrict: boolean;
  picked: Set<string>;
  confirm: boolean;
}): FormData {
  const fd = new FormData();
  fd.set("dates", date);
  fd.set("kind", open ? "modified" : "closed");
  if (confirm) fd.set("confirm", "true");
  if (open) {
    const { start, end, blocks } = readSheetInputs();
    fd.set("start_time", start);
    fd.set("end_time", end);
    fd.set("blocks", blocks);
    if (cap !== null) fd.set("daily_cap", String(cap));
    if (restrict && picked.size > 0) {
      fd.set("restrict_services", "on");
      picked.forEach((id) => fd.append("service_ids", id));
    }
  }
  return fd;
}

// inclusive date range (YYYY-MM-DD) → array of dates
function buildDateRange(from: string, to: string): string[] {
  if (!from) return [];
  const out: string[] = [];
  const start = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return from ? [from] : [];
  }
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
