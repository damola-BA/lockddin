import { signOut } from "@/lib/auth/actions";
import { getDictionary, fill } from "@/lib/i18n";
import {
  getProviderContext,
  getDayBookings,
  getDayStats,
  getWeekSummary,
  getMonthCounts,
  todayLocal,
  weekStartOf,
  maxNavDate,
  type ProviderContext,
} from "@/lib/dashboard/queries";

const t = getDictionary();

function euros(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
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

  return (
    <div className="min-h-dvh bg-stone-950 text-stone-100">
      <main className="mx-auto w-full max-w-md px-5 py-8">
        <header className="mb-6 flex items-center justify-between">
          <p className="font-serif text-lg">{provider.businessName}</p>
          <form action={signOut}>
            <button type="submit" className="text-sm text-stone-400 underline">
              {t.auth.signOut}
            </button>
          </form>
        </header>

        <nav className="mb-5 flex gap-2 text-sm">
          {(["day", "week", "month"] as const).map((v) => (
            <a
              key={v}
              href={`/dashboard?view=${v}&date=${date}`}
              className={`rounded-lg px-3 py-1.5 ${
                view === v
                  ? "bg-amber-400 font-semibold text-stone-950"
                  : "border border-stone-700 text-stone-300"
              }`}
            >
              {v === "day" ? t.dashboard.viewDay : v === "week" ? t.dashboard.viewWeek : t.dashboard.viewMonth}
            </a>
          ))}
          <a
            href="/dashboard/clients"
            className="ml-auto rounded-lg border border-stone-700 px-3 py-1.5 text-stone-300"
          >
            {t.dashboard.clients}
          </a>
        </nav>

        {view === "day" && (
          <DayView provider={provider} date={date} today={today} maxDate={maxDate} />
        )}
        {view === "week" && (
          <WeekView provider={provider} date={date} maxDate={maxDate} />
        )}
        {view === "month" && (
          <MonthView provider={provider} date={date} />
        )}

        <nav className="mt-8 grid grid-cols-2 gap-2 text-center text-xs">
          <a href="/dashboard/schedule" className="rounded-lg border border-stone-800 bg-stone-900 p-3 text-stone-300">
            {t.schedule.title}
          </a>
          <a href="/dashboard/days" className="rounded-lg border border-stone-800 bg-stone-900 p-3 text-stone-300">
            {t.dashboard.manageDay}
          </a>
        </nav>
      </main>
    </div>
  );
}

async function DayView({
  provider,
  date,
  today,
  maxDate,
}: {
  provider: ProviderContext;
  date: string;
  today: string;
  maxDate: string;
}) {
  const bookings = await getDayBookings(provider, date);
  const stats = await getDayStats(provider, date, bookings);

  return (
    <section>
      <DateNav provider={provider} view="day" date={date} step={1} today={today} maxDate={maxDate} label={dayLabel(date, provider.timezone)} />

      <div className="mb-5 flex gap-4 rounded-lg border border-stone-800 bg-stone-900 px-4 py-3 text-sm">
        <span><b className="text-amber-300">{stats.count}</b> {t.dashboard.statBookings}</span>
        <span><b className="text-amber-300">{euros(stats.valueCents)}</b> {t.dashboard.statValue}</span>
        <span><b className="text-amber-300">{stats.gaps}</b> {t.dashboard.statGaps}</span>
      </div>

      {bookings.length === 0 ? (
        <p className="text-sm text-stone-500">{t.dashboard.noBookingsDay}</p>
      ) : (
        <ul className="space-y-2">
          {bookings.map((b) => (
            <li key={b.id}>
              <a
                href={`/dashboard/booking/${b.id}`}
                className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-900 px-4 py-3"
              >
                <span>
                  <span className="font-mono text-amber-300">{b.timeText}</span>
                  <span className="ml-3 font-serif">{b.clientName}</span>
                  <span className="block text-xs text-stone-400">{b.serviceName}</span>
                </span>
                <span className="text-right">
                  {b.status === "no_show" && (
                    <span className="block text-xs text-red-400">{t.dashboard.noShowBadge}</span>
                  )}
                  {b.isPast && b.status !== "no_show" && (
                    <span className="block text-xs text-stone-500">{t.dashboard.pastBadge}</span>
                  )}
                  <span className="font-mono text-sm text-stone-300">{euros(b.priceCents)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
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
                d.date === today ? "border-amber-400/50 bg-stone-900" : "border-stone-800 bg-stone-900"
              }`}
            >
              <span className="font-serif">{dayLabel(d.date, provider.timezone)}</span>
              <span className="text-sm">
                {d.count > 0 ? (
                  <>
                    <span className="font-mono text-amber-300">{d.count}</span>
                    <span className="ml-2 font-mono text-stone-400">{euros(d.valueCents)}</span>
                  </>
                ) : (
                  <span className="text-stone-600">—</span>
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
        <a href={`/dashboard?view=month&date=${prevMonth}`} className="rounded px-3 py-1 text-stone-400">←</a>
        <span className="font-serif">{monthLabel}</span>
        <a href={`/dashboard?view=month&date=${nextMonth}`} className="rounded px-3 py-1 text-stone-400">→</a>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-xs text-stone-600">{d}</span>
        ))}
        {cells.map((cell, i) =>
          cell === null ? (
            <span key={`e${i}`} />
          ) : (
            <a
              key={cell}
              href={`/dashboard?view=day&date=${cell}`}
              className={`rounded-lg py-2 text-sm ${
                cell === today ? "bg-amber-400 font-semibold text-stone-950" : "border border-stone-800 bg-stone-900 text-stone-300"
              }`}
            >
              {Number(cell.slice(-2))}
              {counts.get(cell) ? (
                <span className="block text-[10px] text-amber-300">{counts.get(cell)}</span>
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
      <a href={`/dashboard?view=${view}&date=${prev}`} className="rounded px-3 py-1 text-stone-400">←</a>
      <span className="text-center">
        <span className="block font-serif">{label}</span>
        {date !== today && (
          <a href={`/dashboard?view=${view}&date=${today}`} className="text-xs text-amber-400 underline">
            {t.dashboard.today}
          </a>
        )}
      </span>
      {nextAllowed ? (
        <a href={`/dashboard?view=${view}&date=${next}`} className="rounded px-3 py-1 text-stone-400">→</a>
      ) : (
        <span className="px-3 py-1 text-stone-700">→</span>
      )}
    </div>
  );
}
