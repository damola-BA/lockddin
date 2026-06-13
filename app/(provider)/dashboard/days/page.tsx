import { getDictionary, fill } from "@/lib/i18n";
import {
  getProviderContext,
  getDayManager,
  todayLocal,
  maxNavDate,
} from "@/lib/dashboard/queries";
import { DayBookingsList } from "./day-bookings";
import { DaySettings } from "./day-settings";
import { DayOverrides } from "./day-overrides";

const t = getDictionary();

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function prettyDate(date: string, tz: string): string {
  return new Intl.DateTimeFormat("en-BE", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00Z`));
}

export default async function DaysPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const provider = await getProviderContext();
  if (!provider) return null;
  const today = todayLocal(provider.timezone);
  const date = dateParam ?? today;
  const maxDate = maxNavDate(provider);
  const data = await getDayManager(provider, date);

  const prev = addDays(date, -1);
  const next = addDays(date, 1);

  return (
    <div className="min-h-dvh bg-stone-950 text-stone-100">
      <main className="mx-auto w-full max-w-md px-5 py-8">
        <a href={`/dashboard?view=day&date=${date}`} className="text-sm text-stone-400 underline">
          ← {t.dashboard.viewDay}
        </a>

        <div className="mt-4 mb-6 flex items-center justify-between">
          <a href={`/dashboard/days?date=${prev}`} className="rounded px-3 py-1 text-stone-400">←</a>
          <span className="text-center">
            <span className="block font-serif text-lg">{prettyDate(date, provider.timezone)}</span>
            {date !== today && (
              <a href={`/dashboard/days?date=${today}`} className="text-xs text-amber-400 underline">
                {t.dashboard.today}
              </a>
            )}
          </span>
          {next <= maxDate ? (
            <a href={`/dashboard/days?date=${next}`} className="rounded px-3 py-1 text-stone-400">→</a>
          ) : (
            <span className="px-3 py-1 text-stone-700">→</span>
          )}
        </div>

        <section className="mb-8">
          <h2 className="mb-3 font-serif text-lg">{t.dashboard.statBookings}</h2>
          <DayBookingsList bookings={data.bookings} />
        </section>

        <section className="mb-8">
          <h2 className="mb-3 font-serif text-lg">{t.dashboard.daySettings}</h2>
          <DaySettings
            key={`${data.date}:${JSON.stringify(data.override)}`}
            date={date}
            data={data}
            scheduleType={provider.scheduleType}
          />
        </section>

        <details className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
          <summary className="cursor-pointer text-sm text-stone-300">
            {t.dashboard.rangeCloseTitle}
          </summary>
          <div className="mt-4">
            <DayOverrides
              scheduleType={provider.scheduleType}
              existing={[]}
            />
          </div>
        </details>
      </main>
    </div>
  );
}
