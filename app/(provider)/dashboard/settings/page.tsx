import { createServerSupabase } from "@/lib/db/server";
import { ChevronLeft } from "lucide-react";
import { BannerUpload } from "@/components/provider/banner-upload";
import { WorkstationShell } from "@/components/provider/workstation-shell";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: provider } = await supabase
    .from("providers")
    .select(
      "business_name, provider_name, city, slug, location_text, banner_path, schedule_type",
    )
    .eq("id", user!.id)
    .single();

  if (!provider) return null;

  const businessName = provider.business_name ?? provider.provider_name ?? "";

  return (
    <WorkstationShell active="settings" businessName={businessName} maxWidth="560px">
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

        <SettingsForm initial={provider} />
      </div>
    </WorkstationShell>
  );
}
