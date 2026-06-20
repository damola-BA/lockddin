import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { createServerSupabase } from "@/lib/db/server";
import { BookingLinkCard } from "@/components/provider/booking-link";
import { appUrl } from "@/lib/app-url";
import { getDictionary, fill } from "@/lib/i18n";

const t = getDictionary();

// The activation moment — shown once after onboarding completes. Make the share
// link unmissable (it's the activation event) and confirm what's set up.
export default async function LivePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/onboarding/email");

  const { data: provider } = await supabase
    .from("providers")
    .select("business_name, provider_name, slug, schedule_type")
    .eq("id", user.id)
    .single();
  if (!provider) redirect("/onboarding/profile");

  const [{ count: serviceCount }] = await Promise.all([
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", user.id)
      .eq("is_active", true),
  ]);

  const firstName = (provider.provider_name ?? provider.business_name ?? "").split(" ")[0];
  const bookingUrl = appUrl(`/b/${provider.slug}`);

  const checklist = [
    t.onboarding.liveProfile,
    fill(t.onboarding.liveServices, { n: serviceCount ?? 0 }),
    provider.schedule_type === "flexible"
      ? t.onboarding.liveDays
      : t.onboarding.liveHours,
  ];

  return (
    <main className="mx-auto flex min-h-[80dvh] w-full max-w-md flex-col px-5 py-10">
      <div className="text-center">
        <div className="mx-auto flex h-[74px] w-[74px] items-center justify-center rounded-full bg-ok text-white shadow-[0_14px_30px_-12px_rgba(31,110,66,.55)]">
          <Check size={38} strokeWidth={2.6} />
        </div>
        <h1 className="mt-5 font-serif text-[30px] font-semibold leading-tight text-ink">
          {fill(t.onboarding.liveTitle, { name: firstName })}
        </h1>
        <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-3">
          {t.onboarding.liveBody}
        </p>
      </div>

      <div className="mt-7">
        <BookingLinkCard url={bookingUrl} businessName={provider.business_name ?? ""} />
      </div>

      <ul className="mt-4 space-y-0.5">
        {checklist.map((item) => (
          <li key={item} className="flex items-center gap-2.5 py-2.5">
            <Check size={17} strokeWidth={2.4} className="shrink-0 text-ok" />
            <span className="text-[13.5px] text-ink-2">{item}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/dashboard"
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-ctrl py-4 text-[15px] font-bold text-ctrl-ink"
      >
        {t.onboarding.goToDashboard}
      </Link>
    </main>
  );
}
