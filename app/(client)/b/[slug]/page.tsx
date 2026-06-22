import { getProviderBySlug } from "@/lib/booking/slots";
import { createAdminClient } from "@/lib/db/admin";
import { getDictionary, fill } from "@/lib/i18n";
import { ProviderBanner } from "@/components/provider/banner";
import { ThemeToggle } from "@/components/theme-toggle";
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
    .select("id, name, duration_minutes, price_cents, prep_instructions, photos")
    .eq("provider_id", provider.id)
    .eq("is_active", true)
    .order("sort_order");

  const normalizedServices = (services ?? []).map((s) => ({
    ...s,
    photos: Array.isArray(s.photos) ? (s.photos as string[]) : [],
  }));

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <main className="mx-auto w-full max-w-md px-5 py-10 lg:grid lg:max-w-[1080px] lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-14 lg:px-10 lg:py-14">
        {/* Context rail — provider banner + reassurance. Sticky beside the flow
            on desktop; stacked on top on phone/tablet. */}
        <aside className="lg:sticky lg:top-14">
          <div className="mb-3 flex justify-end">
            <ThemeToggle />
          </div>
          <ProviderBanner
            name={name}
            city={provider.city}
            bannerPath={provider.banner_path}
          />
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ok-l px-3 py-1 text-xs font-semibold text-ok">
            {fill(t.client.reassureTop, {
              hours: provider.cancellation_window_hours,
            })}
          </p>
          <footer className="mt-8 hidden border-t border-line pt-4 lg:block">
            <a href="/privacy" className="text-xs text-ink-4 underline">
              {t.client.privacy}
            </a>
          </footer>
        </aside>

        {/* Booking flow — the working pane. */}
        <div className="mt-8 lg:mt-0">
          <BookingFlow
            slug={slug}
            cancellationWindowHours={provider.cancellation_window_hours}
            services={normalizedServices}
          />
          <footer className="mt-12 border-t border-line pt-4 text-center lg:hidden">
            <a href="/privacy" className="text-xs text-ink-4 underline">
              {t.client.privacy}
            </a>
          </footer>
        </div>
      </main>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <main className="mx-auto w-full max-w-md px-5 py-10">{children}</main>
    </div>
  );
}
