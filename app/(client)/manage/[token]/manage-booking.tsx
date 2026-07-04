"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import {
  cancelViaToken,
  rescheduleViaToken,
  type ManageActionState,
} from "@/lib/booking/manage";
import { placeHold, type HoldState } from "@/lib/booking/actions";
import { localDateOf } from "@/app/(client)/b/[slug]/booking-flow";
import { getDictionary, fill } from "@/lib/i18n";

const t = getDictionary();
const TZ = "Europe/Brussels";

function slotLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-BE", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function slotTimeOnly(iso: string): string {
  return new Intl.DateTimeFormat("en-BE", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
}
function mondayOf(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return ymd(d);
}
function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}
function monthTitle(date: string): string {
  return new Intl.DateTimeFormat("en-BE", {
    timeZone: TZ,
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}
const WD_HEADS = ["M", "T", "W", "T", "F", "S", "S"];

type PublicSlot = { startsAt: string; endsAt: string };

export function ManageBooking({
  token,
  slug,
  businessName,
  providerEmail,
  clientFirstName,
  serviceIds,
  serviceName,
  startsAt,
  whenText,
  cancellationWindowHours,
}: {
  token: string;
  slug: string;
  businessName: string;
  providerEmail: string;
  clientFirstName: string;
  serviceIds: string[];
  serviceName: string;
  startsAt: string;
  whenText: string;
  cancellationWindowHours: number;
}) {
  const serviceCsv = serviceIds.join(",");
  const [mode, setMode] = useState<"view" | "confirm-cancel" | "reschedule">("view");
  const [cancelState, cancelAction, cancelPending] = useActionState<
    ManageActionState,
    FormData
  >(cancelViaToken, {});
  const [reState, reAction, rePending] = useActionState<
    ManageActionState,
    FormData
  >(rescheduleViaToken, {});
  const [slots, setSlots] = useState<PublicSlot[] | null>(null);
  const [bookableDays, setBookableDays] = useState<string[]>([]);
  // null = the "Soonest" view (earliest slots across days); a date = that day.
  const [dayDate, setDayDate] = useState<string | null>(null);
  const [daySlots, setDaySlots] = useState<PublicSlot[] | null>(null);
  // Which picker is showing, and the week/month it's anchored on.
  const [view, setView] = useState<"soonest" | "week" | "month">("soonest");
  const [anchor, setAnchor] = useState<string>("");
  const [hold, holdAction] = useActionState<HoldState, FormData>(placeHold, {});
  const pickedRef = useRef<PublicSlot | null>(null);

  const today = localDateOf(new Date().toISOString());
  const bookableSet = new Set(bookableDays);
  const lastBookable = bookableDays.length ? bookableDays[bookableDays.length - 1] : today;

  function openView(next: "soonest" | "week" | "month") {
    setView(next);
    setDayDate(null);
    setDaySlots(null);
    if (next !== "soonest" && !anchor) setAnchor(today);
  }
  function pickDay(date: string) {
    setDayDate(date);
    void loadDay(date);
  }

  const loadSlots = useCallback(async () => {
    setSlots(null);
    const res = await fetch(`/api/b/${slug}/slots?service=${serviceCsv}`, {
      cache: "no-store",
    });
    const body = await res.json();
    setSlots(body.slots ?? []);
    setBookableDays(body.bookableDays ?? []);
  }, [slug, serviceCsv]);

  const loadDay = useCallback(
    async (date: string) => {
      setDaySlots(null);
      const res = await fetch(
        `/api/b/${slug}/slots?service=${serviceCsv}&date=${date}`,
        { cache: "no-store" },
      );
      const body = await res.json();
      setDaySlots(body.slots ?? []);
    },
    [slug, serviceCsv],
  );

  useEffect(() => {
    if (mode === "reschedule" && slots === null) void loadSlots();
  }, [mode, slots, loadSlots]);

  // After a hold is placed, immediately attempt the reschedule swap.
  useEffect(() => {
    if (hold.ok && pickedRef.current) {
      const fd = new FormData();
      fd.set("token", token);
      fd.set("hold_id", hold.holdId);
      reAction(fd);
      pickedRef.current = null;
    }
    // Hold couldn't be placed (someone took it) — refresh the view being shown.
    if (hold.ok === false) {
      if (dayDate) void loadDay(dayDate);
      else void loadSlots();
    }
  }, [hold, token, reAction, loadSlots, loadDay, dayDate]);

  const visibleSlots = view === "soonest" ? slots : dayDate ? daySlots : null;

  const late =
    (cancelState.ok === false && cancelState.reason === "late") ||
    (reState.ok === false && reState.reason === "late");

  if (cancelState.ok) {
    return (
      <div>
        <p className="mb-4 font-serif text-xl text-ink">{t.client.cancelled}</p>
        <a
          href={`/b/${slug}`}
          className="block w-full rounded-xl bg-ink px-4 py-3 text-center font-semibold text-canvas"
        >
          {t.client.bookAgain}
        </a>
      </div>
    );
  }
  if (reState.ok) {
    return (
      <div>
        <p className="mb-2 font-serif text-xl text-ink">{t.client.rescheduled}</p>
        <p className="font-mono text-ink-2">{reState.whenText}</p>
        <p className="mt-3 text-sm text-ink-3">
          {fill(t.client.confirmationSent, { email: "your inbox" })}
        </p>
        <a href={`/b/${slug}`} className="mt-4 inline-block text-sm text-ink-3 underline">
          ← {businessName}
        </a>
      </div>
    );
  }

  if (late) {
    return (
      <div>
        <h1 className="mb-2 font-serif text-xl text-ink">{t.client.lateTitle}</h1>
        <p className="mb-3 text-sm text-ink-3">
          {fill(t.client.lateBody, { name: businessName, hours: cancellationWindowHours })}
        </p>
        <a
          href={`mailto:${providerEmail}`}
          className="font-mono text-sm text-ink underline"
        >
          {providerEmail}
        </a>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-ink-3">Hi {clientFirstName},</p>
      <h1 className="mb-1 font-serif text-2xl text-ink">{serviceName}</h1>
      <p className="mb-1 font-mono text-ink-2">{whenText}</p>
      <p className="mb-6 text-sm text-ink-3">{businessName}</p>

      {(cancelState.ok === false || reState.ok === false) && !late && (
        <p className="mb-3 rounded-lg border border-accent/60 bg-accent-l p-3 text-sm text-ink-2">
          {reState.ok === false &&
          (reState.reason === "taken" || reState.reason === "released")
            ? t.client.justTaken
            : t.common.somethingWrong}
        </p>
      )}

      {mode === "view" && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setMode("reschedule")}
            className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-canvas"
          >
            {t.client.rescheduleTitle}
          </button>
          <button
            type="button"
            onClick={() => setMode("confirm-cancel")}
            className="w-full rounded-xl border border-ink px-4 py-3 font-semibold text-ink"
          >
            {t.client.cancelTitle}
          </button>
          <p className="text-xs text-ink-3">{t.client.serviceChangeNote}</p>
        </div>
      )}

      {mode === "confirm-cancel" && (
        <form action={cancelAction} className="space-y-3">
          <input type="hidden" name="token" value={token} />
          <p className="text-sm text-ink-2">{t.client.cancelTitle}</p>
          <button
            type="submit"
            disabled={cancelPending}
            className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-canvas disabled:opacity-50"
          >
            {cancelPending ? t.common.loading : t.client.cancelConfirm}
          </button>
          <button
            type="button"
            onClick={() => setMode("view")}
            className="w-full rounded-xl border border-line px-4 py-3 text-ink-2"
          >
            {t.common.back}
          </button>
        </form>
      )}

      {mode === "reschedule" && (
        <div>
          <h2 className="mb-3 font-serif text-lg text-ink">
            {t.client.rescheduleTitle}
          </h2>

          {/* Soonest · Week · Month — browse the calendar, not just the earliest. */}
          <div className="mb-3 inline-flex rounded-xl bg-surface-2 p-1">
            {(["soonest", "week", "month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => openView(v)}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold ${
                  view === v ? "bg-ctrl text-ctrl-ink shadow-sm" : "text-ink-3"
                }`}
              >
                {v === "soonest" ? t.client.soonest : v === "week" ? t.client.weekView : t.client.monthView}
              </button>
            ))}
          </div>

          {view === "week" && (
            <WeekPicker
              anchor={anchor || today}
              today={today}
              lastBookable={lastBookable}
              bookable={bookableSet}
              selected={dayDate}
              onAnchor={setAnchor}
              onPick={pickDay}
            />
          )}
          {view === "month" && (
            <MonthPicker
              anchor={anchor || today}
              today={today}
              lastBookable={lastBookable}
              bookable={bookableSet}
              selected={dayDate}
              onAnchor={setAnchor}
              onPick={pickDay}
            />
          )}

          {view !== "soonest" && !dayDate ? (
            <p className="mt-3 text-sm text-ink-3">{t.client.pickADay}</p>
          ) : visibleSlots === null ? (
            <p className="mt-3 text-sm text-ink-4">{t.common.loading}</p>
          ) : visibleSlots.filter((s) => s.startsAt !== startsAt).length === 0 ? (
            <p className="mt-3 text-sm text-ink-3">
              {view === "soonest" ? t.client.noSlotsAtAll : t.client.noSlotsDay}
            </p>
          ) : (
            <div className={`mt-3 ${view === "soonest" ? "space-y-2" : "grid grid-cols-3 gap-2"}`}>
              {visibleSlots
                .filter((s) => s.startsAt !== startsAt)
                .map((slot) => (
                  <button
                    key={slot.startsAt}
                    type="button"
                    disabled={rePending}
                    onClick={() => {
                      pickedRef.current = slot;
                      const fd = new FormData();
                      fd.set("slug", slug);
                      fd.set("service_ids", serviceCsv);
                      fd.set("starts_at", slot.startsAt);
                      fd.set("date", localDateOf(slot.startsAt));
                      holdAction(fd);
                    }}
                    className={`rounded-xl border border-line bg-surface px-4 py-3 font-mono text-sm text-ink shadow-sm disabled:opacity-50 ${
                      view === "soonest" ? "w-full text-left" : "text-center"
                    }`}
                  >
                    {view === "soonest" ? slotLabel(slot.startsAt) : slotTimeOnly(slot.startsAt)}
                  </button>
                ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setMode("view")}
            className="mt-4 text-sm text-ink-3 underline"
          >
            {t.client.keepOriginal}
          </button>
        </div>
      )}
    </div>
  );
}

type PickerProps = {
  anchor: string;
  today: string;
  lastBookable: string;
  bookable: Set<string>;
  selected: string | null;
  onAnchor: (date: string) => void;
  onPick: (date: string) => void;
};

function NavBtn({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={dir === "prev" ? "Previous" : "Next"}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-3 disabled:opacity-30"
    >
      {dir === "prev" ? "‹" : "›"}
    </button>
  );
}

function DayCell({
  date,
  today,
  bookable,
  selected,
  onPick,
}: {
  date: string;
  today: string;
  bookable: Set<string>;
  selected: string | null;
  onPick: (date: string) => void;
}) {
  const d = new Date(`${date}T12:00:00Z`);
  const num = new Intl.DateTimeFormat("en-BE", { timeZone: TZ, day: "numeric" }).format(d);
  const isOpen = bookable.has(date) && date >= today;
  const active = selected === date;
  return (
    <button
      type="button"
      disabled={!isOpen}
      onClick={() => onPick(date)}
      className={`flex aspect-square items-center justify-center rounded-xl text-[14px] font-semibold tabular ${
        active
          ? "bg-accent text-white"
          : isOpen
            ? "border border-line bg-surface text-ink hover:border-accent"
            : "text-ink-4/50"
      }`}
    >
      {num}
    </button>
  );
}

function WeekPicker({ anchor, today, lastBookable, bookable, selected, onAnchor, onPick }: PickerProps) {
  const start = mondayOf(anchor);
  const end = addDays(start, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const fmt = (dt: string) =>
    new Intl.DateTimeFormat("en-BE", { timeZone: TZ, day: "numeric", month: "short" }).format(
      new Date(`${dt}T12:00:00Z`),
    );
  const prevDisabled = start <= mondayOf(today);
  const nextDisabled = start >= mondayOf(lastBookable);

  return (
    <div className="mb-1 rounded-2xl border border-line bg-surface p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <NavBtn dir="prev" disabled={prevDisabled} onClick={() => onAnchor(addDays(start, -7))} />
        <span className="text-[13px] font-semibold text-ink tabular">
          {fmt(start)} – {fmt(end)}
        </span>
        <NavBtn dir="next" disabled={nextDisabled} onClick={() => onAnchor(addDays(start, 7))} />
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WD_HEADS.map((h, i) => (
          <span key={i} className="text-[10px] font-semibold text-faint">{h}</span>
        ))}
        {days.map((date) => (
          <DayCell key={date} date={date} today={today} bookable={bookable} selected={selected} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}

function MonthPicker({ anchor, today, lastBookable, bookable, selected, onAnchor, onPick }: PickerProps) {
  const first = startOfMonth(anchor);
  const [y, m] = first.split("-").map(Number);
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${first.slice(0, 7)}-${String(d).padStart(2, "0")}`);
  }
  const prevDisabled = first <= startOfMonth(today);
  const nextDisabled = first >= startOfMonth(lastBookable);

  return (
    <div className="mb-1 rounded-2xl border border-line bg-surface p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <NavBtn dir="prev" disabled={prevDisabled} onClick={() => onAnchor(startOfMonth(addDays(first, -1)))} />
        <span className="text-[13px] font-semibold text-ink">{monthTitle(first)}</span>
        <NavBtn dir="next" disabled={nextDisabled} onClick={() => onAnchor(addDays(`${first.slice(0, 7)}-28`, 7))} />
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WD_HEADS.map((h, i) => (
          <span key={i} className="text-[10px] font-semibold text-faint">{h}</span>
        ))}
        {cells.map((date, i) =>
          date === null ? (
            <span key={`e${i}`} />
          ) : (
            <DayCell key={date} date={date} today={today} bookable={bookable} selected={selected} onPick={onPick} />
          ),
        )}
      </div>
    </div>
  );
}
