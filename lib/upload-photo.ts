"use client";

import { createBrowserSupabase } from "@/lib/db/client";

function ext(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "jpg";
}

// Uploads a file straight to Supabase Storage from the browser (authenticated
// provider → RLS lets them write under their own {uid}/… folder). Returns the
// storage path to hand to a record* server action. Throws on failure.
export async function uploadToWorkPhotos(
  file: File,
  subfolder: string,
): Promise<string> {
  const supabase = createBrowserSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const path = `${user.id}/${subfolder}/${crypto.randomUUID()}.${ext(file.name)}`;
  const { error } = await supabase.storage
    .from("work-photos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;

  return path;
}
