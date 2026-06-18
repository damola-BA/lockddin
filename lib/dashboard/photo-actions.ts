"use server";

import { createServerSupabase } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { revalidatePath } from "next/cache";

// Files are uploaded directly from the browser to Supabase Storage (the
// authenticated provider can write to their own {uid}/… folder via RLS). That
// avoids the 1 MB server-action body limit and Vercel's 4.5 MB request cap.
// These actions only record/clear the resulting path — tiny bodies.

// ── Banner ────────────────────────────────────────────────────────────────────

export async function recordBanner(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; ok?: true }> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const path = formData.get("path") as string | null;
  if (!path) return { error: "missing" };
  // Guard: the path must live under this provider's own folder.
  if (!path.startsWith(`${user.id}/`)) return { error: "forbidden" };

  const admin = createAdminClient();

  // Remove the previous banner from storage if there was one.
  const { data: row } = await admin
    .from("providers")
    .select("banner_path")
    .eq("id", user.id)
    .single();
  if (row?.banner_path && row.banner_path !== path) {
    await admin.storage.from("work-photos").remove([row.banner_path]);
  }

  await admin.from("providers").update({ banner_path: path }).eq("id", user.id);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteBanner(
  _prev: unknown,
  _formData: FormData,
): Promise<{ error?: string; ok?: true }> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("providers")
    .select("banner_path")
    .eq("id", user.id)
    .single();

  if (row?.banner_path) {
    await admin.storage.from("work-photos").remove([row.banner_path]);
    await admin.from("providers").update({ banner_path: null }).eq("id", user.id);
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ── Service photos ────────────────────────────────────────────────────────────

export async function recordServicePhoto(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; ok?: true }> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const serviceId = formData.get("service_id") as string | null;
  const path = formData.get("path") as string | null;
  if (!serviceId || !path) return { error: "missing" };
  if (!path.startsWith(`${user.id}/`)) return { error: "forbidden" };

  const admin = createAdminClient();

  // Verify service belongs to this provider.
  const { data: service } = await admin
    .from("services")
    .select("id, photos")
    .eq("id", serviceId)
    .eq("provider_id", user.id)
    .single();
  if (!service) {
    // Orphan cleanup: the file was uploaded but we can't attach it.
    await admin.storage.from("work-photos").remove([path]);
    return { error: "not_found" };
  }

  const photos: string[] = Array.isArray(service.photos)
    ? (service.photos as string[])
    : [];
  if (photos.length >= 6) {
    await admin.storage.from("work-photos").remove([path]);
    return { error: "limit_reached" };
  }

  await admin
    .from("services")
    .update({ photos: [...photos, path] })
    .eq("id", serviceId)
    .eq("provider_id", user.id);

  revalidatePath("/dashboard/services");
  revalidatePath("/onboarding/services");
  return { ok: true };
}

export async function deleteServicePhoto(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; ok?: true }> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const serviceId = formData.get("service_id") as string | null;
  const path = formData.get("path") as string | null;
  if (!serviceId || !path) return { error: "missing" };

  const admin = createAdminClient();

  const { data: service } = await admin
    .from("services")
    .select("id, photos")
    .eq("id", serviceId)
    .eq("provider_id", user.id)
    .single();
  if (!service) return { error: "not_found" };

  const photos: string[] = Array.isArray(service.photos)
    ? (service.photos as string[])
    : [];

  await admin.storage.from("work-photos").remove([path]);
  await admin
    .from("services")
    .update({ photos: photos.filter((p) => p !== path) })
    .eq("id", serviceId)
    .eq("provider_id", user.id);

  revalidatePath("/dashboard/services");
  revalidatePath("/onboarding/services");
  return { ok: true };
}
