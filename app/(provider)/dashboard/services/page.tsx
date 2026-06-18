import { createServerSupabase } from "@/lib/db/server";
import { getDictionary } from "@/lib/i18n";
import { PageTitle, Hint } from "@/components/provider/ui";
import { PanelPage } from "@/components/provider/panel-page";
import { ServicesEditor, type Service } from "@/components/provider/services-editor";

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

  return (
    <PanelPage>
      <a href="/dashboard" className="text-sm text-ink-3 underline">
        ← Dashboard
      </a>
      <div className="mt-4">
        <PageTitle>{t.settings.servicesTitle}</PageTitle>
        <Hint>{t.settings.servicesIntro}</Hint>
      </div>
      <ServicesEditor
        services={(services ?? []).map((s) => ({
          ...s,
          photos: Array.isArray(s.photos) ? (s.photos as string[]) : [],
        }))}
      />
    </PanelPage>
  );
}
