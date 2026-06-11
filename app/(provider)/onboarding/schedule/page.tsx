import { createServerSupabase } from "@/lib/db/server";
import { ScheduleStep } from "./schedule-step";

export default async function SchedulePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: provider } = await supabase
    .from("providers")
    .select("email, schedule_type, email_verified_at")
    .eq("id", user!.id)
    .single();

  return (
    <ScheduleStep
      email={provider?.email ?? ""}
      initialType={provider?.schedule_type ?? "regular"}
      emailVerified={Boolean(provider?.email_verified_at)}
    />
  );
}
