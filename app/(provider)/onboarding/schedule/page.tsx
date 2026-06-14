import { createServerSupabase } from "@/lib/db/server";
import { ScheduleStep } from "./schedule-step";
import type { TemplateDayData } from "@/app/(provider)/dashboard/schedule/template-editor";

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
    <ScheduleStep
      initialType={provider?.schedule_type ?? "regular"}
      templateDays={dayData}
    />
  );
}
