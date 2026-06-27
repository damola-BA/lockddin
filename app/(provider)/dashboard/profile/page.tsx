import { createServerSupabase } from "@/lib/db/server";
import { Globe, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { appUrl } from "@/lib/app-url";
import { getDictionary } from "@/lib/i18n";
import { BannerUpload } from "@/components/provider/banner-upload";
import { BookingLinkCard } from "@/components/provider/booking-link";
import { WorkstationShell } from "@/components/provider/workstation-shell";
import { ProfileDetails } from "./profile-details";

const t = getDictionary();

export default async function ProfilePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: provider } = await supabase
    .from("providers")
    .select("business_name, provider_name, city, slug, location_text, banner_path")
    .eq("id", user!.id)
    .single();

  if (!provider) return null;

  const businessName = provider.business_name ?? provider.provider_name ?? "";
  const bookingUrl = appUrl(`/b/${provider.slug}`);

  return (
    <WorkstationShell active="profile" businessName={businessName} bleed>
      <div className="mx-auto w-full max-w-[1100px] space-y-4 md:space-y-5">
        {/* Banner hero — identity overlaid on the booking-page banner. */}
        <BannerUpload
          currentPath={provider.banner_path}
          providerName={businessName}
          city={provider.city}
        />

        {/* Booking link strip — the provider's most-shared asset. */}
        <BookingLinkCard url={bookingUrl} businessName={businessName} viewUrl={bookingUrl} />

        {/* Details + account. */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-10">
          <ProfileDetails initial={provider} />

          <aside className="mt-4 lg:mt-0">
            <div className="rounded-[18px] border border-line bg-surface p-1.5">
              <div className="flex items-center gap-3 rounded-[13px] px-3 py-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-surface-2 text-ink-3">
                  <Globe size={15} strokeWidth={1.7} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-ink">{t.profile.language}</span>
                  <span className="mt-0.5 block text-[12px] text-ink-3">{t.profile.languageValue}</span>
                </span>
              </div>
              <div className="mx-3 my-0.5 h-px bg-line-2" />
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-[13px] px-3 py-3 text-left hover:bg-surface-2"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-surface-2 text-accent">
                    <LogOut size={15} strokeWidth={1.9} />
                  </span>
                  <span className="text-[13.5px] font-semibold text-ink">{t.auth.signOut}</span>
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </WorkstationShell>
  );
}
