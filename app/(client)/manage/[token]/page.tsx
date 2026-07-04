import { formatInTimeZone } from "date-fns-tz";
import { createAdminClient } from "@/lib/db/admin";
import { checkManageToken } from "@/lib/booking/manage-token";
import { resolveServiceSet } from "@/lib/booking/service-set";
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
    return <Shell><p className="text-ink-3">{t.client.linkExpired}</p></Shell>;
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select(
      "id, starts_at, status, cancellation_window_hours, provider_id, service_ids, providers (slug, business_name, provider_name, email, timezone, location_text), clients (first_name)",
    )
    .eq("manage_token", token)
    .maybeSingle();

  if (!booking) {
    return <Shell><p className="text-ink-3">{t.client.linkExpired}</p></Shell>;
  }

  // Old links resolve to honest states instead of a blunt "expired" (DD21).
  const slugOf = (booking.providers as unknown as { slug: string }).slug;
  if (booking.status !== "confirmed") {
    return (
      <Shell>
        <p className="mb-4 text-ink-3">{t.client.linkCancelled}</p>
        <BookAgain slug={slugOf} />
      </Shell>
    );
  }
  if (booking.starts_at <= new Date().toISOString()) {
    return (
      <Shell>
        <p className="mb-4 text-ink-3">{t.client.linkPast}</p>
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
  const client = booking.clients as unknown as { first_name: string };
  const serviceIds = (booking.service_ids as string[]) ?? [];
  const services = await resolveServiceSet(booking.provider_id as string, serviceIds);

  return (
    <Shell>
      <ManageBooking
        token={token}
        slug={provider.slug}
        businessName={provider.business_name ?? provider.provider_name ?? ""}
        providerEmail={provider.email}
        clientFirstName={client.first_name}
        serviceIds={serviceIds}
        serviceName={services.label}
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
      className="block w-full rounded-xl bg-ink px-4 py-3 text-center font-semibold text-canvas"
    >
      {t.client.bookAgain}
    </a>
  );
}

// A booking moment: full-bleed on phone; on desktop a fixed-measure card
// centered on a branded paper wash, wordmark above — intentional, not stranded.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas text-ink lg:flex lg:items-start lg:justify-center lg:bg-canvas-2 lg:px-6 lg:py-16 lg:[background-image:radial-gradient(120%_70%_at_50%_-20%,var(--canvas)_0%,var(--canvas-2)_75%)]">
      <main className="mx-auto w-full max-w-md px-5 py-10 lg:mx-0 lg:w-[440px] lg:px-0 lg:py-0">
        <div className="mb-5 hidden text-center text-[18px] font-extrabold tracking-[-0.02em] lg:block">
          Lock<span className="font-serif font-medium italic text-accent">d</span>Din
        </div>
        <div className="lg:rounded-[22px] lg:border lg:border-line lg:bg-surface lg:p-7 lg:shadow-[0_30px_60px_-34px_rgba(74,46,28,.4)]">
          {children}
        </div>
        <p className="mt-4 hidden text-center text-[12.5px] text-ink-3 lg:block">
          {t.client.manageNoAccount}
        </p>
      </main>
    </div>
  );
}
