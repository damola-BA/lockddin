import { getDictionary } from "@/lib/i18n";
import { getProviderContext, searchClients } from "@/lib/dashboard/queries";
import { ClientsMasterDetail } from "@/components/provider/clients-master-detail";

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
    <ClientsMasterDetail
      clients={clients}
      q={q}
      selectedId={null}
      exportHref="/dashboard/clients/export"
      businessName={provider.businessName}
    >
      {/* Desktop-only empty state; on phone this pane is hidden until a client is opened. */}
      <div className="flex min-h-[360px] items-center justify-center text-center">
        <p className="max-w-[240px] text-sm text-ink-3">{t.dashboard.clientsSelectHint}</p>
      </div>
    </ClientsMasterDetail>
  );
}
