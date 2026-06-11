import { formatInTimeZone } from "date-fns-tz";
import { createAdminClient } from "@/lib/db/admin";
import { checkManageToken } from "@/lib/booking/manage-token";
import { getDictionary } from "@/lib/i18n";
import { ManageBooking } from "./manage-booking";

const t = getDictionary();

export default async function ManagePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const check = checkManageToken(token);
  if (check !== "valid") {
    return <Shell><p className="text-stone-600">{t.client.linkExpired}</p></Shell>;
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select(
      "id, starts_at, status, cancellation_window_hours, services (id, name, duration_minutes, price_cents), providers (slug, business_name, provider_name, email, timezone, location_text), clients (first_name)",
    )
    .eq("manage_token", token)
    .maybeSingle();

  if (!booking) {
    return <Shell><p className="text-stone-600">{t.client.linkExpired}</p></Shell>;
  }

  // Old links resolve to honest states instead of a blunt "expired" (DD21).
  const slugOf = (booking.providers as unknown as { slug: string }).slug;
  if (booking.status !== "confirmed") {
    return (
      <Shell>
        <p className="mb-4 text-stone-600">{t.client.linkCancelled}</p>
        <BookAgain slug={slugOf} />
      </Shell>
    );
  }
  if (booking.starts_at <= new Date().toISOString()) {
    return (
      <Shell>
        <p className="mb-4 text-stone-600">{t.client.linkPast}</p>
        <BookAgain slug={slugOf} />
      </Shell>
    );
  }

  const provider = booking.providers as unknown as {
    slug: string;
    business_name: string | null;
    provider_name: string | null;
    email: string;
    timezone: string;
    location_text: string | null;
  };
  const service = booking.services as unknown as {
    id: string;
    name: string;
    duration_minutes: number;
    price_cents: number;
  };
  const client = booking.clients as unknown as { first_name: string };

  return (
    <Shell>
      <ManageBooking
        token={token}
        slug={provider.slug}
        businessName={provider.business_name ?? provider.provider_name ?? ""}
        providerEmail={provider.email}
        clientFirstName={client.first_name}
        serviceId={service.id}
        serviceName={service.name}
        startsAt={booking.starts_at}
        whenText={formatInTimeZone(
          new Date(booking.starts_at),
          provider.timezone,
          "EEEE d MMMM yyyy 'at' HH:mm",
        )}
        cancellationWindowHours={booking.cancellation_window_hours}
      />
    </Shell>
  );
}

function BookAgain({ slug }: { slug: string }) {
  return (
    <a
      href={`/b/${slug}`}
      className="block w-full rounded-xl bg-stone-900 px-4 py-3 text-center font-semibold text-amber-50"
    >
      {t.client.bookAgain}
    </a>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#faf6f0] text-stone-800">
      <main className="mx-auto w-full max-w-md px-5 py-10">{children}</main>
    </div>
  );
}
