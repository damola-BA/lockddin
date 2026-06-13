import { getDictionary } from "@/lib/i18n";
import { getProviderContext, searchClients } from "@/lib/dashboard/queries";

const t = getDictionary();

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const provider = await getProviderContext();
  if (!provider) return null;
  const clients = await searchClients(provider, q);

  return (
    <div className="min-h-dvh bg-stone-950 text-stone-100">
      <main className="mx-auto w-full max-w-md px-5 py-8">
        <div className="mb-4 flex items-center justify-between">
          <a href="/dashboard" className="text-sm text-stone-400 underline">
            ← {t.dashboard.viewDay}
          </a>
          <a href="/dashboard/clients/export" className="text-sm text-amber-400 underline">
            {t.dashboard.exportCsv}
          </a>
        </div>

        <h1 className="mb-4 font-serif text-2xl">{t.dashboard.clientsTitle}</h1>

        <form method="get" className="mb-5">
          <input
            name="q"
            defaultValue={q}
            placeholder={t.dashboard.clientsSearch}
            className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-stone-100 placeholder:text-stone-600"
          />
        </form>

        {clients.length === 0 ? (
          <p className="text-sm text-stone-500">{t.dashboard.clientsEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {clients.map((c) => (
              <li key={c.id}>
                <a
                  href={`/dashboard/clients/${c.id}`}
                  className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-900 px-4 py-3"
                >
                  <span>
                    <span className="font-serif">{c.firstName}</span>
                    <span className="block font-mono text-xs text-stone-400">{c.phone}</span>
                  </span>
                  <span className="text-right text-xs text-stone-400">
                    <span className="font-mono text-stone-300">{c.bookingCount}</span> {t.dashboard.statBookings}
                    {c.noShowCount > 0 && (
                      <span className="block text-red-400">{c.noShowCount} {t.dashboard.noShows}</span>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
