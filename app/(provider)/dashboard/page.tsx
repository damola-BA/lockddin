import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Coffee,
  ExternalLink,
  Plus,
} from "lucide-react";
import { VerifyBanner } from "@/components/provider/verify-banner";
import { BookingLinkCard } from "@/components/provider/booking-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorkstationShell } from "@/components/provider/workstation-shell";
import { appUrl } from "@/lib/app-url";
import { getDictionary, formatDuration, fill } from "@/lib/i18n";
import {
  getProviderContext,
  getDayBookings,
  getDayStats,
  getDayTimeline,
  getWeekSummary,
  getMonthDayStatus,
  getMonthSummary,
  getUpcomingOpenDays,
  todayLocal,
  weekStartOf,
  maxNavDate,
  type ProviderContext,
  type TimelineSegment,
  type DayTimeline,
  type OpenDayRow,
} from "@/lib/dashboard/queries";

const t = getDictionary();

function euros(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayLabel(date: string, tz: string): string {
  return new Intl.DateTimeFormat("en-BE", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00Z`));
}

function nowMinutesIn(tz: string): number {
  const hm = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const provider = await getProviderContext();
  if (!provider) return null;
  // Default view follows the schedule mode: a sparse (flexible) provider lands on
  // Month to see their scattered open days; a weekly provider lands on Day.
  const { view: viewParam, date: dateParam } = await searchParams;
  const view = viewParam ?? (provider.scheduleType === "flexible" ? "month" : "day");
  const today = todayLocal(provider.timezone);
  const date = dateParam ?? today;
  const maxDate = maxNavDate(provider);

  const todayShape = await getDayTimeline(provider, today, []);
  const openText = todayShape.working
    ? `${t.dashboard.openToday} · ${hhmm(todayShape.startMin)}–${hhmm(todayShape.endMin)}`
    : t.dashboard.closedToday;

  const bookingUrl = appUrl(`/b/${provider.slug}`);

  return (
    <WorkstationShell active="schedule" businessName={provider.businessName} bleed>
      {!provider.emailVerified && <VerifyBanner email={provider.email} />}

      {/* Page header — business name + today's status. Section nav now lives in
          the shared top bar (desktop) / bottom tab bar (phone). */}
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-[22px] font-semibold leading-tight md:text-[28px]">
            {provider.businessName}
          </h1>
          <p className="mt-1.5 inline-flex items-center gap-2 text-[13px] text-ink-3">
            <span
              className={`h-[7px] w-[7px] rounded-full ${
                todayShape.working ? "bg-ok" : "bg-faint"
              }`}
            />
            <span className="tabular">{openText}</span>
          </p>
        </div>
        {/* Phone-only theme toggle — desktop has it in the top bar. */}
        <div className="shrink-0 md:hidden">
          <ThemeToggle />
        </div>
      </header>

      {/* View toggle (Day / Week / Month) */}
      <div className="mb-5">
        <nav className="inline-flex rounded-xl bg-surface-2 p-1">
          {(["day", "week", "month"] as const).map((v) => (
            <a
              key={v}
              href={`/dashboard?view=${v}&date=${date}`}
              className={`rounded-lg px-4 py-1.5 text-[13px] font-semibold ${
                view === v
                  ? "bg-ctrl text-ctrl-ink shadow-sm"
                  : "text-ink-3"
              }`}
            >
              {v === "day" ? t.dashboard.viewDay : v === "week" ? t.dashboard.viewWeek : t.dashboard.viewMonth}
            </a>
          ))}
        </nav>
      </div>

      {view === "day" && (
        <DayView
          provider={provider}
          date={date}
          today={today}
          maxDate={maxDate}
          bookingUrl={bookingUrl}
          nowMin={date === today ? nowMinutesIn(provider.timezone) : null}
        />
      )}
      {view === "week" && (
        <WeekView provider={provider} date={date} maxDate={maxDate} bookingUrl={bookingUrl} />
      )}
      {view === "month" && (
        <MonthView provider={provider} date={date} bookingUrl={bookingUrl} />
      )}
    </WorkstationShell>
  );
}

// Dashboard-specific actions — walk-in, the shareable booking link, and a live
// preview. Sits in the Day rail on desktop, stacks under the content on phone.
function ActionsRail({
  bookingUrl,
  businessName,
}: {
  bookingUrl: string;
  businessName: string;
}) {
  return (
    <div className="space-y-3.5">
      <Link
        href="/dashboard/booking/new"
        className="flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3.5 text-sm font-bold text-white shadow-[0_12px_26px_-14px_rgba(184,66,28,.6)]"
      >
        <Plus size={17} strokeWidth={2.2} /> {t.dashboard.walkIn}
      </Link>
      <BookingLinkCard url={bookingUrl} businessName={businessName} />
      <a
        href={bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-[13px] font-semibold text-ink-2"
      >
        <ExternalLink size={15} strokeWidth={1.9} /> {t.dashboard.previewBookingPage}
      </a>
    </div>
  );
}


async function DayView({
  provider,
  date,
  today,
  maxDate,
  bookingUrl,
  nowMin,
}: {
  provider: ProviderContext;
  date: string;
  today: string;
  maxDate: string;
  bookingUrl: string;
  nowMin: number | null;
}) {
  const bookings = await getDayBookings(provider, date);
  const stats = await getDayStats(provider, date, bookings);
  const timeline = await getDayTimeline(provider, date, bookings);

  // The booking happening right now (today only) — promoted to a hero card.
  const current =
    nowMin !== null && timeline.working
      ? timeline.segments.find(
          (s): s is Extract<TimelineSegment, { kind: "booking" }> =>
            s.kind === "booking" &&
            s.status !== "no_show" &&
            nowMin >= s.startMin &&
            nowMin < s.endMin,
        )
      : undefined;

  // "Up next" — the next confirmed bookings still ahead (today only).
  const upNext = (
    nowMin !== null && timeline.working
      ? timeline.segments.filter(
          (s): s is Extract<TimelineSegment, { kind: "booking" }> =>
            s.kind === "booking" &&
            s.status !== "no_show" &&
            s.startMin >= nowMin,
        )
      : []
  ).slice(0, 3);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_332px] lg:items-start lg:gap-11">
      <section className="min-w-0">
        <DateNav view="day" date={date} step={1} today={today} maxDate={maxDate} label={dayLabel(date, provider.timezone)} />

        {current && nowMin !== null && <HappeningNow seg={current} nowMin={nowMin} />}

        {/* Stat strip + day-shape — inline on phone/tablet; on desktop it moves
            into the rail's "Today at a glance" card. */}
        <div className="mb-5 rounded-2xl border border-line bg-surface px-4 py-4 shadow-[var(--shadow-sm)] lg:hidden">
          <StatRow stats={stats} />
          {timeline.working && <DayShape timeline={timeline} bookedPct={stats.bookedPct} />}
        </div>

        {!timeline.working ? (
          <p className="rounded-2xl border border-line bg-surface px-4 py-6 text-center text-sm text-ink-3">
            {t.dashboard.dayClosed}
          </p>
        ) : bookings.length === 0 ? (
          <EmptyDay />
        ) : (
          <ol className="space-y-2.5">
            {timeline.segments.map((seg) => (
              <TimelineRow key={`${seg.kind}-${seg.startMin}`} seg={seg} nowMin={nowMin} />
            ))}
          </ol>
        )}
      </section>

      <aside className="mt-7 space-y-4 lg:mt-0">
        {/* Today at a glance — desktop only (phone shows the inline strip). */}
        {timeline.working && (
          <div className="hidden rounded-[18px] border border-line bg-surface p-[18px] shadow-[var(--shadow-sm)] lg:block">
            <p className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-4">
              {t.dashboard.todayGlance}
            </p>
            <RailStat label={t.dashboard.statBookings} value={String(stats.count)} />
            <RailSep />
            <RailStat label={t.dashboard.dayValueLabel} value={euros(stats.valueCents)} />
            <RailSep />
            <RailStat label={t.dashboard.statFreeTime} value={formatDuration(stats.freeMinutes)} />
            <div className="mt-[18px]">
              <DayShape timeline={timeline} bookedPct={stats.bookedPct} />
            </div>
          </div>
        )}

        {upNext.length > 0 && (
          <div className="hidden rounded-[18px] border border-line bg-surface p-[18px] shadow-[var(--shadow-sm)] lg:block">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-4">
              {t.dashboard.upNext}
            </p>
            <div className="space-y-3">
              {upNext.map((u) => (
                <a key={u.id} href={`/dashboard/booking/${u.id}`} className="flex items-center gap-3">
                  <span className="w-9 shrink-0 text-[12px] font-bold text-accent tabular">{hhmm(u.startMin)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-[14px] font-semibold text-ink">{u.clientName}</span>
                    <span className="block truncate text-[11.5px] text-ink-3">{u.serviceName}</span>
                  </span>
                  <span className="shrink-0 font-serif text-[12.5px] font-semibold text-ink-2 tabular">{euros(u.priceCents)}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <ActionsRail bookingUrl={bookingUrl} businessName={provider.businessName} />
      </aside>
    </div>
  );
}

function StatRow({ stats }: { stats: { count: number; valueCents: number; freeMinutes: number } }) {
  return (
    <div className="flex items-stretch">
      <StatCell label={t.dashboard.statBookings} value={String(stats.count)} />
      <Divider />
      <StatCell label={t.dashboard.statValue} value={euros(stats.valueCents)} />
      <Divider />
      <StatCell label={t.dashboard.statFreeTime} value={formatDuration(stats.freeMinutes)} />
    </div>
  );
}

function RailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[13px] text-ink-3">{label}</span>
      <span className="font-serif text-[19px] font-semibold text-ink tabular">{value}</span>
    </div>
  );
}

function RailSep() {
  return <div className="my-3 h-px bg-line-2" />;
}

// "Happening now" — the in-progress booking lifted out of the timeline with a
// live dot, minutes-left, and a progress fill. The day's emotional anchor.
function HappeningNow({
  seg,
  nowMin,
}: {
  seg: Extract<TimelineSegment, { kind: "booking" }>;
  nowMin: number;
}) {
  const pct = Math.min(
    100,
    Math.max(0, ((nowMin - seg.startMin) / (seg.endMin - seg.startMin)) * 100),
  );
  const leftMin = Math.max(0, seg.endMin - nowMin);
  return (
    <a
      href={`/dashboard/booking/${seg.id}`}
      className="relative mb-3.5 block overflow-hidden rounded-[20px] border-[1.5px] border-accent bg-surface px-4 pb-4 pt-4 shadow-[0_0_0_3px_var(--accent-l),var(--shadow-sm)]"
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-accent" />
      <div className="mb-2.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-accent">
          <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-accent" />
          {t.dashboard.happeningNow}
        </span>
        <span className="text-xs font-bold text-accent-d tabular">
          {fill(t.dashboard.timeLeft, { time: formatDuration(leftMin) })}
        </span>
      </div>
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className="truncate font-serif text-[19px] font-semibold text-ink">{seg.clientName}</p>
          <p className="mt-0.5 text-[13px] text-ink-3">{seg.serviceName}</p>
        </div>
        <span className="shrink-0 font-serif text-[15px] font-semibold text-ink-2 tabular">
          {euros(seg.priceCents)}
        </span>
      </div>
      <div className="mt-3">
        <div className="mb-1.5 flex justify-between text-[11px] font-semibold text-ink-4 tabular">
          <span>{hhmm(seg.startMin)}</span>
          <span>{hhmm(seg.endMin)}</span>
        </div>
        <div className="h-[7px] overflow-hidden rounded-full bg-accent-l">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </a>
  );
}

// Segmented "Today's shape" bar — each timeline segment sized by its share of
// the working day, coloured by kind (booked / open / break / no-show).
function DayShape({
  timeline,
  bookedPct,
}: {
  timeline: Extract<DayTimeline, { working: true }>;
  bookedPct: number;
}) {
  const span = timeline.endMin - timeline.startMin;
  if (span <= 0) return null;
  const color = (seg: TimelineSegment) => {
    if (seg.kind === "break") return "var(--faint)";
    if (seg.kind === "free") return "var(--ok)";
    return seg.status === "no_show" ? "var(--no-l)" : "var(--accent)";
  };
  return (
    <div className="mt-3.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-2">{t.dashboard.dayShape}</span>
        <span className="text-xs font-bold text-accent tabular">
          {fill(t.dashboard.pctBooked, { n: bookedPct })}
        </span>
      </div>
      <div className="flex h-[11px] overflow-hidden rounded-full bg-canvas-2">
        {timeline.segments.map((seg) => (
          <span
            key={`${seg.kind}-${seg.startMin}`}
            style={{
              width: `${((seg.endMin - seg.startMin) / span) * 100}%`,
              background: color(seg),
            }}
          />
        ))}
      </div>
      <div className="mt-2.5 flex gap-3.5 text-[10.5px] text-ink-3">
        <LegendDot color="bg-accent" label={t.dashboard.legendBooked} />
        <LegendDot color="bg-ok" label={t.dashboard.legendBookedOpen} />
        <LegendDot color="bg-faint" label={t.dashboard.legendBreak} />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-[3px] ${color}`} />
      {label}
    </span>
  );
}

