import { createServerSupabase } from "@/lib/db/server";
import { getDictionary } from "@/lib/i18n";
import { PanelPage } from "@/components/provider/panel-page";
import { ManualBooking } from "./manual-booking";

const t = getDictionary();

export default async function NewBookingPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_cents")
    .eq("provider_id", user!.id)
    .eq("is_active", true)
    .order("sort_order");

  return (
    <PanelPage>
      <a href="/dashboard" className="text-sm text-ink-3 underline">
        ← {t.dashboard.viewDay}
      </a>
      <h1 className="mt-4 mb-6 font-serif text-2xl">{t.dashboard.walkInTitle}</h1>
      <ManualBooking services={services ?? []} />
    </PanelPage>
  );
}
