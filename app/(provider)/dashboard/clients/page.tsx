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
    <div className="min-h-dvh bg-canvas text-ink">
      <main className="mx-auto w-full max-w-md px-5 py-8">
        <div className="mb-4 flex items-center justify-between">
          <a href="/dashboard" className="text-sm text-ink-3 underline">
            ← {t.dashboard.viewDay}
          </a>
          <a href="/dashboard/clients/export" className="text-sm text-accent underline">
            {t.dashboard.exportCsv}
          </a>
        </div>

        <h1 className="mb-4 font-serif text-2xl">{t.dashboard.clientsTitle}</h1>

        <form method="get" className="mb-5">
          <input
            name="q"
            defaultValue={q}
            placeholder={t.dashboard.clientsSearch}
            className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-ink placeholder:text-ink-4"
          />
        </form>

        {clients.length === 0 ? (
          <p className="text-sm text-ink-3">{t.dashboard.clientsEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {clients.map((c) => (
              <li key={c.id}>
                <a
                  href={`/dashboard/clients/${c.id}`}
                  className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3"
                >
                  <span>
                    <span className="font-serif">{c.firstName}</span>
                    <span className="block font-mono text-xs text-ink-3">{c.phone}</span>
                  </span>
                  <span className="text-right text-xs text-ink-3">
                    <span className="font-mono text-ink-2">{c.bookingCount}</span> {t.dashboard.statBookings}
                    {c.noShowCount > 0 && (
                      <span className="block text-red-600">{c.noShowCount} {t.dashboard.noShows}</span>
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
