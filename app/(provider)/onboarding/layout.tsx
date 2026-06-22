import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { createServerSupabase } from "@/lib/db/server";
import { signOut } from "@/lib/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandPanel, Wordmark } from "@/components/provider/auth-shell";
import { OnboardingStepper } from "@/components/provider/onboarding-stepper";
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
    <div className="bg-canvas text-ink lg:grid lg:min-h-dvh lg:grid-cols-[420px_minmax(0,1fr)]">
      {/* Brand panel — desktop only; keeps the goal in view (handoff). */}
      <BrandPanel>
        <Wordmark onDark />
        <h2 className="mt-9 font-serif text-[28px] font-medium leading-snug text-white">
          {t.onboarding.panelTitle}
        </h2>
        <p className="mt-3.5 max-w-[300px] text-[14px] leading-relaxed" style={{ color: "#b8ac9d" }}>
          {t.onboarding.panelBody}
        </p>
        <OnboardingStepper />
        <p
          className="mt-auto flex items-center gap-2 text-[12.5px]"
          style={{ color: "#9b9087" }}
        >
          <Check size={14} strokeWidth={2.2} style={{ color: "#4fae7d" }} />
          {t.onboarding.panelFooter}
        </p>
      </BrandPanel>

      {/* Form pane */}
      <div className="relative flex min-h-dvh flex-col">
        <header className="mx-auto flex w-full max-w-md items-center justify-between px-5 pt-6 lg:hidden">
          <Wordmark />
          <ThemeToggle />
        </header>
        <div className="absolute right-6 top-6 z-10 hidden lg:block">
          <ThemeToggle />
        </div>
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
    </div>
  );
}
