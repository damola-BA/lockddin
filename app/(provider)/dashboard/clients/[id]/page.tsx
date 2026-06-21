import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import {
  getProviderContext,
  getClientDetail,
  searchClients,
} from "@/lib/dashboard/queries";
import {
  ClientsMasterDetail,
  Avatar,
} from "@/components/provider/clients-master-detail";
import { DeleteClient } from "./delete-client";

const t = getDictionary();

function euros(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q = "" } = await searchParams;
  const provider = await getProviderContext();
  if (!provider) return null;
  const [clients, client] = await Promise.all([
    searchClients(provider, q),
    getClientDetail(provider, id),
  ]);
  if (!client) notFound();

  return (
    <ClientsMasterDetail
      clients={clients}
      q={q}
      selectedId={id}
      exportHref="/dashboard/clients/export"
      businessName={provider.businessName}
    >
      {/* Phone-only back link (desktop keeps the list pane beside this). */}
      <a
        href={`/dashboard/clients${q ? `?q=${encodeURIComponent(q)}` : ""}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-3 md:hidden"
      >
        <ChevronLeft size={15} strokeWidth={2.2} /> {t.dashboard.clientsTitle}
      </a>

      <div className="flex items-center gap-3.5">
        <Avatar id={client.id} name={client.firstName} size={54} />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-[22px] font-semibold leading-tight md:text-2xl">
            {client.firstName}
          </h1>
          <p className="truncate text-[13px] text-ink-3">{client.email}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2.5 md:gap-3">
        <Stat label={t.dashboard.bookingsCount} value={String(client.bookingCount)} />
        <Stat label={t.dashboard.totalValue} value={euros(client.totalValueCents)} />
        <Stat
          label={t.dashboard.noShows}
          value={String(client.noShowCount)}
          danger={client.noShowCount > 0}
        />
      </div>

      <h2 className="mb-2.5 mt-7 font-serif text-[17px] font-semibold">{t.dashboard.history}</h2>
      {client.history.length === 0 ? (
        <p className="text-sm text-ink-3">—</p>
      ) : (
        <ul className="space-y-2">
          {client.history.map((h) => {
            const cancelled = h.status.startsWith("cancelled");
            return (
              <li
                key={h.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-3"
              >
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold tabular text-ink">{h.whenText}</span>
                  <span className="block truncate text-[12px] text-ink-3">{h.serviceName}</span>
                </span>
                {h.status === "no_show" ? (
                  <span className="shrink-0 text-[11px] font-semibold text-accent">{t.dashboard.noShowBadge}</span>
                ) : cancelled ? (
                  <span className="shrink-0 text-[11.5px] text-faint">cancelled</span>
                ) : (
                  <span className="shrink-0 text-[13px] font-bold tabular text-ink-2">{euros(h.valueCents)}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <DeleteClient clientId={client.id} />
    </ClientsMasterDetail>
  );
}

function Stat({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5 text-center">
      <p className={`font-serif text-[22px] font-semibold tabular ${danger ? "text-red-600" : "text-accent"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[11.5px] text-ink-3">{label}</p>
    </div>
  );
}
