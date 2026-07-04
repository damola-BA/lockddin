"use client";

// Shared Week / Month date pickers for choosing a booking day — used by the
// public booking flow and the emailed reschedule page. Bookable days come from
// the slots API; past and unavailable days are disabled.

const TZ = "Europe/Brussels";
const WD_HEADS = ["M", "T", "W", "T", "F", "S", "S"];

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
}
export function mondayOf(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return ymd(d);
}
export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}
function monthTitle(date: string): string {
  return new Intl.DateTimeFormat("en-BE", {
    timeZone: TZ,
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

export type PickerProps = {
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
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-[15px] text-ink-3 disabled:opacity-30"
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
  const num = new Intl.DateTimeFormat("en-BE", { timeZone: TZ, day: "numeric" }).format(
    new Date(`${date}T12:00:00Z`),
  );
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

export function WeekPicker({
  anchor,
  today,
  lastBookable,
  bookable,
  selected,
  onAnchor,
  onPick,
}: PickerProps) {
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
    <div className="rounded-2xl border border-line bg-surface p-3">
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

export function MonthPicker({
  anchor,
  today,
  lastBookable,
  bookable,
  selected,
  onAnchor,
  onPick,
}: PickerProps) {
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
    <div className="rounded-2xl border border-line bg-surface p-3">
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
