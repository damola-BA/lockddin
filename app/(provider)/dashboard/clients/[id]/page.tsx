import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarCheck, ChevronLeft, Mail, Plus, Star } from "lucide-react";
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
import { CopyEmail } from "@/components/provider/copy-email";
import { DeleteClient } from "./delete-client";

const t = getDictionary();

const REGULAR_THRESHOLD = 8;

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

  const isRegular = client.bookingCount >= REGULAR_THRESHOLD;

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
        className="mb-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-3 md:hidden"
      >
        <ChevronLeft size={15} strokeWidth={2.2} /> {t.dashboard.clientsTitle}
      </a>

      {/* Identity */}
      <div className="flex items-start gap-4">
        <span className="shrink-0 rounded-full ring-1 ring-line ring-offset-2 ring-offset-surface">
          <Avatar id={client.id} name={client.firstName} size={58} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h1 className="font-serif text-[26px] font-semibold leading-none tracking-[-0.01em] text-ink">
              {client.firstName}
            </h1>
            {isRegular && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f7eede] px-2.5 py-1 text-[11px] font-bold text-[#b08400]">
                <Star size={11} strokeWidth={0} fill="currentColor" /> {t.dashboard.regular}
              </span>
            )}
          </div>
          <div className="mt-2">
            <CopyEmail email={client.email} />
          </div>
        </div>
      </div>

      {/* Primary actions */}
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <Link
          href="/dashboard/booking/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-ctrl px-4 py-3 text-[13.5px] font-bold text-ctrl-ink transition hover:brightness-110"
        >
          <Plus size={16} strokeWidth={2.3} /> {t.dashboard.newBookingCta}
        </Link>
        <a
          href={`mailto:${client.email}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-[13.5px] font-bold text-ink-2 transition hover:bg-surface-2"
        >
          <Mail size={15} strokeWidth={2} /> {t.dashboard.emailClient}
        </a>
      </div>

      {/* Next appointment — the one thing you most want to see. */}
      {client.nextAppointment && (
        <div className="mt-5 flex items-center gap-3.5 rounded-2xl border-[1.5px] border-accent bg-accent-l/60 px-4 py-3.5 [box-shadow:0_0_0_3px_var(--accent-l)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
            <CalendarCheck size={18} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-accent">
              {t.dashboard.nextAppt}
            </p>
            <p className="mt-1 truncate font-serif text-[15px] font-semibold text-ink tabular">
              {client.nextAppointment.whenText}
            </p>
            <p className="truncate text-[12.5px] text-ink-3">{client.nextAppointment.serviceName}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-line bg-surface">
        <Stat label={t.dashboard.bookingsCount} value={String(client.bookingCount)} />
        <Stat label={t.dashboard.totalValue} value={euros(client.totalValueCents)} divider />
        <Stat
          label={t.dashboard.noShows}
          value={String(client.noShowCount)}
          danger={client.noShowCount > 0}
          divider
        />
      </div>

      {/* History */}
      <h2 className="mb-3 mt-8 font-serif text-[17px] font-semibold">{t.dashboard.history}</h2>
      {client.history.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-3">
          —
        </p>
      ) : (
        <ol className="relative space-y-1 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-line-2">
          {client.history.map((h) => {
            const cancelled = h.status.startsWith("cancelled");
            const dot = h.isUpcoming
              ? "bg-accent"
              : h.status === "no_show"
                ? "bg-no"
                : cancelled
                  ? "bg-faint"
                  : "bg-desk";
            return (
              <li key={h.id} className="relative flex items-center gap-3.5 py-2 pl-5">
                <span className={`absolute left-0 top-1/2 h-[11px] w-[11px] -translate-y-1/2 rounded-full ring-2 ring-canvas ${dot}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={`text-[13.5px] font-semibold tabular ${h.isUpcoming ? "text-ink" : "text-ink-2"}`}>
                      {h.whenText}
                    </span>
                    {h.isUpcoming && (
                      <span className="rounded-full bg-accent-l px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.04em] text-accent">
                        {t.dashboard.upcomingTag}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[12px] text-ink-3">{h.serviceName}</span>
                </span>
                {h.status === "no_show" ? (
                  <span className="shrink-0 text-[11px] font-bold text-no">{t.dashboard.noShowBadge}</span>
                ) : cancelled ? (
                  <span className="shrink-0 text-[11.5px] text-faint">cancelled</span>
                ) : (
                  <span className="shrink-0 text-[13px] font-bold tabular text-ink-2">{euros(h.valueCents)}</span>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <DeleteClient clientId={client.id} />
    </ClientsMasterDetail>
  );
}

function Stat({
  label,
  value,
  danger,
  divider,
}: {
  label: string;
  value: string;
  danger?: boolean;
  divider?: boolean;
}) {
  return (
    <div className={`px-3 py-3.5 text-center ${divider ? "border-l border-line-2" : ""}`}>
      <p className={`font-serif text-[22px] font-semibold leading-none tabular ${danger ? "text-no" : "text-ink"}`}>
        {value}
      </p>
      <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-ink-4">{label}</p>
    </div>
  );
}
