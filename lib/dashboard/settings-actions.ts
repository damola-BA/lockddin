"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/db/server";
import { isValidSlug, normalizeSlug } from "@/lib/onboarding/slug";

export type SettingsState = { error?: string; ok?: boolean };

// Kept in sync with the onboarding profile step (lib/onboarding/actions.ts).
// Redefined locally because that file is a "use server" module and may only
// export async server actions (see DD29) — constants can't be shared from it.
const BOOKING_WINDOWS = ["3_days", "current_week", "current_month", "3_months"];
const CANCELLATION_HOURS = [12, 24, 48, 72, 168];
const MAX_LEAD_MINUTES = 20160;

// Post-onboarding edit of the profile fields collected in F2. Unlike
// saveProfile this never touches onboarding_step and never redirects — it
// updates in place and reports success so the provider stays on Settings.
export async function updateProfileSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
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

  const { error } = await supabase
    .from("providers")
    .update({
      business_name: businessName,
      provider_name: providerName,
      city,
      slug,
      location_text: locationText || null,
      booking_window: bookingWindow,
      cancellation_window_hours: cancellationHours,
      min_lead_time_minutes: minLeadMinutes,
      global_buffer_minutes: bufferMinutes,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505" && error.message.includes("slug")) {
      return { error: "slug_taken" };
    }
    return { error: "server" };
  }

  // Business name shows in the dashboard header; slug + windows feed the
  // booking link and nav range. Refresh the surfaces that read them.
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
