import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getServerDict } from "@/lib/i18n/server";
import { getProviderContext, getBookingDetail } from "@/lib/dashboard/queries";
import { WorkstationShell } from "@/components/provider/workstation-shell";
import { Avatar } from "@/components/provider/clients-master-detail";
import { BookingActions } from "./booking-actions";
import { euros } from "@/lib/format";


export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getServerDict();
  const { id } = await params;
  const provider = await getProviderContext();
  if (!provider) return null;
  const booking = await getBookingDetail(provider, id);
  if (!booking) notFound();

  const cancelled = booking.status.startsWith("cancelled");
  const noShow = booking.status === "no_show";

  // The one element that always stays in view (handoff AD: status pill).
  const status = cancelled
    ? { label: t.dashboard.cancelledBadge, cls: "bg-surface-2 text-ink-3" }
    : noShow
      ? { label: t.dashboard.noShowBadge, cls: "bg-red-50 text-red-600", dot: "bg-red-500" }
      : booking.isPast
        ? { label: t.dashboard.pastBadge, cls: "bg-surface-2 text-ink-3" }
        : { label: t.dashboard.statusUpcoming, cls: "bg-accent-l text-accent", dot: "bg-accent" };

  return (
    <WorkstationShell active="schedule" businessName={provider.businessName} maxWidth="560px">
      <a
        href="/dashboard"
        className="mb-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-3"
      >
        <ChevronLeft size={15} strokeWidth={2.2} /> {t.settings.back}
      </a>

      <div className="flex items-center gap-3.5">
        <Avatar id={booking.clientEmail} name={booking.clientName} size={54} />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-[22px] font-semibold leading-tight">{booking.clientName}</h1>
          <p className="truncate text-[13px] text-ink-3">{booking.clientEmail}</p>
        </div>
      </div>

      <span
        className={`mt-3.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-bold ${status.cls}`}
      >
        {status.dot && <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />}
        {status.label}
      </span>

      <dl className="mt-4 rounded-2xl border border-line bg-surface px-4">
        <Row label={t.dashboard.service} value={booking.serviceName} />
        <Row label={t.dashboard.when} value={booking.whenText} />
        <Row label={t.dashboard.price} value={euros(booking.priceCents)} />
        <Row
          label={t.dashboard.source}
          value={booking.source === "manual" ? t.dashboard.sourceManual : t.dashboard.sourceClient}
        />
        <Row label={t.dashboard.visits} value={String(booking.visitCount)} />
      </dl>

      {cancelled ? (
        <p className="mt-4 rounded-xl border border-line bg-surface-2 p-3.5 text-sm text-ink-3">
          {t.client.cancelled}
        </p>
      ) : (
        <BookingActions
          bookingId={booking.id}
          providerId={provider.id}
          serviceIds={booking.serviceIds}
          slug={provider.slug}
          clientName={booking.clientName}
          businessName={provider.businessName}
          serviceName={booking.serviceName}
          whenText={booking.whenText}
          isPast={booking.isPast}
          isNoShow={booking.status === "no_show"}
          timezone={provider.timezone}
        />
      )}
    </WorkstationShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <dt className="text-[13.5px] text-ink-3">{label}</dt>
      <dd className="text-right text-sm font-semibold tabular text-ink">{value}</dd>
    </div>
  );
}
