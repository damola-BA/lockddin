import "server-only";
import { cache } from "react";
import { createServerSupabase } from "@/lib/db/server";
import { getDictionary, type Dictionary } from "./index";

// Language of the currently signed-in provider, for server components on the
// dashboard. Wrapped in React `cache()` so the auth + provider lookup runs at
// most once per request no matter how many components call it. Falls back to
// English when there's no session (shouldn't happen behind the auth guard).
export const getProviderLanguage = cache(async (): Promise<string> => {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "en";
  const { data } = await supabase
    .from("providers")
    .select("language")
    .eq("id", user.id)
    .single();
  return data?.language ?? "en";
});

// Dictionary for the signed-in provider's language. Drop-in for the old
// module-level `const t = getDictionary()` in server components — change to
// `const t = await getServerDict()`.
export const getServerDict = cache(async (): Promise<Dictionary> => {
  return getDictionary(await getProviderLanguage());
});
