import { createServerSupabase } from "@/lib/db/server";
import { BannerUpload } from "@/components/provider/banner-upload";
import { ProfileForm } from "./profile-form";

export default async function ProfileStep() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Prefill on resume (row exists when the provider re-enters this step).
  const { data: provider } = await supabase
    .from("providers")
    .select("business_name, provider_name, city, slug, location_text, banner_path")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <>
      <ProfileForm initial={provider} />
      {provider && (
        <div className="mx-auto w-full max-w-md px-5 pb-10 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-4">
            Booking page banner
          </p>
          <p className="text-sm text-ink-3">
            This appears at the top of your booking page. Skip it for now — you can always change it in Settings.
          </p>
          <BannerUpload
            currentPath={provider.banner_path}
            providerName={provider.business_name ?? provider.provider_name ?? ""}
            city={provider.city}
          />
        </div>
      )}
    </>
  );
}
