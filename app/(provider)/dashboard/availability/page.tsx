import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/db/server";
import { todayLocal } from "@/lib/dashboard/queries";
import { WorkstationShell } from "@/components/provider/workstation-shell";
import { AvailabilityClient } from "./availability-client";

export type WeekDay = {
  weekday: number;
  start: string;
  end: string;
  dailyCap: number | null;
  serviceIds: string[] | null;
  blocks: { start: string; end: string; label: string }[];
};

export type UpcomingChange = {
  date: string;
  kind: "closed" | "open" | "modified";
  start: string | null;
  end: string | null;
};

export type AvailabilityRules = {
  scheduleType: "regular" | "flexible";
  bookingWindow: string;
  cancellationWindowHours: number;
  minLeadTimeMinutes: number;
  globalBufferMinutes: number;
};

// Unified Availability surface (replaces Your week + Days off & exceptions +
// the four booking rules from Settings). One fetch, one screen.
export default async function AvailabilityPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { data: provider } = await supabase
    .from("providers")
    .select(
      "timezone, schedule_type, booking_window, cancellation_window_hours, min_lead_time_minutes, global_buffer_minutes, business_name, provider_name",
    )
    .eq("id", user.id)
    .single();
  if (!provider) redirect("/onboarding/email");

  const today = todayLocal(provider.timezone);

  const [{ data: services }, { data: days }, { data: overrides }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name")
      .eq("provider_id", user.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("week_template_days")
      .select(
        "weekday, start_time, end_time, daily_cap, service_ids, reserved_blocks (start_time, end_time, label)",
      )
      .eq("provider_id", user.id)
      .order("weekday"),
    supabase
      .from("day_overrides")
      .select("date, kind, start_time, end_time")
      .eq("provider_id", user.id)
      .gte("date", today)
      .order("date"),
  ]);

  const week: WeekDay[] = (days ?? []).map((d) => ({
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

  const upcoming: UpcomingChange[] = (overrides ?? []).map((o) => ({
    date: o.date,
    kind: o.kind,
    start: o.start_time ? o.start_time.slice(0, 5) : null,
    end: o.end_time ? o.end_time.slice(0, 5) : null,
  }));

  const rules: AvailabilityRules = {
    scheduleType: provider.schedule_type,
    bookingWindow: provider.booking_window,
    cancellationWindowHours: provider.cancellation_window_hours,
    minLeadTimeMinutes: provider.min_lead_time_minutes,
    globalBufferMinutes: provider.global_buffer_minutes,
  };

  const businessName = provider.business_name ?? provider.provider_name ?? "";

  return (
    <WorkstationShell active="settings" businessName={businessName} maxWidth="600px">
      <AvailabilityClient
        timezone={provider.timezone}
        today={today}
        week={week}
        upcoming={upcoming}
        rules={rules}
        services={services ?? []}
      />
    </WorkstationShell>
  );
}
