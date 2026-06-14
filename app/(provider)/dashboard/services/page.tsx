import { createServerSupabase } from "@/lib/db/server";
import { getDictionary } from "@/lib/i18n";
import { PageTitle, Hint } from "@/components/provider/ui";
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
      "id, name, duration_minutes, price_cents, buffer_minutes, prep_instructions, is_active, sort_order",
    )
    .eq("provider_id", user!.id)
    .order("sort_order");

  return (
    <div className="min-h-dvh bg-stone-950 text-stone-100">
      <main className="mx-auto w-full max-w-md px-5 py-10">
        <a href="/dashboard" className="text-sm text-stone-400 underline">
          ← Dashboard
        </a>
        <div className="mt-4">
          <PageTitle>{t.settings.servicesTitle}</PageTitle>
          <Hint>{t.settings.servicesIntro}</Hint>
        </div>
        <ServicesEditor services={(services ?? []) as Service[]} />
      </main>
    </div>
  );
}
