"use client";

import { createBrowserSupabase } from "@/lib/db/client";
import { compressImage } from "@/lib/compress-image";

function ext(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "jpg";
}

// Uploads a file straight to Supabase Storage from the browser (authenticated
// provider → RLS lets them write under their own {uid}/… folder). The image is
// compressed/downscaled first so multi-MB phone photos upload fast and the
// booking page stays light. Returns the storage path to hand to a record*
// server action. Throws on failure.
export async function uploadToWorkPhotos(
  file: File,
  subfolder: string,
): Promise<string> {
  const supabase = createBrowserSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const compressed = await compressImage(file);

  const path = `${user.id}/${subfolder}/${crypto.randomUUID()}.${ext(compressed.name)}`;
  const { error } = await supabase.storage
    .from("work-photos")
    .upload(path, compressed, { contentType: compressed.type, upsert: false });
  if (error) throw error;

  return path;
}
