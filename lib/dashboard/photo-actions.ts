"use server";

import { createServerSupabase } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

function ext(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "jpg";
}

// ── Banner ────────────────────────────────────────────────────────────────────

export async function uploadBanner(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; ok?: true }> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const file = formData.get("banner") as File | null;
  if (!file || file.size === 0) return { error: "no_file" };
  if (file.size > 5 * 1024 * 1024) return { error: "too_large" };

  const admin = createAdminClient();
  const path = `${user.id}/banner/${randomUUID()}.${ext(file.name)}`;
  const bytes = await file.arrayBuffer();

  const { error: upErr } = await admin.storage
    .from("work-photos")
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (upErr) return { error: "upload_failed" };

  // Delete old banner from storage if set
  const { data: row } = await admin
    .from("providers")
    .select("banner_path")
    .eq("id", user.id)
    .single();
  if (row?.banner_path) {
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

export async function uploadServicePhoto(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; ok?: true }> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const serviceId = formData.get("service_id") as string | null;
  const file = formData.get("photo") as File | null;
  if (!serviceId || !file || file.size === 0) return { error: "missing" };
  if (file.size > 8 * 1024 * 1024) return { error: "too_large" };

  const admin = createAdminClient();

  // Verify service belongs to this provider
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
  if (photos.length >= 6) return { error: "limit_reached" };

  const path = `${user.id}/services/${serviceId}/${randomUUID()}.${ext(file.name)}`;
  const bytes = await file.arrayBuffer();

  const { error: upErr } = await admin.storage
    .from("work-photos")
    .upload(path, bytes, { contentType: file.type });
  if (upErr) return { error: "upload_failed" };

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
