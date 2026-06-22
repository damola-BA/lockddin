import { createServerSupabase } from "@/lib/db/server";
import { ChevronLeft, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { getDictionary } from "@/lib/i18n";
import { WorkstationShell } from "@/components/provider/workstation-shell";
import { PageTitle, Hint } from "@/components/provider/ui";
import { HoursMode } from "./settings-form";

const t = getDictionary();

export default async function SettingsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: provider } = await supabase
    .from("providers")
    .select("business_name, provider_name, schedule_type")
    .eq("id", user!.id)
    .single();

  if (!provider) return null;

  const businessName = provider.business_name ?? provider.provider_name ?? "";

  return (
    <WorkstationShell active="profile" businessName={businessName} maxWidth="560px">
      <div className="space-y-8">
        <a
          href="/dashboard/profile"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-3 md:hidden"
        >
          <ChevronLeft size={15} strokeWidth={2.2} /> {t.settings.navProfile}
        </a>

        <div>
          <PageTitle>{t.settings.settingsTitle}</PageTitle>
          <Hint>{t.settings.settingsIntro}</Hint>
          <HoursMode current={provider.schedule_type} />
        </div>

        <p className="rounded-lg border border-line bg-surface-2 px-3.5 py-3 text-sm text-ink-3">
          {t.settings.rulesMovedNote}{" "}
          <a href="/dashboard/availability" className="font-semibold text-accent underline">
            {t.dashboard.navAvailability}
          </a>
        </p>

        {/* Phone-only sign out (desktop uses the account menu in the top bar). */}
        <form action={signOut} className="border-t border-line pt-6 md:hidden">
          <button
            type="submit"
            className="flex items-center gap-2.5 text-[14px] font-semibold text-ink-3"
          >
            <LogOut size={16} strokeWidth={1.9} /> {t.auth.signOut}
          </button>
        </form>
      </div>
    </WorkstationShell>
  );
}
