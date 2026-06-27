import { createServerSupabase } from "@/lib/db/server";
import { ChevronLeft } from "lucide-react";
import { getDictionary, fill } from "@/lib/i18n";
import { WorkstationShell } from "@/components/provider/workstation-shell";
import { ServicesEditor } from "@/components/provider/services-editor";

const t = getDictionary();

export default async function ServicesPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: services } = await supabase
    .from("services")
    .select(
      "id, name, duration_minutes, price_cents, buffer_minutes, prep_instructions, is_active, sort_order, photos",
    )
    .eq("provider_id", user!.id)
    .order("sort_order");

  const { data: provider } = await supabase
    .from("providers")
    .select("business_name, provider_name")
    .eq("id", user!.id)
    .single();
  const businessName = provider?.business_name ?? provider?.provider_name ?? "";
  const list = (services ?? []).map((s) => ({
    ...s,
    photos: Array.isArray(s.photos) ? (s.photos as string[]) : [],
  }));
  const activeCount = list.filter((s) => s.is_active).length;

  return (
    <WorkstationShell active="services" businessName={businessName} bleed>
      <div className="mx-auto w-full max-w-[1040px]">
        <a
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-3 md:hidden"
        >
          <ChevronLeft size={15} strokeWidth={2.2} /> Dashboard
        </a>

        <div className="mb-5 flex items-end justify-between gap-3.5">
          <div className="min-w-0">
            <h1 className="font-serif text-[25px] font-semibold leading-tight md:text-[28px]">
              {t.settings.servicesTitle}
            </h1>
            <p className="mt-1.5 text-[13.5px] text-ink-3">{t.settings.servicesIntro}</p>
          </div>
          <span className="shrink-0 rounded-[9px] border border-line bg-surface px-2.5 py-2 text-[12px] font-semibold tabular text-ink-4">
            {fill(t.settings.bookableCount, { n: activeCount })}
          </span>
        </div>

        <ServicesEditor layout="grid" services={list} />
      </div>
    </WorkstationShell>
  );
}
