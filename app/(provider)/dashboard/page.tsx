import { createServerSupabase } from "@/lib/db/server";
import { signOut } from "@/lib/auth/actions";
import { getDictionary } from "@/lib/i18n";
import { appUrl } from "@/lib/app-url";
import { CopyLinkButton } from "./copy-link";

const t = getDictionary();

// M1 empty dashboard — the landing point after onboarding completes.
// Day/week/month views land in M5 (F7).
export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: provider } = await supabase
    .from("providers")
    .select("business_name, slug")
    .eq("id", user!.id)
    .single();

  const bookingUrl = appUrl(`/b/${provider?.slug}`);

  return (
    <div className="min-h-dvh bg-stone-950 text-stone-100">
      <main className="mx-auto w-full max-w-md px-5 py-10">
        <header className="mb-10 flex items-center justify-between">
          <p className="font-serif text-lg">{provider?.business_name}</p>
          <form action={signOut}>
            <button type="submit" className="text-sm text-stone-400 underline">
              {t.auth.signOut}
            </button>
          </form>
        </header>

        <h1 className="mb-1 font-serif text-2xl">{t.dashboard.emptyTitle}</h1>
        <p className="mb-8 text-sm text-stone-400">{t.dashboard.emptyBody}</p>

        <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
          <p className="mb-1 text-xs tracking-widest text-stone-500">
            {t.dashboard.yourLink.toUpperCase()}
          </p>
          <p className="mb-3 break-all text-amber-300">{bookingUrl}</p>
          <CopyLinkButton url={bookingUrl} />
        </div>

        <nav className="mt-6 grid grid-cols-2 gap-3">
          <a
            href="/dashboard/schedule"
            className="rounded-lg border border-stone-700 bg-stone-900 p-4 text-center text-sm text-stone-200"
          >
            {t.schedule.title}
          </a>
          <a
            href="/dashboard/days"
            className="rounded-lg border border-stone-700 bg-stone-900 p-4 text-center text-sm text-stone-200"
          >
            {t.schedule.daysTitle}
          </a>
        </nav>
      </main>
    </div>
  );
}
