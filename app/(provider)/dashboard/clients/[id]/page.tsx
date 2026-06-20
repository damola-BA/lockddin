import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { getProviderContext, getClientDetail } from "@/lib/dashboard/queries";
import { PanelPage } from "@/components/provider/panel-page";
import { DeleteClient } from "./delete-client";

const t = getDictionary();

function euros(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const provider = await getProviderContext();
  if (!provider) return null;
  const client = await getClientDetail(provider, id);
  if (!client) notFound();

  return (
    <PanelPage>
        <a href="/dashboard/clients" className="text-sm text-ink-3 underline">
          ← {t.dashboard.clientsTitle}
        </a>

        <h1 className="mt-4 mb-1 font-serif text-2xl">{client.firstName}</h1>
        <p className="mb-6 text-sm text-ink-3 tabular">{client.email}</p>

        <div className="mb-6 grid grid-cols-3 gap-2 text-center">
          <Stat label={t.dashboard.bookingsCount} value={String(client.bookingCount)} />
          <Stat label={t.dashboard.totalValue} value={euros(client.totalValueCents)} />
          <Stat label={t.dashboard.noShows} value={String(client.noShowCount)} danger={client.noShowCount > 0} />
        </div>

        <h2 className="mb-2 font-serif text-lg">{t.dashboard.history}</h2>
        {client.history.length === 0 ? (
          <p className="text-sm text-ink-3">—</p>
        ) : (
          <ul className="space-y-2">
            {client.history.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-mono text-ink-2">{h.whenText}</span>
                  <span className="block text-xs text-ink-3">{h.serviceName}</span>
                </span>
                {h.status === "no_show" && <span className="text-xs text-red-600">{t.dashboard.noShowBadge}</span>}
                {h.status.startsWith("cancelled") && <span className="text-xs text-ink-4">cancelled</span>}
              </li>
            ))}
          </ul>
        )}

        <DeleteClient clientId={client.id} />
    </PanelPage>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <p className={`font-mono text-lg ${danger ? "text-red-600" : "text-accent"}`}>{value}</p>
      <p className="text-xs text-ink-3">{label}</p>
    </div>
  );
}
