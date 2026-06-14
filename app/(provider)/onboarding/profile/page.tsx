import { createServerSupabase } from "@/lib/db/server";
import { ProfileForm } from "./profile-form";

export default async function ProfileStep() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Prefill on resume (row exists when the provider re-enters this step).
  const { data: provider } = await supabase
    .from("providers")
    .select("business_name, provider_name, city, slug, location_text")
    .eq("id", user!.id)
    .maybeSingle();

  return <ProfileForm initial={provider} />;
}
