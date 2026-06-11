"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";

// F4 dashboard-side actions: template editing (never cancels bookings),
// day overrides + range closure (consequence preview, atomic apply),
// flexible-mode batch add.

export type ActionState = { error?: string; ok?: boolean };

export type AffectedBooking = {
  booking_id: string;
  client_first_name: string;
  client_email: string | null;
  service_name: string;
  starts_at: string;
  ends_at: string;
};

export type PreviewState = {
  error?: string;
  affected?: AffectedBooking[];
  applied?: number;
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");
  return { supabase, user };
}

function parseBlocks(raw: string): { start: string; end: string; label?: string }[] | null {
  try {
    const blocks = JSON.parse(raw || "[]") as {
      start: string;
      end: string;
      label?: string;
    }[];
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

// ── Template editing (regular mode) ──────────────────────────────────
// Hard rule 5: template changes never cancel existing bookings — they only
// shape future availability, so no preview machinery here.

export async function saveTemplateDay(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();

  const weekday = Number(formData.get("weekday"));
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return { error: "invalid" };
  }

  const working = formData.get("working") === "on";
  if (!working) {
    const { error } = await supabase
      .from("week_template_days")
      .delete()
      .eq("provider_id", user.id)
      .eq("weekday", weekday);
    if (error) return { error: "server" };
    revalidatePath("/dashboard/schedule");
    return { ok: true };
  }

  const start = String(formData.get("start_time") ?? "");
  const end = String(formData.get("end_time") ?? "");
  if (!TIME_RE.test(start) || !TIME_RE.test(end) || end <= start) {
    return { error: "invalid_hours" };
  }

  const capRaw = String(formData.get("daily_cap") ?? "");
  const dailyCap = capRaw === "" ? null : Number(capRaw);
  if (dailyCap !== null && (!Number.isInteger(dailyCap) || dailyCap < 1)) {
    return { error: "invalid" };
  }

  const blocks = parseBlocks(String(formData.get("blocks") ?? "[]"));
  if (!blocks) return { error: "invalid_blocks" };

  // empty selection = all services (null)
  const serviceIds = formData.getAll("service_ids").map(String);
  const restrict = formData.get("restrict_services") === "on";

  const { data: dayRow, error: dayError } = await supabase
    .from("week_template_days")
    .upsert(
      {
        provider_id: user.id,
        weekday,
        start_time: start,
        end_time: end,
        daily_cap: dailyCap,
        service_ids: restrict && serviceIds.length > 0 ? serviceIds : null,
        location_text:
          String(formData.get("location_text") ?? "").trim() || null,
      },
      { onConflict: "provider_id,weekday" },
    )
    .select("id")
    .single();
  if (dayError) return { error: "server" };

  // Replace reserved blocks wholesale — simplest correct model.
  const { error: delError } = await supabase
    .from("reserved_blocks")
    .delete()
    .eq("template_day_id", dayRow.id);
  if (delError) return { error: "server" };
  if (blocks.length > 0) {
    const { error: insError } = await supabase.from("reserved_blocks").insert(
      blocks.map((b) => ({
        template_day_id: dayRow.id,
        start_time: b.start,
        end_time: b.end,
        label: b.label || null,
      })),
    );
    if (insError) return { error: "server" };
  }

  revalidatePath("/dashboard/schedule");
  revalidatePath("/onboarding/schedule"); // editor is embedded there too
  return { ok: true };
}

// ── Overrides: preview & apply (consequence cascade) ─────────────────

type OverrideArgs = {
  dates: string[];
  kind: "closed" | "open" | "modified";
  start: string | null;
  end: string | null;
  extraBlocks: { start: string; end: string; label?: string }[];
  dailyCap: number | null;
};

function parseOverrideArgs(formData: FormData): OverrideArgs | null {
  const kind = String(formData.get("kind") ?? "");
  if (kind !== "closed" && kind !== "open" && kind !== "modified") return null;

  const dates = String(formData.get("dates") ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  if (dates.length === 0 || dates.some((d) => !DATE_RE.test(d))) return null;

  let start: string | null = null;
  let end: string | null = null;
  if (kind !== "closed") {
    start = String(formData.get("start_time") ?? "");
    end = String(formData.get("end_time") ?? "");
    if (!TIME_RE.test(start) || !TIME_RE.test(end) || end <= start) return null;
  }

  const extraBlocks = parseBlocks(String(formData.get("blocks") ?? "[]"));
  if (extraBlocks === null) return null;

  const capRaw = String(formData.get("daily_cap") ?? "");
  const dailyCap = capRaw === "" ? null : Number(capRaw);
  if (dailyCap !== null && (!Number.isInteger(dailyCap) || dailyCap < 1)) {
    return null;
  }

  return { dates, kind, start, end, extraBlocks, dailyCap };
}

export async function previewOverride(
  _prev: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  const { user } = await requireUser();
  const args = parseOverrideArgs(formData);
  if (!args) return { error: "invalid" };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("affected_bookings_for_override", {
    p_provider_id: user.id,
    p_dates: args.dates,
    p_kind: args.kind,
    p_start: args.start,
    p_end: args.end,
    p_extra_blocks: JSON.stringify(
      args.extraBlocks.map(({ start, end }) => ({ start, end })),
    ),
  });
  if (error) return { error: "server" };
  return { affected: (data ?? []) as AffectedBooking[] };
}

export async function applyOverride(
  _prev: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  const { user } = await requireUser();
  const args = parseOverrideArgs(formData);
  if (!args) return { error: "invalid" };

  const reason = String(formData.get("cancel_reason") ?? "").trim() || null;
  const admin = createAdminClient();

  // Snapshot the affected list before applying — needed for the email rows.
  const { data: affected } = await admin.rpc("affected_bookings_for_override", {
    p_provider_id: user.id,
    p_dates: args.dates,
    p_kind: args.kind,
    p_start: args.start,
    p_end: args.end,
    p_extra_blocks: JSON.stringify(
      args.extraBlocks.map(({ start, end }) => ({ start, end })),
    ),
  });

  const { data: cancelled, error } = await admin.rpc(
    "apply_override_with_cancellations",
    {
      p_provider_id: user.id,
      p_dates: args.dates,
      p_kind: args.kind,
      p_start: args.start,
      p_end: args.end,
      p_extra_blocks: JSON.stringify(args.extraBlocks),
      p_daily_cap: args.dailyCap,
      p_location_text: null,
      p_cancel_reason: reason,
    },
  );
  if (error) return { error: "server" };

  // One cancellation email per affected client — queued now, sent when the
  // F9 template lands in M4 (DD15).
  const cancelledIds = new Set((cancelled ?? []) as string[]);
  const rows = ((affected ?? []) as AffectedBooking[])
    .filter((b) => cancelledIds.has(b.booking_id) && b.client_email)
    .map((b) => ({
      provider_id: user.id,
      booking_id: b.booking_id,
      recipient_email: b.client_email!,
      template_key: "booking.cancelled_by_provider",
      payload: {
        clientFirstName: b.client_first_name,
        serviceName: b.service_name,
        startsAt: b.starts_at,
        reason,
      },
      status: "queued",
    }));
  if (rows.length > 0) {
    await admin.from("notification_log").insert(rows);
  }

  revalidatePath("/dashboard/days");
  revalidatePath("/onboarding/schedule"); // flexible batch add lives there too
  return { applied: cancelledIds.size };
}

// Remove a closure/modification → the date falls back to the template.
// Restoring availability cancels nothing, so no preview needed. 'open'
// overrides (flexible mode) must be closed via the cascade instead.
export async function removeOverride(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const date = String(formData.get("date") ?? "");
  if (!DATE_RE.test(date)) return { error: "invalid" };

  const { error } = await supabase
    .from("day_overrides")
    .delete()
    .eq("provider_id", user.id)
    .eq("date", date)
    .in("kind", ["closed", "modified"]);
  if (error) return { error: "server" };

  revalidatePath("/dashboard/days");
  return { ok: true };
}
