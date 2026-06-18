import { signOut } from "@/lib/auth/actions";
import { VerifyBanner } from "@/components/provider/verify-banner";
import { BookingLinkCard } from "@/components/provider/booking-link";
import { appUrl } from "@/lib/app-url";
import { getDictionary, formatDuration } from "@/lib/i18n";
import {
  getProviderContext,
  getDayBookings,
  getDayStats,
  getDayTimeline,
  getWeekSummary,
  getMonthCounts,
  todayLocal,
  weekStartOf,
  maxNavDate,
  type ProviderContext,
  type TimelineSegment,
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
  const { view = "day", date: dateParam } = await searchParams;
  const today = todayLocal(provider.timezone);
  const date = dateParam ?? today;
  const maxDate = maxNavDate(provider);

  // "Open today · 09:00–18:00" subtitle (today's working hours, if any).
  const todayShape = await getDayTimeline(provider, today, []);
  const openText = todayShape.working
    ? `${t.dashboard.openToday} · ${hhmm(todayShape.startMin)}–${hhmm(todayShape.endMin)}`
    : t.dashboard.closedToday;

  const bookingUrl = appUrl(`/b/${provider.slug}`);

  return (
    <div className="min-h-dvh bg-canvas text-ink md:flex md:justify-center md:bg-desk md:px-6 md:py-8">
      {/* On desktop the app is a contained cream panel floating on the taupe
          "desk"; on phone it's full-bleed with a bottom tab bar. */}
      <div className="w-full pb-24 md:max-w-[1240px] md:rounded-[28px] md:bg-canvas md:pb-8 md:shadow-[var(--shadow-panel)]">
        <div className="mx-auto w-full max-w-md px-5 py-7 md:max-w-none md:px-9 md:py-8">
          {!provider.emailVerified && <VerifyBanner email={provider.email} />}

          {/* Header */}
          <header className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="font-serif text-2xl leading-tight">{provider.businessName}</h1>
              <p className="mt-0.5 text-sm text-ink-3">{openText}</p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/dashboard/clients"
                className="hidden rounded-full border border-line px-4 py-1.5 text-sm text-ink-2 md:inline-block"
              >
                {t.dashboard.clients}
              </a>
              <form action={signOut}>
                <button type="submit" className="text-sm text-ink-3 underline">
                  {t.auth.signOut}
                </button>
              </form>
            </div>
          </header>

          {/* View toggle */}
          <nav className="mb-5 flex gap-2 text-sm">
            {(["day", "week", "month"] as const).map((v) => (
              <a
                key={v}
                href={`/dashboard?view=${v}&date=${date}`}
                className={`rounded-full px-4 py-1.5 ${
                  view === v
                    ? "bg-accent font-semibold text-white"
                    : "border border-line text-ink-2"
                }`}
              >
                {v === "day" ? t.dashboard.viewDay : v === "week" ? t.dashboard.viewWeek : t.dashboard.viewMonth}
              </a>
            ))}
            <a
              href="/dashboard/clients"
              className="ml-auto rounded-full border border-line px-4 py-1.5 text-ink-2 md:hidden"
            >
              {t.dashboard.clients}
            </a>
          </nav>

          {/* Two columns on desktop: the view fills the wide left, a rail sits right. */}
          <div className="md:grid md:grid-cols-[minmax(0,1fr)_312px] md:gap-8 md:items-start">
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
              {view === "month" && (
                <MonthView provider={provider} date={date} />
              )}
            </div>

            {/* Side rail (desktop) */}
            <aside className="mt-8 space-y-4 md:mt-0">
              <a
                href="/dashboard/booking/new"
                className="block rounded-xl bg-accent px-4 py-3 text-center text-sm font-semibold text-white"
              >
                + {t.dashboard.walkIn}
              </a>

              <BookingLinkCard url={bookingUrl} businessName={provider.businessName} />

              {/* Management nav — desktop only; phone uses the bottom tab bar */}
              <div className="hidden md:block">
                <RailGroup label={t.dashboard.groupAvailability}>
                  <RailLink href="/dashboard/schedule">{t.schedule.title}</RailLink>
                  <RailLink href={`/dashboard/days?date=${date}`}>{t.dashboard.manageDay}</RailLink>
                </RailGroup>
                <RailGroup label={t.dashboard.groupBusiness}>
                  <RailLink href="/dashboard/services">{t.dashboard.services}</RailLink>
                  <RailLink href="/dashboard/settings">{t.dashboard.settings}</RailLink>
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
    <div className="mt-5">
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-4">{label}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RailLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-2 hover:border-accent/40"
    >
      {children}
      <span className="text-ink-4">›</span>
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
      <DateNav provider={provider} view="day" date={date} step={1} today={today} maxDate={maxDate} label={dayLabel(date, provider.timezone)} />

      {/* Stat bar */}
      <div className="mb-5 grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border border-line bg-surface px-5 py-4 sm:grid-cols-4">
        <Stat label={t.dashboard.statBookings} value={String(stats.count)} />
        <Stat label={t.dashboard.statValue} value={euros(stats.valueCents)} />
        <Stat label={t.dashboard.statFreeTime} value={formatDuration(stats.freeMinutes)} />
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-4">{t.dashboard.statDayBooked}</p>
          <p className="mt-1 font-serif text-lg text-ink">{stats.bookedPct}%</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${stats.bookedPct}%` }} />
          </div>
        </div>
      </div>

      {!timeline.working ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-6 text-center text-sm text-ink-3">
          {t.dashboard.dayClosed}
        </p>
      ) : (
        <ol className="relative space-y-2">
          {timeline.segments.map((seg) => (
            <TimelineRow key={`${seg.kind}-${seg.startMin}`} seg={seg} nowMin={nowMin} />
          ))}
        </ol>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ink-4">{label}</p>
      <p className="mt-1 font-serif text-lg text-ink">{value}</p>
    </div>
  );
}

// Height scales gently with duration so the day reads as a timeline, but
// clamps so short services stay tappable and long gaps don't dominate.
function segHeight(minutes: number): number {
  return Math.min(150, Math.max(56, Math.round(minutes * 0.6)));
}

function TimelineRow({ seg, nowMin }: { seg: TimelineSegment; nowMin: number | null }) {
  const height = segHeight(seg.endMin - seg.startMin);

  if (seg.kind === "free") {
    return (
      <li
        style={{ minHeight: height }}
        className="flex items-center gap-3 rounded-2xl border border-dashed border-line px-4"
      >
        <span className="w-24 shrink-0 font-mono text-xs text-ink-3">{seg.timeText}</span>
        <span className="text-sm text-ink-3">
          {t.dashboard.freeGap} · {formatDuration(seg.minutes)}
        </span>
        <a
          href="/dashboard/booking/new"
          className="ml-auto shrink-0 text-sm font-medium text-accent"
        >
          {t.dashboard.bookThisGap} →
        </a>
      </li>
    );
  }

  if (seg.kind === "break") {
    return (
      <li
        style={{ minHeight: height }}
        className="flex items-center gap-3 rounded-2xl border border-line bg-canvas-2 px-4"
      >
        <span className="w-24 shrink-0 font-mono text-xs text-ink-4">{seg.timeText}</span>
        <span className="text-sm text-ink-3">{seg.label}</span>
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
    <li>
      <a
        href={`/dashboard/booking/${seg.id}`}
        style={{ minHeight: height }}
        className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border px-4 ${
          seg.status === "no_show"
            ? "border-red-300 bg-surface"
            : inProgress
              ? "border-accent bg-surface"
              : "border-line bg-surface"
        } ${dimmed ? "opacity-60" : ""}`}
      >
        {inProgress && <span className="absolute inset-y-0 left-0 w-1.5 bg-accent" />}
        <span className="w-24 shrink-0 font-mono text-xs text-accent">{seg.timeText}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-ink">{seg.clientName}</span>
          <span className="block truncate text-xs text-ink-3">{seg.serviceName}</span>
          {inProgress && (
            <span className="mt-1 block text-xs font-medium text-accent">
              {t.dashboard.nowAt} {hhmm(nowMin as number)} · {t.dashboard.endsIn} {formatDuration(endsInMin)}
            </span>
          )}
        </span>
        <span className="shrink-0 text-right">
          {inProgress && (
            <span className="mb-1 block rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              {t.dashboard.inProgress}
            </span>
          )}
          {seg.status === "no_show" && (
            <span className="block text-xs text-red-600">{t.dashboard.noShowBadge}</span>
          )}
          {seg.isPast && seg.status !== "no_show" && (
            <span className="block text-xs text-ink-3">{t.dashboard.pastBadge}</span>
          )}
          <span className="font-mono text-sm text-ink-2">{euros(seg.priceCents)}</span>
        </span>
      </a>
    </li>
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

  return (
    <section>
      <DateNav
        provider={provider}
        view="week"
        date={weekStart}
        step={7}
        today={today}
        maxDate={maxDate}
        label={`${dayLabel(weekStart, provider.timezone).split(" ").slice(1).join(" ")} →`}
      />
      <ul className="space-y-2">
        {days.map((d) => (
          <li key={d.date}>
            <a
              href={`/dashboard?view=day&date=${d.date}`}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                d.date === today ? "border-accent/50 bg-surface" : "border-line bg-surface"
              }`}
            >
              <span className="font-serif">{dayLabel(d.date, provider.timezone)}</span>
              <span className="text-sm">
                {d.count > 0 ? (
                  <>
                    <span className="font-mono text-accent">{d.count}</span>
                    <span className="ml-2 font-mono text-ink-3">{euros(d.valueCents)}</span>
                  </>
                ) : (
                  <span className="text-ink-4">—</span>
                )}
              </span>
            </a>
          </li>
        ))}
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
  const counts = await getMonthCounts(provider, year, month);
  const today = todayLocal(provider.timezone);

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
      <div className="mb-4 flex items-center justify-between">
        <a href={`/dashboard?view=month&date=${prevMonth}`} className="rounded px-3 py-1 text-ink-3">←</a>
        <span className="font-serif">{monthLabel}</span>
        <a href={`/dashboard?view=month&date=${nextMonth}`} className="rounded px-3 py-1 text-ink-3">→</a>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-xs text-ink-4">{d}</span>
        ))}
        {cells.map((cell, i) =>
          cell === null ? (
            <span key={`e${i}`} />
          ) : (
            <a
              key={cell}
              href={`/dashboard?view=day&date=${cell}`}
              className={`rounded-lg py-2 text-sm ${
                cell === today ? "bg-accent font-semibold text-white" : "border border-line bg-surface text-ink-2"
              }`}
            >
              {Number(cell.slice(-2))}
              {counts.get(cell) ? (
                <span className="block text-[10px] text-accent">{counts.get(cell)}</span>
              ) : (
                <span className="block text-[10px] text-transparent">0</span>
              )}
            </a>
          ),
        )}
      </div>
    </section>
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
  provider: ProviderContext;
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
      <a href={`/dashboard?view=${view}&date=${prev}`} className="rounded px-3 py-1 text-ink-3">←</a>
      <span className="text-center">
        <span className="block font-serif">{label}</span>
        {date !== today && (
          <a href={`/dashboard?view=${view}&date=${today}`} className="text-xs text-accent underline">
            {t.dashboard.today}
          </a>
        )}
      </span>
      {nextAllowed ? (
        <a href={`/dashboard?view=${view}&date=${next}`} className="rounded px-3 py-1 text-ink-3">→</a>
      ) : (
        <span className="px-3 py-1 text-ink-4">→</span>
      )}
    </div>
  );
}

// Fixed bottom tab bar — phone only. Mirrors the native-app feel from the design.
function BottomNav({ active, date }: { active: string; date: string }) {
  const tabs = [
    { key: "schedule", href: "/dashboard", label: t.dashboard.navSchedule, icon: IconCalendar },
    { key: "clients", href: "/dashboard/clients", label: t.dashboard.clients, icon: IconUsers },
    { key: "services", href: "/dashboard/services", label: t.dashboard.services, icon: IconTag },
    { key: "availability", href: "/dashboard/schedule", label: t.dashboard.navAvailability, icon: IconClock },
    { key: "settings", href: `/dashboard/settings`, label: t.dashboard.navSettings, icon: IconGear },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 backdrop-blur md:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const on = tab.key === active;
        return (
          <a
            key={tab.key}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] ${
              on ? "text-accent" : "text-ink-3"
            }`}
          >
            <Icon />
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}

function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 14c2.2.3 4 2.2 4 4.5" />
    </svg>
  );
}
function IconTag() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12 12 3h7v7l-9 9z" /><circle cx="15.5" cy="7.5" r="1.3" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}
function IconGear() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </svg>
  );
}
