import { createServerSupabase } from "@/lib/db/server";
import { BannerUpload } from "@/components/provider/banner-upload";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: provider } = await supabase
    .from("providers")
    .select(
      "business_name, provider_name, city, slug, location_text, booking_window, cancellation_window_hours, min_lead_time_minutes, global_buffer_minutes, banner_path",
    )
    .eq("id", user!.id)
    .single();

  if (!provider) return null;

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <main className="mx-auto w-full max-w-md px-5 py-10 space-y-10">
        <a href="/dashboard" className="text-sm text-ink-3 underline">← Dashboard</a>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-4">Booking page banner</p>
          <BannerUpload
            currentPath={provider.banner_path}
            providerName={provider.business_name ?? provider.provider_name ?? ""}
            city={provider.city}
          />
        </section>

        <SettingsForm initial={provider} />
      </main>
    </div>
  );
}
