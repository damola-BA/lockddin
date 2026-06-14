"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveProfile, type ActionState } from "@/lib/onboarding/actions";
import { normalizeSlug } from "@/lib/onboarding/slug";
import { getDictionary, fill } from "@/lib/i18n";
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
} | null;

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function ProfileForm({ initial }: { initial: Initial }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveProfile,
    {},
  );
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Real-time availability as they type (F2).
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!slug) {
      setSlugStatus("idle");
      return;
    }
    if (slug === initial?.slug) {
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
  }, [slug, initial?.slug]);

  return (
    <main className="mx-auto w-full max-w-md px-5 py-10">
      <p className="mb-2 text-xs tracking-widest text-ink-3">
        {fill(t.onboarding.stepOf, { current: 1, total: 3 })}
      </p>
      <PageTitle>{t.onboarding.profileTitle}</PageTitle>
      <Hint>&nbsp;</Hint>

      <form action={formAction} className="space-y-5">
        <div>
          <Label htmlFor="business_name">{t.onboarding.businessName}</Label>
          <TextInput
            id="business_name"
            name="business_name"
            defaultValue={initial?.business_name ?? ""}
            required
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="provider_name">{t.onboarding.providerName}</Label>
          <TextInput
            id="provider_name"
            name="provider_name"
            defaultValue={initial?.provider_name ?? ""}
            required
          />
        </div>
        <div>
          <Label htmlFor="city">{t.onboarding.city}</Label>
          <TextInput id="city" name="city" defaultValue={initial?.city ?? ""} required />
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
        </div>

        <div>
          <Label htmlFor="location_text">{t.onboarding.locationLabel}</Label>
          <TextInput
            id="location_text"
            name="location_text"
            defaultValue={initial?.location_text ?? ""}
            placeholder="e.g. Rue de la Paix 12, 1000 Brussels"
          />
          <p className="mt-1.5 text-sm text-ink-3">{t.onboarding.locationHint}</p>
        </div>

        {/* Booking rules (window, cancellation, lead time, buffer) start on
            sensible defaults and are tuned later in Settings (DD34) — a new
            provider has no basis to decide them cold. */}
        <p className="rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-3">
          {t.onboarding.rulesNote}
        </p>

        {state.error === "missing_fields" && (
          <ErrorText>{t.common.somethingWrong}</ErrorText>
        )}
        {state.error === "slug_invalid" && <ErrorText>{t.onboarding.slugInvalid}</ErrorText>}
        {state.error === "slug_taken" && <ErrorText>{t.onboarding.slugTaken}</ErrorText>}
        {state.error === "server" && <ErrorText>{t.common.somethingWrong}</ErrorText>}

        <PrimaryButton disabled={pending || slugStatus === "taken" || slugStatus === "invalid"}>
          {pending ? t.common.loading : t.common.continue}
        </PrimaryButton>
      </form>
    </main>
  );
}