// First-glance empty state for a working day with zero bookings.
function EmptyDay() {
  return (
    <div className="flex flex-col items-center rounded-[20px] border-[1.5px] border-dashed border-desk bg-surface px-5 pb-7 pt-9 text-center">
      <span className="mb-3.5 inline-flex h-[62px] w-[62px] items-center justify-center rounded-full bg-accent-l text-accent">
        <CalendarRange size={27} strokeWidth={1.8} />
      </span>
      <h3 className="mb-1.5 font-serif text-[19px] font-semibold text-ink">{t.dashboard.emptyDayTitle}</h3>
      <p className="max-w-[240px] text-[13px] leading-relaxed text-ink-3">{t.dashboard.emptyDayBody}</p>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-4">{label}</p>
      <p className="mt-1 font-serif text-xl font-semibold text-ink tabular">{value}</p>
    </div>
  );
}

function Divider() {
  return <div className="mx-3 w-px self-center bg-line-2" style={{ height: 34 }} />;
}

// Time gutter + card row. Past dimmed, in-progress gets the accent halo,
// free gaps are dashed "Book this gap" rows, breaks are filled tiles.
function TimelineRow({ seg, nowMin }: { seg: TimelineSegment; nowMin: number | null }) {
  const startLabel = hhmm(seg.startMin);

  if (seg.kind === "free") {
    return (
      <li className="flex gap-3">
        <TimeGutter label={startLabel} tone="faint" />
        <Link
          href="/dashboard/booking/new"
          className="flex flex-1 items-center justify-between rounded-2xl border-[1.5px] border-dashed border-line px-4 py-3.5"
        >
          <span className="text-[13px] text-ink-3">
            {t.dashboard.freeGap} · <span className="tabular">{formatDuration(seg.minutes)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-accent">
            {t.dashboard.bookThisGap}
            <ArrowRight size={14} strokeWidth={2.3} />
          </span>
        </Link>
      </li>
    );
  }

  if (seg.kind === "break") {
    return (
      <li className="flex gap-3">
        <TimeGutter label={startLabel} tone="faint" />
        <div className="flex flex-1 items-center gap-2 rounded-2xl bg-canvas-2 px-4 py-3">
          <Coffee size={14} strokeWidth={1.8} className="text-ink-4" />
          <span className="text-[13px] font-semibold text-ink-3">{seg.label}</span>
        </div>
      </li>
    );
  }

  const dimmed = seg.isPast || seg.status === "no_show";
  const inProgress =
    nowMin !== null &&
    seg.status !== "no_show" &&
    nowMin >= seg.startMin &&
    nowMin < seg.endMin;
  const endsInMin = inProgress ? seg.endMin - (nowMin as number) : 0;

  return (
    <li className={`flex gap-3 ${dimmed ? "opacity-60" : ""}`}>
      <TimeGutter label={startLabel} tone={inProgress ? "accent" : dimmed ? "muted" : "accent"} />
      <a
        href={`/dashboard/booking/${seg.id}`}
        className={`relative flex-1 overflow-hidden rounded-2xl px-4 py-3.5 ${
          seg.status === "no_show"
            ? "border border-red-300 bg-surface"
            : inProgress
              ? "border-[1.5px] border-accent bg-surface pl-[18px] [box-shadow:0_0_0_3px_var(--accent-l)]"
              : "border border-line bg-surface"
        }`}
      >
        {inProgress && <span className="absolute inset-y-0 left-0 w-1 bg-accent" />}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-serif text-[15.5px] font-semibold text-ink">{seg.clientName}</p>
              {inProgress && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-white">
                  <span className="h-[5px] w-[5px] rounded-full bg-white" />
                  {t.dashboard.inProgress}
                </span>
              )}
              {seg.status === "no_show" && (
                <span className="shrink-0 text-xs text-red-600">{t.dashboard.noShowBadge}</span>
              )}
              {seg.isPast && seg.status !== "no_show" && (
                <span className="shrink-0 text-xs text-ink-4">{t.dashboard.pastBadge}</span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
              {seg.serviceName}
              {inProgress && (
                <span className="font-semibold text-accent-d tabular">
                  {" · "}
                  {t.dashboard.endsIn} {formatDuration(endsInMin)}
                </span>
              )}
            </p>
          </div>
          <span className="shrink-0 font-serif text-[13.5px] font-bold text-ink-2 tabular">
            {euros(seg.priceCents)}
          </span>
        </div>
      </a>
    </li>
  );
}

function TimeGutter({ label, tone }: { label: string; tone: "accent" | "muted" | "faint" }) {
  const color = tone === "accent" ? "text-accent" : tone === "muted" ? "text-ink-3" : "text-faint";
  return (
    <span className={`w-11 shrink-0 pt-3.5 text-right text-[12.5px] font-bold tabular ${color}`}>
      {label}
    </span>
  );
}

async function WeekView({
  provider,
  date,
  maxDate,
  bookingUrl,
}: {
  provider: ProviderContext;
  date: string;
  maxDate: string;
  bookingUrl: string;
}) {
  const weekStart = weekStartOf(date);
  const days = await getWeekSummary(provider, weekStart);
  const today = todayLocal(provider.timezone);

  // Open/closed marking per day. The week can straddle two months, so merge the
  // status maps for each month it touches (mirrors the engine's mode rule).
  const lastDate = addDays(weekStart, 6);
  const months = [...new Set([weekStart.slice(0, 7), lastDate.slice(0, 7)])];
  const statusMaps = await Promise.all(
    months.map((ym) => {
      const [yy, mm] = ym.split("-").map(Number);
      return getMonthDayStatus(provider, yy, mm - 1);
    }),
  );
  const status = new Map<string, { open: boolean; count: number; full: boolean }>();
  statusMaps.forEach((mp) => mp.forEach((v, k) => status.set(k, v)));

  return (
    <section>
      <DateNav
        view="week"
        date={weekStart}
        step={7}
        today={today}
        maxDate={maxDate}
        label={`${dayLabel(weekStart, provider.timezone).split(" ").slice(1).join(" ")} →`}
      />
      {/* Phone: stacked list of days. */}
      <ul className="space-y-2 md:hidden">
        {days.map((d) => {
          const open = status.get(d.date)?.open ?? false;
          return (
          <li key={d.date}>
            <a
              href={`/dashboard?view=day&date=${d.date}`}
              className={`flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 ${
                d.date === today
                  ? "border-[1.5px] border-accent [box-shadow:0_0_0_3px_var(--accent-l)]"
                  : "border border-line"
              }`}
            >
              <span className={`min-w-0 flex-1 truncate font-serif text-[15px] ${open ? "text-ink" : "text-ink-3"}`}>
                {dayLabel(d.date, provider.timezone)}
              </span>
              {d.count > 0 ? (
                <span className="inline-flex items-baseline gap-1.5 rounded-full bg-accent-l px-2.5 py-1 text-[12.5px]">
                  <span className="font-bold text-accent tabular">{d.count}</span>
                  <span className="text-accent-d tabular">· {euros(d.valueCents)}</span>
                </span>
              ) : open ? (
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-ink-3">
                  {t.dashboard.dayStatusOpen}
                </span>
              ) : (
                <span className="text-[12px] text-faint">{t.dashboard.dayStatusClosed}</span>
              )}
              <ChevronRight size={16} strokeWidth={2} className="shrink-0 text-faint" />
            </a>
          </li>
          );
        })}
      </ul>

      {/* Tablet/desktop: 7-column board with appointment chips. */}
      <div className="hidden grid-cols-7 items-start gap-2.5 md:grid">
        {days.map((d) => {
          const open = status.get(d.date)?.open ?? false;
          const isToday = d.date === today;
          const shown = d.appts.slice(0, 3);
          const more = d.count - shown.length;
          const dt = new Date(`${d.date}T12:00:00Z`);
          const weekday = new Intl.DateTimeFormat("en-BE", {
            timeZone: provider.timezone,
            weekday: "short",
          }).format(dt);
          const dayNum = String(Number(d.date.slice(-2)));
          const headColor = isToday ? "text-accent" : open || d.count > 0 ? "text-ink" : "text-ink-3";
          return (
            <div
              key={d.date}
              className={`flex min-h-[260px] flex-col rounded-2xl p-2.5 ${
                isToday
                  ? "border-[1.5px] border-accent [box-shadow:0_0_0_3px_var(--accent-l)] bg-surface"
                  : "border border-line bg-surface"
              }`}
            >
              <div className="mb-3 min-h-[40px]">
                <div className="flex items-baseline gap-1.5">
                  <span className={`font-serif text-[14px] font-semibold ${headColor}`}>{weekday}</span>
                  <span className={`text-[13px] font-bold tabular ${headColor}`}>{dayNum}</span>
                </div>
                {d.count > 0 && (
                  <span className="mt-1 block whitespace-nowrap text-[10.5px] font-semibold text-ink-3 tabular">
                    {d.count} · {euros(d.valueCents)}
                  </span>
                )}
              </div>
              {d.count > 0 ? (
                <div className="flex flex-col gap-2">
                  {shown.map((a) => (
                    <a
                      key={a.id}
                      href={`/dashboard/booking/${a.id}`}
                      className="relative overflow-hidden rounded-[10px] border border-line bg-surface-2 py-2 pl-3 pr-2"
                    >
                      <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />
                      <span className="block text-[10px] font-bold text-accent tabular">{a.start}</span>
                      <span className="mt-1 block truncate font-serif text-[12.5px] font-semibold text-ink">{a.clientName}</span>
                    </a>
                  ))}
                  {more > 0 && (
                    <span className="px-0.5 py-0.5 text-[10.5px] font-bold text-ink-4">
                      {fill(t.dashboard.moreCount, { n: more })}
                    </span>
                  )}
                </div>
              ) : open ? (
                <span className="text-[11px] font-semibold text-ok">{t.dashboard.dayStatusOpen}</span>
              ) : (
                <span className="text-[11px] font-semibold text-faint">{t.dashboard.dayStatusClosed}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-8 max-w-md md:mt-10">
        <ActionsRail bookingUrl={bookingUrl} businessName={provider.businessName} />
      </div>
    </section>
  );
}

async function MonthView({
  provider,
  date,
  bookingUrl,
}: {
  provider: ProviderContext;
  date: string;
  bookingUrl: string;
}) {
  const [y, m] = date.split("-").map(Number);
  const year = y;
  const month = m - 1;
  const status = await getMonthDayStatus(provider, year, month);
  const summary = await getMonthSummary(provider, year, month);
  const today = todayLocal(provider.timezone);
  const openDays =
    provider.scheduleType === "flexible" ? await getUpcomingOpenDays(provider) : [];

  // Quiet open days = open, nothing booked, today onward — worth promoting.
  const quietDays: string[] = [];
  for (const [cell, s] of status) {
    if (cell >= today && s.open && s.count === 0) quietDays.push(cell);
  }
  quietDays.sort();
  const shortLabel = (cell: string) =>
    new Intl.DateTimeFormat("en-BE", {
      timeZone: provider.timezone,
      weekday: "short",
      day: "numeric",
    }).format(new Date(`${cell}T12:00:00Z`));

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
    timeZone: provider.timezone,
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month, 15)));

  return (
    <section>
      {provider.scheduleType === "flexible" && (
        <OpenDaysLead provider={provider} openDays={openDays} />
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_296px] lg:items-start lg:gap-9">
        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-line bg-surface px-3 py-2.5">
            <NavSquare href={`/dashboard?view=month&date=${prevMonth}`} dir="left" />
            <span className="font-serif text-[15px] font-medium">{monthLabel}</span>
            <NavSquare href={`/dashboard?view=month&date=${nextMonth}`} dir="right" />
          </div>

          {/* Phone: compact aspect-square grid. */}
          <div className="grid grid-cols-7 gap-1.5 text-center md:hidden">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i} className="text-[10px] font-semibold text-faint">{d}</span>
            ))}
            {cells.map((cell, i) => {
              if (cell === null) return <span key={`e${i}`} />;
              const s = status.get(cell);
              const isToday = cell === today;
              const full = s?.open && s.full;
              const openFree = s?.open && !s.full;
              return (
                <a
                  key={cell}
                  href={`/dashboard?view=day&date=${cell}`}
                  className={`flex aspect-square flex-col items-center justify-center rounded-[10px] text-[12px] font-semibold ${
                    isToday
                      ? "border-[1.5px] border-accent [box-shadow:0_0_0_3px_var(--accent-l)] bg-surface text-ink"
                      : full
                        ? "bg-ctrl text-ctrl-ink"
                        : openFree
                          ? "border border-line bg-surface text-ink"
                          : "text-faint"
                  }`}
                >
                  <span className="tabular">{Number(cell.slice(-2))}</span>
                  {s?.open ? (
                    s.count > 0 ? (
                      <span className={`text-[8px] font-bold tabular ${full ? "text-ctrl-soft" : "text-accent"}`}>
                        {s.count}
                      </span>
                    ) : (
                      <span className="mt-0.5 h-[5px] w-[5px] rounded-full bg-ok" />
                    )
                  ) : (
                    <span className="text-[8px] text-transparent">0</span>
                  )}
                </a>
              );
            })}
          </div>

          {/* Tablet/desktop: expanded cells with value labels. */}
          <div className="hidden md:block">
            <div className="mb-1.5 grid grid-cols-7 gap-1.5">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d} className="pl-0.5 text-[10.5px] font-bold tracking-[0.03em] text-ink-4">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((cell, i) => {
                if (cell === null) return <span key={`e${i}`} />;
                const s = status.get(cell);
                const value = summary.byDay.get(cell);
                const isToday = cell === today;
                const full = s?.open && s.full;
                const openFree = s?.open && !s.full;
                return (
                  <a
                    key={cell}
                    href={`/dashboard?view=day&date=${cell}`}
                    className={`flex min-h-[88px] flex-col rounded-[11px] p-2 text-[13px] font-semibold ${
                      isToday
                        ? "border-[1.5px] border-accent [box-shadow:0_0_0_3px_var(--accent-l)] bg-surface text-ink"
                        : full
                          ? "bg-ctrl text-ctrl-ink"
                          : openFree
                            ? "border border-line bg-surface text-ink"
                            : "text-faint"
                    }`}
                  >
                    <span className="tabular">{Number(cell.slice(-2))}</span>
                    {s?.open && s.count > 0 && value ? (
                      <span className="mt-auto flex flex-col">
                        <span className={`font-serif text-[12.5px] font-semibold tabular ${full ? "text-ctrl-ink" : "text-ink"}`}>
                          {euros(value.valueCents)}
                        </span>
                        <span className={`text-[10px] font-bold tabular ${full ? "text-ctrl-soft" : "text-accent"}`}>
                          {fill(t.dashboard.bookedCount, { n: s.count })}
                        </span>
                      </span>
                    ) : s?.open ? (
                      <span className="mt-auto inline-flex h-[5px] w-[5px] rounded-full bg-ok" />
                    ) : null}
                  </a>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11.5px] text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-ok" /> {t.dashboard.legendOpen}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[4px] bg-ctrl" /> {t.dashboard.legendFull}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-faint">14</span> {t.dashboard.legendClosed}
            </span>
          </div>
        </div>

        {/* Desktop rail — month totals + quiet open days. */}
        <aside className="hidden space-y-4 lg:block">
          <div className="rounded-[18px] border border-line bg-surface p-[18px] shadow-[var(--shadow-sm)]">
            <p className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-4">{t.dashboard.thisMonth}</p>
            <RailStat label={t.dashboard.statBookings} value={String(summary.totalCount)} />
            <RailSep />
            <RailStat label={t.dashboard.dayValueLabel} value={euros(summary.totalValueCents)} />
            {summary.busiestDate && (
              <>
                <RailSep />
                <RailStat label={t.dashboard.monthBusiest} value={shortLabel(summary.busiestDate)} />
              </>
            )}
          </div>
          {quietDays.length > 0 && (
            <div className="rounded-[18px] border border-line bg-surface p-[18px] shadow-[var(--shadow-sm)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-4">{t.dashboard.quietOpenDays}</p>
              <p className="mb-3 mt-1 text-[11.5px] leading-snug text-ink-3">{t.dashboard.quietOpenBody}</p>
              <div className="flex flex-wrap gap-2">
                {quietDays.slice(0, 6).map((cell) => (
                  <a
                    key={cell}
                    href={`/dashboard?view=day&date=${cell}`}
                    className="inline-flex items-center gap-1.5 rounded-[9px] border border-line px-2.5 py-1.5 text-[12px] font-semibold text-ink-2 tabular"
                  >
                    <span className="h-[5px] w-[5px] rounded-full bg-ok" />
                    {shortLabel(cell)}
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <div className="mx-auto mt-8 max-w-md lg:hidden">
        <ActionsRail bookingUrl={bookingUrl} businessName={provider.businessName} />
      </div>
    </section>
  );
}

function OpenDaysLead({
  provider,
  openDays,
}: {
  provider: ProviderContext;
  openDays: OpenDayRow[];
}) {
  return (
    <div className="mb-5">
      <h2 className="mb-3 font-serif text-[18px] font-semibold">{t.dashboard.nextOpenDays}</h2>
      {openDays.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-sm text-ink-3">
          {t.dashboard.noOpenDaysAhead}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          {openDays.map((d) => (
            <a
              key={d.date}
              href={`/dashboard?view=day&date=${d.date}`}
              className="flex items-center justify-between border-b border-line-2 px-4 py-3.5 last:border-b-0"
            >
              <span>
                <span className="block text-[14px] font-semibold">
                  {dayLabel(d.date, provider.timezone)}
                </span>
                {d.start && d.end && (
                  <span className="text-[12.5px] tabular text-ink-3">{d.start}–{d.end}</span>
                )}
              </span>
              <span className="text-[12.5px] tabular text-ink-3">
                {d.count > 0 ? fill(t.dashboard.bookedCount, { n: d.count }) : t.dashboard.freeGap}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function DateNav({
  view,
  date,
  step,
  today,
  maxDate,
  label,
}: {
  view: string;
  date: string;
  step: number;
  today: string;
  maxDate: string;
  label: string;
}) {
  const prev = addDays(date, -step);
  const next = addDays(date, step);
  const nextAllowed = next <= maxDate;
  return (
    <div className="mb-4 flex items-center justify-between">
      <NavSquare href={`/dashboard?view=${view}&date=${prev}`} dir="left" />
      <span className="text-center">
        <span className="block font-serif text-[16px] font-medium md:text-[18px]">{label}</span>
        {date === today ? (
          <span className="text-[11.5px] font-semibold text-accent">{t.dashboard.today}</span>
        ) : (
          <a href={`/dashboard?view=${view}&date=${today}`} className="text-[11.5px] font-semibold text-accent underline">
            {t.dashboard.today}
          </a>
        )}
      </span>
      {nextAllowed ? (
        <NavSquare href={`/dashboard?view=${view}&date=${next}`} dir="right" />
      ) : (
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-line-2 text-faint md:h-9 md:w-9">
          <ChevronRight size={15} strokeWidth={2.2} />
        </span>
      )}
    </div>
  );
}

function NavSquare({ href, dir }: { href: string; dir: "left" | "right" }) {
  return (
    <a
      href={href}
      className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-line bg-surface text-ink-3 md:h-9 md:w-9"
    >
      {dir === "left" ? (
        <ChevronLeft size={15} strokeWidth={2.2} />
      ) : (
        <ChevronRight size={15} strokeWidth={2.2} />
      )}
    </a>
  );
}
