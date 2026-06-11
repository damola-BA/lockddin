import { createServerSupabase } from "@/lib/db/server";
import { getDictionary } from "@/lib/i18n";
import { TemplateEditor, type TemplateDayData } from "./template-editor";
import { FlexibleBatchAdd } from "./flexible-batch-add";

const t = getDictionary();

export default async function SchedulePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: provider } = await supabase
    .from("providers")
    .select("schedule_type")
    .eq("id", user!.id)
    .single();

  const { data: services } = await supabase
    .from("services")
    .select("id, name")
    .eq("provider_id", user!.id)
    .eq("is_active", true)
    .order("sort_order");

  const { data: days } = await supabase
    .from("week_template_days")
    .select(
      "id, weekday, start_time, end_time, daily_cap, service_ids, reserved_blocks (id, start_time, end_time, label)",
    )
    .eq("provider_id", user!.id)
    .order("weekday");

  const dayData: TemplateDayData[] = (days ?? []).map((d) => ({
    weekday: d.weekday,
    start: d.start_time.slice(0, 5),
    end: d.end_time.slice(0, 5),
    dailyCap: d.daily_cap,
    serviceIds: d.service_ids,
    blocks: (d.reserved_blocks ?? []).map((b) => ({
      start: b.start_time.slice(0, 5),
      end: b.end_time.slice(0, 5),
      label: b.label ?? "",
    })),
  }));

  return (
    <div className="min-h-dvh bg-stone-950 text-stone-100">
      <main className="mx-auto w-full max-w-md px-5 py-10">
        <a href="/dashboard" className="text-sm text-stone-400 underline">
          ← Dashboard
        </a>
        {provider?.schedule_type === "flexible" ? (
          <FlexibleBatchAdd />
        ) : (
          <TemplateEditor days={dayData} services={services ?? []} />
        )}
      </main>
    </div>
  );
}
