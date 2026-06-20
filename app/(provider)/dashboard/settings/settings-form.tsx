"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  updateProfileSettings,
  type SettingsState,
} from "@/lib/dashboard/settings-actions";
import { normalizeSlug } from "@/lib/onboarding/slug";
import { getDictionary } from "@/lib/i18n";
import {
  PageTitle,
  Hint,
  Label,
  TextInput,
  PrimaryButton,
  ErrorText,
} from "@/components/provider/ui";

const t = getDictionary();

type Initial = {
  business_name: string | null;
  provider_name: string | null;
  city: string | null;
  slug: string;
  location_text: string | null;
};

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

          <PrimaryButton
            disabled={pending || slugStatus === "taken" || slugStatus === "invalid"}
          >
            {pending ? t.common.loading : t.common.save}
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}
