import { getProviderBySlug } from "@/lib/booking/slots";
import { createAdminClient } from "@/lib/db/admin";
import { getDictionary, fill } from "@/lib/i18n";
import { BookingFlow } from "./booking-flow";

const t = getDictionary();

// The public booking page (F5). Warm paper, no account, must feel instant.
export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const provider = await getProviderBySlug(slug);

  if (!provider) {
    return (
      <Shell>
        <h1 className="font-serif text-2xl text-ink">Page not found</h1>
      </Shell>
    );
  }

  const name = provider.business_name ?? provider.provider_name ?? "";

  if (!provider.is_active) {
    return (
      <Shell>
        <h1 className="mb-2 font-serif text-2xl text-ink">
          {fill(t.client.closedTitle, { name })}
        </h1>
        <p className="text-ink-3">{t.client.closedBody}</p>
      </Shell>
    );
  }

  const admin = createAdminClient();
  const { data: services } = await admin
    .from("services")
    .select("id, name, duration_minutes, price_cents, prep_instructions")
    .eq("provider_id", provider.id)
    .eq("is_active", true)
    .order("sort_order");

  return (
    <Shell>
      <header className="mb-8">
        <h1 className="font-serif text-3xl text-ink">{name}</h1>
        {provider.city && (
          <p className="mt-1 text-sm text-ink-3">{provider.city}</p>
        )}
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sage px-3 py-1 text-xs font-medium text-ok">
          {fill(t.client.reassureTop, {
            hours: provider.cancellation_window_hours,
          })}
        </p>
      </header>
      <BookingFlow
        slug={slug}
        cancellationWindowHours={provider.cancellation_window_hours}
        services={services ?? []}
      />
      <footer className="mt-12 border-t border-line pt-4 text-center">
        <a href="/privacy" className="text-xs text-ink-4 underline">
          {t.client.privacy}
        </a>
      </footer>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#faf6f0] text-ink">
      <main className="mx-auto w-full max-w-md px-5 py-10">{children}</main>
    </div>
  );
}
