import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { getProviderContext, getBookingDetail } from "@/lib/dashboard/queries";
import { BookingActions } from "./booking-actions";

const t = getDictionary();

function euros(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const provider = await getProviderContext();
  if (!provider) return null;
  const booking = await getBookingDetail(provider, id);
  if (!booking) notFound();

  const cancelled = booking.status.startsWith("cancelled");

  return (
    <div className="min-h-dvh bg-stone-950 text-stone-100">
      <main className="mx-auto w-full max-w-md px-5 py-8">
        <a href="/dashboard" className="text-sm text-stone-400 underline">
          ← {t.dashboard.viewDay}
        </a>

        <h1 className="mt-4 mb-1 font-serif text-2xl">{booking.clientName}</h1>
        <p className="mb-6 font-mono text-sm text-stone-400">{booking.clientPhone}</p>

        <dl className="space-y-3 rounded-xl border border-stone-800 bg-stone-900 p-4 text-sm">
          <Row label={t.dashboard.service} value={booking.serviceName} />
          <Row label={t.dashboard.when} value={booking.whenText} />
          <Row label={t.dashboard.price} value={euros(booking.priceCents)} />
          <Row
            label={t.dashboard.source}
            value={booking.source === "manual" ? t.dashboard.sourceManual : t.dashboard.sourceClient}
          />
          <Row label={t.dashboard.visits} value={String(booking.visitCount)} />
        </dl>

        {booking.status === "no_show" && (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {t.dashboard.markedNoShow}
          </p>
        )}
        {cancelled && (
          <p className="mt-4 rounded-lg border border-stone-700 p-3 text-sm text-stone-400">
            {t.client.cancelled}
          </p>
        )}

        {!cancelled && (
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
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-right text-stone-200">{value}</dd>
    </div>
  );
}
