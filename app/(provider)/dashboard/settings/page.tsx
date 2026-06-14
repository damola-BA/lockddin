import { createServerSupabase } from "@/lib/db/server";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: provider } = await supabase
    .from("providers")
    .select(
      "business_name, provider_name, city, slug, location_text, booking_window, cancellation_window_hours, min_lead_time_minutes, global_buffer_minutes",
    )
    .eq("id", user!.id)
    .single();

  if (!provider) return null;

  return <SettingsForm initial={provider} />;
}
