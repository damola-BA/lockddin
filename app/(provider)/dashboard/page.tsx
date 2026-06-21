import Link from "next/link";
import {
  ArrowRight,
  Calendar as CalIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  ExternalLink,
  Plus,
  Settings as SettingsIcon,
  Tag,
  Users,
} from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { VerifyBanner } from "@/components/provider/verify-banner";
import { BookingLinkCard } from "@/components/provider/booking-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { appUrl } from "@/lib/app-url";
import { getDictionary, formatDuration, fill } from "@/lib/i18n";
import {
  getProviderContext,
  getDayBookings,
  getDayStats,
  getDayTimeline,
  getWeekSummary,
  getMonthDayStatus,
  getUpcomingOpenDays,
  todayLocal,
  weekStartOf,
  maxNavDate,
  type ProviderContext,
  type TimelineSegment,
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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
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
    <div className="min-h-dvh bg-canvas text-ink md:py-8">
      <div className="w-full pb-24 md:pb-8">
        <div className="mx-auto w-full max-w-md px-5 py-7 md:max-w-[920px] md:px-9 md:py-8">
          {!provider.emailVerified && <VerifyBanner email={provider.email} />}

          {/* Header */}
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
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href="/dashboard/clients"
                className="hidden rounded-full border border-line px-4 py-1.5 text-sm text-ink-2 md:inline-block"
              >
                {t.dashboard.clients}
              </Link>
              <form action={signOut} className="hidden md:block">
                <button type="submit" className="text-sm text-ink-3 underline">
                  {t.auth.signOut}
                </button>
              </form>
              <ThemeToggle />
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-accent-l font-serif text-sm font-semibold text-accent">
                {initials(provider.businessName)}
              </span>
            </div>
          </header>

          {/* View toggle (segmented) + mobile clients link */}
          <div className="mb-5 flex items-center justify-between gap-3">
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
            <Link
              href="/dashboard/clients"
              className="rounded-full border border-line px-4 py-1.5 text-sm text-ink-2 md:hidden"
            >
              {t.dashboard.clients}
            </Link>
          </div>

          <div className="md:grid md:grid-cols-[minmax(0,1fr)_19.5rem] md:gap-8 md:items-start">
            <div className="min-w-0">
              {view === "day" && (
                <DayView
                  provider={provider}
                  date={date}
                  today={today}
                  maxDate={maxDate}
                  nowMin={date === today ? nowMinutesIn(provider.timezone) : null}
                />
              )}
              {view === "week" && (
                <WeekView provider={provider} date={date} maxDate={maxDate} />
              )}
              {view === "month" && <MonthView provider={provider} date={date} />}
            </div>

            {/* Side rail (desktop) */}
            <aside className="mt-8 space-y-3.5 md:mt-0">
              <Link
                href="/dashboard/booking/new"
                className="flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3.5 text-sm font-bold text-white shadow-[0_12px_26px_-14px_rgba(184,66,28,.6)]"
              >
                <Plus size={17} strokeWidth={2.2} /> {t.dashboard.walkIn}
              </Link>

              <BookingLinkCard url={bookingUrl} businessName={provider.businessName} />

              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-[13px] font-semibold text-ink-2"
              >
                <ExternalLink size={15} strokeWidth={1.9} /> {t.dashboard.previewBookingPage}
              </a>

              {/* Management nav — desktop only; phone uses the bottom tab bar */}
              <div className="hidden md:block">
                <RailGroup label={t.dashboard.groupAvailability}>
                  <RailLink href="/dashboard/availability" icon={<Clock size={17} strokeWidth={1.8} />}>
                    {t.dashboard.navAvailability}
                  </RailLink>
                </RailGroup>
                <RailGroup label={t.dashboard.groupBusiness}>
                  <RailLink href="/dashboard/services" icon={<Tag size={17} strokeWidth={1.8} />}>
                    {t.dashboard.services}
                  </RailLink>
                  <RailLink href="/dashboard/settings" icon={<SettingsIcon size={17} strokeWidth={1.8} />}>
                    {t.dashboard.settings}
                  </RailLink>
                </RailGroup>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <BottomNav active="schedule" date={date} />
    </div>
  );
}

function RailGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 first:mt-0">
      <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-4">
        {label}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RailLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-xl border border-line bg-surface px-3.5 py-3 text-sm font-semibold text-ink-2 hover:border-accent/40"
    >
      <span className="inline-flex items-center gap-2.5">
        <span className="text-accent">{icon}</span>
        {children}
      </span>
      <ChevronRight size={15} strokeWidth={2} className="text-faint" />
    </a>
  );
}

async function DayView({
  provider,
  date,
  today,
  maxDate,
  nowMin,
}: {
  provider: ProviderContext;
  date: string;
  today: string;
  maxDate: string;
  nowMin: number | null;
}) {
  const bookings = await getDayBookings(provider, date);
  const stats = await getDayStats(provider, date, bookings);
  const timeline = await getDayTimeline(provider, date, bookings);

  return (
    <section>
      <DateNav view="day" date={date} step={1} today={today} maxDate={maxDate} label={dayLabel(date, provider.timezone)} />

      {/* Stat strip */}
      <div className="mb-5 rounded-2xl border border-line bg-surface px-4 py-4 shadow-[var(--shadow-sm)]">
        <div className="flex items-stretch">
          <StatCell label={t.dashboard.statBookings} value={String(stats.count)} />
          <Divider />
          <StatCell label={t.dashboard.statValue} value={euros(stats.valueCents)} />
          <Divider />
          <StatCell label={t.dashboard.statFreeTime} value={formatDuration(stats.freeMinutes)} />
        </div>
        <div className="mt-3.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-2">{t.dashboard.statDayBooked}</span>
            <span className="text-xs font-bold text-accent tabular">{stats.bookedPct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-canvas-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${stats.bookedPct}%` }} />
          </div>
        </div>
      </div>

      {!timeline.working ? (
        <p className="rounded-2xl border border-line bg-surface px-4 py-6 text-center text-sm text-ink-3">
          {t.dashboard.dayClosed}
        </p>
      ) : (
        <ol className="space-y-2.5">
          {timeline.segments.map((seg) => (
            <TimelineRow key={`${seg.kind}-${seg.startMin}`} seg={seg} nowMin={nowMin} />
          ))}
        </ol>
      )}
    </section>
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
}: {
  provider: ProviderContext;
  date: string;
  maxDate: string;
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
      <ul className="space-y-2">
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
    </section>
  );
}

async function MonthView({
  provider,
  date,
}: {
  provider: ProviderContext;
  date: string;
}) {
  const [y, m] = date.split("-").map(Number);
  const year = y;
  const month = m - 1;
  const status = await getMonthDayStatus(provider, year, month);
  const today = todayLocal(provider.timezone);
  const openDays =
    provider.scheduleType === "flexible" ? await getUpcomingOpenDays(provider) : [];

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

      <div className="mb-4 flex items-center justify-between rounded-2xl border border-line bg-surface px-3 py-2.5">
        <NavSquare href={`/dashboard?view=month&date=${prevMonth}`} dir="left" />
        <span className="font-serif text-[15px] font-medium">{monthLabel}</span>
        <NavSquare href={`/dashboard?view=month&date=${nextMonth}`} dir="right" />
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
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

// Fixed bottom tab bar — phone only. Mirrors the native-app feel from the design.
function BottomNav({ active, date }: { active: string; date: string }) {
  const tabs = [
    { key: "schedule", href: "/dashboard", label: t.dashboard.navSchedule, Icon: CalIcon },
    { key: "clients", href: "/dashboard/clients", label: t.dashboard.clients, Icon: Users },
    { key: "services", href: "/dashboard/services", label: t.dashboard.services, Icon: Tag },
    { key: "availability", href: "/dashboard/availability", label: t.dashboard.navAvailability, Icon: Clock },
    { key: "settings", href: `/dashboard/settings`, label: t.dashboard.navSettings, Icon: SettingsIcon },
  ];
  void date;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/92 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {tabs.map(({ key, href, label, Icon }) => {
        const on = key === active;
        return (
          <a
            key={key}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${
              on ? "text-accent" : "text-ink-4"
            }`}
          >
            <Icon size={21} strokeWidth={1.9} />
            {label}
          </a>
        );
      })}
    </nav>
  );
}
