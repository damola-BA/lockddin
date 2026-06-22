import { createServerSupabase } from "@/lib/db/server";
import { ChevronLeft } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { WorkstationShell } from "@/components/provider/workstation-shell";
import { ManualBooking } from "./manual-booking";

const t = getDictionary();

export default async function NewBookingPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: services }, { data: provider }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_cents")
      .eq("provider_id", user!.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("providers")
      .select("business_name, provider_name")
      .eq("id", user!.id)
      .single(),
  ]);
  const businessName = provider?.business_name ?? provider?.provider_name ?? "";

  return (
    <WorkstationShell active="schedule" businessName={businessName} maxWidth="480px">
      <a
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-3 md:hidden"
      >
        <ChevronLeft size={15} strokeWidth={2.2} /> {t.settings.back}
      </a>
      <h1 className="mt-4 mb-6 font-serif text-2xl md:text-[28px]">{t.dashboard.walkInTitle}</h1>
      <ManualBooking services={services ?? []} />
    </WorkstationShell>
  );
}
