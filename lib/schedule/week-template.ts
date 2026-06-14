import type { SupabaseClient } from "@supabase/supabase-js";

// One-shot week setup (DD17): the same hours + recurring blocks applied to
// every ticked weekday. Parsing/persistence live here so onboarding can save
// the week as part of the single "Finish" submit (DD34) rather than a separate
// button. Per-day edits use the dashboard template editor instead.

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export type WeekBlock = { start: string; end: string; label?: string };
export type WeekTemplateInput = {
  weekdays: number[];
  start: string;
  end: string;
  blocks: WeekBlock[];
};

function parseBlocks(raw: string): WeekBlock[] | null {
  try {
    const blocks = JSON.parse(raw || "[]") as WeekBlock[];
    if (!Array.isArray(blocks)) return null;
    for (const b of blocks) {
      if (!TIME_RE.test(b.start) || !TIME_RE.test(b.end) || b.end <= b.start) {
        return null;
      }
    }
    return blocks;
  } catch {
    return null;
  }
}

export function parseWeekForm(
  formData: FormData,
): { error: string } | { input: WeekTemplateInput } {
  const weekdays = formData
    .getAll("weekdays")
    .map(Number)
    .filter((w) => Number.isInteger(w) && w >= 0 && w <= 6);
  if (weekdays.length === 0) return { error: "no_week" };

  const start = String(formData.get("start_time") ?? "");
  const end = String(formData.get("end_time") ?? "");
  if (!TIME_RE.test(start) || !TIME_RE.test(end) || end <= start) {
    return { error: "invalid_hours" };
  }

  const blocks = parseBlocks(String(formData.get("blocks") ?? "[]"));
  if (!blocks) return { error: "invalid_blocks" };

  return { input: { weekdays, start, end, blocks } };
}

// Replace the provider's weekly template wholesale; reserved_blocks cascade
// with the days. Returns a server error key on failure.
export async function persistWeekTemplate(
  supabase: SupabaseClient,
  userId: string,
  input: WeekTemplateInput,
): Promise<{ error?: string }> {
  const { error: delError } = await supabase
    .from("week_template_days")
    .delete()
    .eq("provider_id", userId);
  if (delError) return { error: "server" };

  const { data: dayRows, error: insError } = await supabase
    .from("week_template_days")
    .insert(
      input.weekdays.map((weekday) => ({
        provider_id: userId,
        weekday,
        start_time: input.start,
        end_time: input.end,
      })),
    )
    .select("id");
  if (insError || !dayRows) return { error: "server" };

  if (input.blocks.length > 0) {
    const { error: blockError } = await supabase.from("reserved_blocks").insert(
      dayRows.flatMap((d) =>
        input.blocks.map((b) => ({
          template_day_id: d.id,
          start_time: b.start,
          end_time: b.end,
          label: b.label || null,
        })),
      ),
    );
    if (blockError) return { error: "server" };
  }
  return {};
}
