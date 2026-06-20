"use client";

import { useActionState } from "react";
import { finishServicesStep, type ActionState } from "@/lib/onboarding/actions";
import { getDictionary } from "@/lib/i18n";
import { PrimaryButton, ErrorText } from "@/components/provider/ui";
import { OnboardingProgress } from "@/components/provider/onboarding-progress";
import { ServicesEditor, type Service } from "@/components/provider/services-editor";

const t = getDictionary();

export type { Service };

export function ServicesStep({ services }: { services: Service[] }) {
  const [finishState, finishAction, finishPending] = useActionState<
    ActionState,
    FormData
  >(async () => finishServicesStep(), {});

  return (
    <main className="mx-auto w-full max-w-md px-5 py-8">
      <OnboardingProgress step={2} />
      <h1 className="mt-1.5 font-serif text-[25px] font-semibold leading-tight text-ink">
        {t.onboarding.servicesTitle}
      </h1>
      <p className="mb-6 mt-2 text-sm text-ink-3">{t.onboarding.servicesHint}</p>

      <ServicesEditor services={services} />

      <form action={finishAction}>
        {finishState.error === "no_services" && (
          <ErrorText>{t.onboarding.servicesHint}</ErrorText>
        )}
        <PrimaryButton disabled={finishPending || services.length === 0}>
          {finishPending ? t.common.loading : t.common.continue}
        </PrimaryButton>
      </form>
    </main>
  );
}
