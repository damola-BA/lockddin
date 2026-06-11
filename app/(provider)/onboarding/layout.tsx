import type { ReactNode } from "react";
import { createServerSupabase } from "@/lib/db/server";
import { signOut } from "@/lib/auth/actions";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary();

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-dvh bg-stone-950 text-stone-100">
      {children}
      {user && (
        <footer className="pb-8 text-center">
          <form action={signOut}>
            <button type="submit" className="text-sm text-stone-500 underline">
              {t.auth.signOut}
            </button>
          </form>
        </footer>
      )}
    </div>
  );
}
