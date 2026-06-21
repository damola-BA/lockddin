import { createServerSupabase } from "@/lib/db/server";
import { ChevronLeft } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { PageTitle, Hint } from "@/components/provider/ui";
import { WorkstationShell } from "@/components/provider/workstation-shell";
import { ServicesEditor } from "@/components/provider/services-editor";

const t = getDictionary();

export default async function ServicesPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: services } = await supabase
    .from("services")
    .select(
      "id, name, duration_minutes, price_cents, buffer_minutes, prep_instructions, is_active, sort_order, photos",
    )
    .eq("provider_id", user!.id)
    .order("sort_order");

  const { data: provider } = await supabase
    .from("providers")
    .select("business_name, provider_name")
    .eq("id", user!.id)
    .single();
  const businessName = provider?.business_name ?? provider?.provider_name ?? "";

  return (
    <WorkstationShell active="services" businessName={businessName} maxWidth="620px">
      <a
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-3 md:hidden"
      >
        <ChevronLeft size={15} strokeWidth={2.2} /> Dashboard
      </a>
      <div className="mt-4">
        <PageTitle>{t.settings.servicesTitle}</PageTitle>
        <Hint>{t.settings.servicesIntro}</Hint>
      </div>
      <ServicesEditor
        layout="grid"
        services={(services ?? []).map((s) => ({
          ...s,
          photos: Array.isArray(s.photos) ? (s.photos as string[]) : [],
        }))}
      />
    </WorkstationShell>
  );
}
