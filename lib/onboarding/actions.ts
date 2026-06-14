"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { sendVerificationEmail } from "@/lib/auth/actions";
import { isValidSlug, normalizeSlug } from "@/lib/onboarding/slug";
import { revalidatePath } from "next/cache";

export type ActionState = { error?: string; ok?: boolean };

const BOOKING_WINDOWS = ["3_days", "current_week", "current_month", "3_months"];
const CANCELLATION_HOURS = [12, 24, 48, 72, 168];
const MAX_LEAD_MINUTES = 20160;

// ── F2: profile step ─────────────────────────────────────────────────

export async function saveProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/onboarding/email");

  const businessName = String(formData.get("business_name") ?? "").trim();
  const providerName = String(formData.get("provider_name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const locationText = String(formData.get("location_text") ?? "").trim();
  const bookingWindow = String(formData.get("booking_window") ?? "");
  const cancellationHours = Number(formData.get("cancellation_window_hours"));
  const minLeadMinutes = Number(formData.get("min_lead_time_minutes"));
  const bufferMinutes = Number(formData.get("global_buffer_minutes"));

  if (!businessName || !providerName || !city) return { error: "missing_fields" };
  if (!isValidSlug(slug)) return { error: "slug_invalid" };
  if (!BOOKING_WINDOWS.includes(bookingWindow)) return { error: "missing_fields" };
  if (!CANCELLATION_HOURS.includes(cancellationHours)) return { error: "missing_fields" };
  if (
    !Number.isInteger(minLeadMinutes) ||
    minLeadMinutes < 0 ||
    minLeadMinutes > MAX_LEAD_MINUTES
  ) {
    return { error: "missing_fields" };
  }
  if (!Number.isInteger(bufferMinutes) || bufferMinutes < 0) {
    return { error: "missing_fields" };
  }

  // Insert under RLS as the signed-in provider; the unique constraint on
  // slug is the authoritative collision check.
  const { data: existing } = await supabase
    .from("providers")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const row = {
    email: user.email!,
    business_name: businessName,
    provider_name: providerName,
    city,
    slug,
    location_text: locationText || null,
    booking_window: bookingWindow,
    cancellation_window_hours: cancellationHours,
    min_lead_time_minutes: minLeadMinutes,
    global_buffer_minutes: bufferMinutes,
    onboarding_step: "services",
  };

  const { error } = existing
    ? await supabase.from("providers").update(row).eq("id", user.id)
    : await supabase.from("providers").insert({ id: user.id, ...row });

  if (error) {
    if (error.code === "23505" && error.message.includes("slug")) {
      return { error: "slug_taken" };
    }
    return { error: "server" };
  }

  if (!existing) {
    // First save: the verification email can now go out (DD09). Failure is
    // non-blocking — the schedule step offers a resend.
    try {
      await sendVerificationEmail(user.id);
    } catch {
      /* logged in notification_log */
    }
  }

  redirect("/onboarding/services");
}

// ── F3: services step ────────────────────────────────────────────────

type ServiceInput = {
  name: string;
  duration_minutes: number;
  price_cents: number;
  buffer_minutes: number | null;
  prep_instructions: string | null;
};

function parseService(formData: FormData): ServiceInput | null {
  const name = String(formData.get("name") ?? "").trim();
  const duration = Number(formData.get("duration_minutes"));
  const priceEuro = String(formData.get("price") ?? "").replace(",", ".");
  const priceCents = Math.round(Number(priceEuro) * 100);
  const bufferRaw = String(formData.get("buffer_minutes") ?? "");
  const prep = String(formData.get("prep_instructions") ?? "").trim();

  if (!name || !Number.isInteger(duration) || duration <= 0) return null;
  if (!Number.isFinite(priceCents) || priceCents < 0) return null;

  return {
    name,
    duration_minutes: duration,
    price_cents: priceCents,
    buffer_minutes: bufferRaw === "" ? null : Number(bufferRaw),
    prep_instructions: prep || null,
  };
}

export async function addService(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/onboarding/email");

  const input = parseService(formData);
  if (!input) return { error: "invalid_service" };

  const { count } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("provider_id", user.id);

  const { error } = await supabase.from("services").insert({
    provider_id: user.id,
    ...input,
    sort_order: (count ?? 0) + 1,
  });
  if (error) return { error: "server" };

  revalidatePath("/onboarding/services");
  revalidatePath("/dashboard/services");
  return { ok: true };
}

export async function updateService(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/onboarding/email");

  const id = String(formData.get("service_id") ?? "");
  const input = parseService(formData);
  if (!id || !input) return { error: "invalid_service" };

  const { error } = await supabase
    .from("services")
    .update(input)
    .eq("id", id)
    .eq("provider_id", user.id);
  if (error) return { error: "server" };

  revalidatePath("/onboarding/services");
  revalidatePath("/dashboard/services");
  return { ok: true };
}

// Delete rules (F3): never the last active service; blocked with the list
// of upcoming confirmed bookings if any exist.
export async function deleteService(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/onboarding/email");

  const id = String(formData.get("service_id") ?? "");
  if (!id) return { error: "server" };

  const { count: activeCount } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("provider_id", user.id)
    .eq("is_active", true)
    .neq("id", id);
  if ((activeCount ?? 0) === 0) return { error: "last_active" };

  const admin = createAdminClient();
  const { data: upcoming } = await admin
    .from("bookings")
    .select("id, starts_at")
    .eq("service_id", id)
    .eq("status", "confirmed")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at");
  if (upcoming && upcoming.length > 0) {
    return { error: `has_bookings:${upcoming.map((b) => b.starts_at).join(",")}` };
  }

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("provider_id", user.id);
  if (error) return { error: "server" };

  revalidatePath("/onboarding/services");
  revalidatePath("/dashboard/services");
  return { ok: true };
}

export async function finishServicesStep(): Promise<ActionState> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/onboarding/email");

  const { count } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("provider_id", user.id)
    .eq("is_active", true);
  if ((count ?? 0) === 0) return { error: "no_services" };

  await supabase
    .from("providers")
    .update({ onboarding_step: "schedule" })
    .eq("id", user.id);
  redirect("/onboarding/schedule");
}

// ── F2: schedule-type fork + completion gate ─────────────────────────

export async function completeOnboarding(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/onboarding/email");

  const scheduleType = String(formData.get("schedule_type") ?? "");
  if (scheduleType !== "regular" && scheduleType !== "flexible") {
    return { error: "pick_one" };
  }

  // Email verification is required before onboarding completes (F1).
  const { data: provider } = await supabase
    .from("providers")
    .select("email_verified_at")
    .eq("id", user.id)
    .single();
  if (!provider?.email_verified_at) return { error: "unverified" };

  // The schedule step now includes real setup (DD16): finishing requires a
  // usable starting pattern so the booking page never launches empty.
  if (scheduleType === "regular") {
    const { count } = await supabase
      .from("week_template_days")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", user.id);
    if ((count ?? 0) === 0) return { error: "no_week" };
  } else {
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await supabase
      .from("day_overrides")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", user.id)
      .eq("kind", "open")
      .gte("date", today);
    if ((count ?? 0) === 0) return { error: "no_days" };
  }

  const { error } = await supabase
    .from("providers")
    .update({ schedule_type: scheduleType, onboarding_step: "complete" })
    .eq("id", user.id);
  if (error) return { error: "server" };

  redirect("/dashboard");
}
