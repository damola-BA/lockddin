import { Check, Mail } from "lucide-react";
import { getProviderBySlug } from "@/lib/booking/slots";
import { createAdminClient } from "@/lib/db/admin";
import { getDictionary, fill } from "@/lib/i18n";
import { ThemeToggle } from "@/components/theme-toggle";
import { storageUrl } from "@/lib/storage-url";
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

  const cancelChip = fill(t.client.cancelChip, {
    hours: provider.cancellation_window_hours,
  });

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <div className="lg:mx-auto lg:max-w-[1140px] lg:px-7 lg:py-9">
        {/* Editorial split — a brand stage beside the booking flow. On phone the
            stage collapses to a hero banner stacked above the flow. */}
        <div className="lg:flex lg:min-h-[720px] lg:items-stretch lg:overflow-hidden lg:rounded-[24px] lg:border lg:border-line lg:bg-surface lg:shadow-[0_30px_70px_-42px_rgba(74,46,28,.5)]">
          {/* Brand stage */}
          <aside className="relative h-[230px] w-full shrink-0 overflow-hidden bg-surface-2 lg:h-auto lg:w-[432px]">
            {provider.banner_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={storageUrl(provider.banner_path)} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                className="h-full w-full"
                style={{ background: "linear-gradient(135deg, #c98a5e 0%, #9a5a34 100%)" }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

            <div className="absolute right-5 top-5 z-10 [&_button]:border-white/30 [&_button]:bg-white/15 [&_button]:text-white [&_button]:backdrop-blur">
              <ThemeToggle />
            </div>

            <div className="absolute inset-x-7 bottom-7">
              {provider.city && (
                <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-white/70">
                  {provider.city}
                </p>
              )}
              <h1 className="font-serif text-[34px] font-semibold leading-none tracking-[-0.01em] text-white lg:text-[40px]">
                {name}
              </h1>
              <div className="mt-5 hidden flex-wrap gap-2.5 lg:flex">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-[12px] font-semibold text-white backdrop-blur">
                  <Check size={13} strokeWidth={2.4} /> {cancelChip}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-[12px] font-semibold text-white backdrop-blur">
                  <Mail size={13} strokeWidth={2.2} /> {t.client.noAccountChip}
                </span>
              </div>
            </div>
          </aside>

          {/* Flow pane */}
          <div className="mx-auto w-full max-w-md px-5 py-8 lg:mx-0 lg:flex lg:max-w-none lg:flex-1 lg:flex-col lg:px-12 lg:py-11">
            {/* Mobile trust strip — the stage chips live on the photo at lg+. */}
            <div className="mb-5 flex flex-wrap items-center gap-2.5 lg:hidden">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-l px-3 py-1.5 text-[12px] font-semibold text-ok">
                <Check size={13} strokeWidth={2.4} /> {cancelChip}
              </span>
              <span className="text-[12px] font-medium text-ink-3">{t.client.noAccountChip}</span>
            </div>

            <BookingFlow
              slug={slug}
              cancellationWindowHours={provider.cancellation_window_hours}
              services={normalizedServices}
            />

            <footer className="mt-12 border-t border-line pt-4 text-center lg:mt-auto lg:pt-6 lg:text-left">
              <a href="/privacy" className="text-xs text-ink-4 underline">
                {t.client.privacy}
              </a>
            </footer>
          </div>
        </div>
      </div>
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
