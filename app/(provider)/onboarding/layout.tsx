import type { ReactNode } from "react";
import { createServerSupabase } from "@/lib/db/server";
import { signOut } from "@/lib/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-5 pt-6">
        <span className="text-[19px] font-extrabold tracking-tight">
          Lock<span className="font-serif font-medium italic text-accent">d</span>Din
        </span>
        <ThemeToggle />
      </header>
      <div className="flex-1">{children}</div>
      {user && (
        <footer className="pb-8 text-center">
          <form action={signOut}>
            <button type="submit" className="text-sm text-ink-3 underline">
              {t.auth.signOut}
            </button>
          </form>
        </footer>
      )}
    </div>
  );
}
