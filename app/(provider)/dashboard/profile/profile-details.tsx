"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { Lock, Pencil } from "lucide-react";
import {
  updateProfileSettings,
  type SettingsState,
} from "@/lib/dashboard/settings-actions";
import { normalizeSlug } from "@/lib/onboarding/slug";
import { getDictionary } from "@/lib/i18n";
import { Label, TextInput, ErrorText } from "@/components/provider/ui";

const t = getDictionary();

type Initial = {
  business_name: string | null;
  provider_name: string | null;
  city: string | null;
  slug: string;
  location_text: string | null;
};

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

// Profile details. By default a read-only view (the identity fields read as a
// profile, not a form); the three shared-everywhere fields — business name, your
// name and the booking link — carry a lock. Tapping Edit unlocks the whole form.
export function ProfileDetails({ initial }: { initial: Initial }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateProfileSettings,
    {},
  );
  const [slug, setSlug] = useState(initial.slug);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Leave edit mode once a save lands (revalidation refreshes `initial`).
  useEffect(() => {
    if (state.ok) setEditing(false);
  }, [state.ok]);

  useEffect(() => {
    if (!editing) return;
    clearTimeout(debounceRef.current);
    if (!slug) {
      setSlugStatus("idle");
      return;
    }
    if (slug === initial.slug) {
      setSlugStatus("available");
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
  }, [slug, initial.slug, editing]);

  if (!editing) {
    return (
      <section>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-ink">{t.profile.title}</h2>
            <p className="mt-1 text-sm text-ink-3">{t.profile.intro}</p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink-2 hover:bg-surface-2"
          >
            <Pencil size={14} strokeWidth={2} /> {t.profile.edit}
          </button>
        </div>

        <dl className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface">
          <ViewRow label={t.onboarding.businessName} value={initial.business_name} locked />
          <ViewRow label={t.onboarding.providerName} value={initial.provider_name} locked />
          <ViewRow label={t.onboarding.city} value={initial.city} />
          <ViewRow
            label={t.profile.bookingLink}
            value={`lockddin.app/b/${initial.slug}`}
            locked
          />
          <ViewRow label={t.onboarding.locationLabel} value={initial.location_text} />
        </dl>
        <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-faint">
          <Lock size={12} strokeWidth={2} /> {t.profile.lockedHint}
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="font-serif text-2xl text-ink">{t.profile.title}</h2>
      <p className="mt-1 mb-4 text-sm text-ink-3">{t.profile.intro}</p>

      <form action={formAction} className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="business_name">{t.onboarding.businessName}</Label>
            <TextInput id="business_name" name="business_name" defaultValue={initial.business_name ?? ""} required />
          </div>
          <div>
            <Label htmlFor="provider_name">{t.onboarding.providerName}</Label>
            <TextInput id="provider_name" name="provider_name" defaultValue={initial.provider_name ?? ""} required />
          </div>
        </div>
        <div>
          <Label htmlFor="city">{t.onboarding.city}</Label>
          <TextInput id="city" name="city" defaultValue={initial.city ?? ""} required />
        </div>

        <div>
          <Label htmlFor="slug">{t.profile.bookingLink}</Label>
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
            {slugStatus === "checking" && <span className="text-ink-3">{t.onboarding.slugChecking}</span>}
            {slugStatus === "available" && <span className="text-ok">{t.onboarding.slugAvailable}</span>}
            {slugStatus === "taken" && <span className="text-red-600">{t.onboarding.slugTaken}</span>}
            {slugStatus === "invalid" && <span className="text-red-600">{t.onboarding.slugInvalid}</span>}
            {slugStatus === "idle" && <span className="text-ink-3">{t.onboarding.slugHint}</span>}
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

        {state.error === "slug_invalid" && <ErrorText>{t.onboarding.slugInvalid}</ErrorText>}
        {state.error === "slug_taken" && <ErrorText>{t.onboarding.slugTaken}</ErrorText>}
        {(state.error === "missing_fields" || state.error === "server") && (
          <ErrorText>{t.common.somethingWrong}</ErrorText>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || slugStatus === "taken" || slugStatus === "invalid"}
            className="rounded-lg bg-accent px-6 py-3 text-base font-semibold text-white transition-opacity disabled:opacity-50"
          >
            {pending ? t.common.loading : t.settings.saveChanges}
          </button>
          <button
            type="button"
            onClick={() => {
              setSlug(initial.slug);
              setEditing(false);
            }}
            className="text-sm font-semibold text-ink-3"
          >
            {t.common.cancel}
          </button>
        </div>
      </form>
    </section>
  );
}

function ViewRow({
  label,
  value,
  locked,
}: {
  label: string;
  value: string | null;
  locked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3.5 last:border-b-0">
      <dt className="flex items-center gap-1.5 text-[13px] text-ink-3">
        {locked && <Lock size={12} strokeWidth={2} className="text-faint" />}
        {label}
      </dt>
      <dd className="truncate text-right text-sm font-semibold text-ink">{value || "—"}</dd>
    </div>
  );
}
