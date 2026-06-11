import { createServerSupabase } from "@/lib/db/server";
import { getDictionary } from "@/lib/i18n";
import { DayOverrides } from "./day-overrides";
import { SlotPreview } from "./slot-preview";

const t = getDictionary();

export default async function DaysPage({
  searchParams,
}: {
  searchParams: Promise<{ preview_date?: string; preview_service?: string }>;
}) {
  const { preview_date, preview_service } = await searchParams;
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

  const today = new Date().toISOString().slice(0, 10);
  const { data: overrides } = await supabase
    .from("day_overrides")
    .select("date, kind, start_time, end_time")
    .eq("provider_id", user!.id)
    .gte("date", today)
    .order("date")
    .limit(30);

  return (
    <div className="min-h-dvh bg-stone-950 text-stone-100">
      <main className="mx-auto w-full max-w-md px-5 py-10">
        <a href="/dashboard" className="text-sm text-stone-400 underline">
          ← Dashboard
        </a>
        <DayOverrides
          scheduleType={provider?.schedule_type ?? "regular"}
          existing={(overrides ?? []).map((o) => ({
            date: o.date,
            kind: o.kind,
            start: o.start_time?.slice(0, 5) ?? null,
            end: o.end_time?.slice(0, 5) ?? null,
          }))}
        />
        <section className="mt-10">
          <p className="mb-2 text-sm font-medium text-stone-300">
            Preview what clients see
          </p>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <input
              type="date"
              name="preview_date"
              defaultValue={preview_date ?? ""}
              required
              className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
            />
            <select
              name="preview_service"
              defaultValue={preview_service ?? services?.[0]?.id}
              className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
            >
              {(services ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-amber-400 px-3 py-2 text-sm text-amber-300"
            >
              Show slots
            </button>
          </form>
          {preview_date && preview_service && (
            <SlotPreview
              providerId={user!.id}
              services={services ?? []}
              date={preview_date}
              serviceId={preview_service}
            />
          )}
        </section>

        <p className="mt-8 text-xs text-stone-600">{t.schedule.daysHint}</p>
      </main>
    </div>
  );
}
