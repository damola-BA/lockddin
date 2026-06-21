"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import {
  updateProfileSettings,
  type SettingsState,
} from "@/lib/dashboard/settings-actions";
import { setScheduleType, type ActionState } from "@/lib/schedule/actions";
import { normalizeSlug } from "@/lib/onboarding/slug";
import { getDictionary } from "@/lib/i18n";
import {
  PageTitle,
  Hint,
  Label,
  TextInput,
  ErrorText,
} from "@/components/provider/ui";

const t = getDictionary();

type Initial = {
  business_name: string | null;
  provider_name: string | null;
  city: string | null;
  slug: string;
  location_text: string | null;
  schedule_type: "regular" | "flexible";
};

// How your hours work — the ONLY place to switch modes after onboarding. Both
// options are shown so the choice is legible; only one is active. Changing it is
// forward-only (confirmed): it affects how future days are offered, never booked
// appointments.
function HoursMode({ current }: { current: "regular" | "flexible" }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setScheduleType, {});

  function choose(next: "regular" | "flexible") {
    if (next === current || pending) return;
    if (!window.confirm(t.settings.hoursModeConfirm)) return;
    const fd = new FormData();
    fd.set("schedule_type", next);
    startTransition(() => action(fd));
  }

  const options = [
    { value: "regular" as const, title: t.settings.hoursModeRegular, sub: t.settings.hoursModeRegularSub },
    { value: "flexible" as const, title: t.settings.hoursModeFlexible, sub: t.settings.hoursModeFlexibleSub },
  ];

  return (
    <section className="space-y-3">
      <p className="border-b border-line pb-1 text-xs font-semibold uppercase tracking-wide text-ink-4">
        {t.settings.hoursModeTitle}
      </p>
      <div className="space-y-2">
        {options.map((o) => {
          const active = current === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => choose(o.value)}
              disabled={pending}
              aria-pressed={active}
              className={`flex w-full items-start gap-3 rounded-xl bg-surface p-3.5 text-left disabled:opacity-60 ${
                active
                  ? "border-[1.5px] border-accent [box-shadow:0_0_0_3px_var(--accent-l)]"
                  : "border border-line"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  active ? "bg-accent text-white" : "border-[1.5px] border-desk"
                }`}
              >
                {active && <Check size={12} strokeWidth={3} />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{o.title}</span>
                <span className="mt-0.5 block text-[12.5px] text-ink-3">{o.sub}</span>
              </span>
            </button>
          );
        })}
      </div>
      {state.ok && <p className="text-sm text-ok">{t.settings.hoursModeSaved}</p>}
    </section>
  );
}

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function SettingsForm({ initial }: { initial: Initial }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateProfileSettings,
    {},
  );
  const [slug, setSlug] = useState(initial.slug);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Real-time availability as they type (mirrors the onboarding profile step).
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!slug) {
      setSlugStatus("idle");
      return;
    }
    if (slug === initial.slug) {
      setSlugStatus("available"); // their own current slug
      return;
    }
    setSlugStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/slug-check?slug=${encodeURIComponent(slug)}`);
        const body: { valid: boolean; available: boolean } = await res.json();
        setSlugStatus(!body.valid ? "invalid" : body.available ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [slug, initial.slug]);

  return (
    <div>
      <div>

        <div className="mt-4">
          <PageTitle>{t.settings.title}</PageTitle>
          <Hint>{t.settings.intro}</Hint>
        </div>

        <form action={formAction} className="space-y-5">
          <p className="border-b border-line pb-1 text-xs font-semibold uppercase tracking-wide text-ink-4">
            {t.settings.sectionDetails}
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="business_name">{t.onboarding.businessName}</Label>
              <TextInput
                id="business_name"
                name="business_name"
                defaultValue={initial.business_name ?? ""}
                required
              />
            </div>
            <div>
              <Label htmlFor="provider_name">{t.onboarding.providerName}</Label>
              <TextInput
                id="provider_name"
                name="provider_name"
                defaultValue={initial.provider_name ?? ""}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="city">{t.onboarding.city}</Label>
            <TextInput id="city" name="city" defaultValue={initial.city ?? ""} required />
          </div>

          <div>
            <Label htmlFor="slug">{t.onboarding.slugLabel}</Label>
            <div className="flex items-center gap-1 rounded-lg border border-line bg-surface px-3.5 focus-within:border-accent">
              <span className="shrink-0 text-sm text-ink-3">lockddin.app/b/</span>
              <input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => setSlug(normalizeSlug(e.target.value))}
                required
                className="w-full bg-transparent py-3 text-base text-ink focus:outline-none"
              />
            </div>
            <p className="mt-1.5 text-sm">
              {slugStatus === "checking" && (
                <span className="text-ink-3">{t.onboarding.slugChecking}</span>
              )}
              {slugStatus === "available" && (
                <span className="text-ok">{t.onboarding.slugAvailable}</span>
              )}
              {slugStatus === "taken" && (
                <span className="text-red-600">{t.onboarding.slugTaken}</span>
              )}
              {slugStatus === "invalid" && (
                <span className="text-red-600">{t.onboarding.slugInvalid}</span>
              )}
              {slugStatus === "idle" && (
                <span className="text-ink-3">{t.onboarding.slugHint}</span>
              )}
            </p>
            <p className="mt-1.5 text-sm text-accent/80">{t.settings.slugWarning}</p>
          </div>

          <div>
            <Label htmlFor="location_text">{t.onboarding.locationLabel}</Label>
            <TextInput
              id="location_text"
              name="location_text"
              defaultValue={initial.location_text ?? ""}
              placeholder="e.g. Rue de la Paix 12, 1000 Brussels"
            />
            <p className="mt-1.5 text-sm text-ink-3">{t.onboarding.locationHint}</p>
          </div>

          <p className="rounded-lg border border-line bg-surface-2 px-3.5 py-3 text-sm text-ink-3">
            {t.settings.rulesMovedNote}{" "}
            <a href="/dashboard/availability" className="font-semibold text-accent underline">
              {t.dashboard.navAvailability}
            </a>
          </p>

          {state.error === "slug_invalid" && <ErrorText>{t.onboarding.slugInvalid}</ErrorText>}
          {state.error === "slug_taken" && <ErrorText>{t.onboarding.slugTaken}</ErrorText>}
          {(state.error === "missing_fields" || state.error === "server") && (
            <ErrorText>{t.common.somethingWrong}</ErrorText>
          )}
          {state.ok && (
            <p className="mt-2 rounded-lg border border-ok/40 bg-ok-l px-3.5 py-2.5 text-sm text-ok">
              {t.settings.saved}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <button
              type="submit"
              disabled={pending || slugStatus === "taken" || slugStatus === "invalid"}
              className="w-full rounded-lg bg-accent px-6 py-3 text-base font-semibold text-white transition-opacity disabled:opacity-50 md:w-auto"
            >
              {pending ? t.common.loading : t.settings.saveChanges}
            </button>
            <span className="text-[12.5px] text-faint">{t.settings.rulesBesideSave}</span>
          </div>
        </form>

        <div className="mt-8">
          <HoursMode current={initial.schedule_type} />
        </div>
      </div>
    </div>
  );
}
