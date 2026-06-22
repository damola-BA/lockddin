import { createServerSupabase } from "@/lib/db/server";
import { ChevronLeft, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { getDictionary } from "@/lib/i18n";
import { BannerUpload } from "@/components/provider/banner-upload";
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

  return (
    <WorkstationShell active="profile" businessName={businessName} maxWidth="560px">
      <div className="space-y-10">
        <a
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-3 md:hidden"
        >
          <ChevronLeft size={15} strokeWidth={2.2} /> Dashboard
        </a>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-4">Booking page banner</p>
          <BannerUpload
            currentPath={provider.banner_path}
            providerName={businessName}
            city={provider.city}
          />
        </section>

        <ProfileDetails initial={provider} />

        {/* Phone-only sign out (desktop uses the account menu in the top bar). */}
        <div className="border-t border-line pt-6 md:hidden">
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-2.5 text-[14px] font-semibold text-ink-3"
            >
              <LogOut size={16} strokeWidth={1.9} /> {t.auth.signOut}
            </button>
          </form>
        </div>
      </div>
    </WorkstationShell>
  );
}
