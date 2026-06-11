import { createServerSupabase } from "@/lib/db/server";
import { ServicesStep } from "./services-step";

export default async function ServicesPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: services } = await supabase
    .from("services")
    .select(
      "id, name, duration_minutes, price_cents, buffer_minutes, prep_instructions, is_active, sort_order",
    )
    .eq("provider_id", user!.id)
    .order("sort_order");

  return <ServicesStep services={services ?? []} />;
}
