"use client";

import { useActionState } from "react";
import { finishServicesStep, type ActionState } from "@/lib/onboarding/actions";
import { getDictionary, fill } from "@/lib/i18n";
import { PageTitle, Hint, PrimaryButton, ErrorText } from "@/components/provider/ui";
import { ServicesEditor, type Service } from "@/components/provider/services-editor";

const t = getDictionary();

export type { Service };

export function ServicesStep({ services }: { services: Service[] }) {
  const [finishState, finishAction, finishPending] = useActionState<
    ActionState,
    FormData
  >(async () => finishServicesStep(), {});

  return (
    <main className="mx-auto w-full max-w-md px-5 py-10">
      <p className="mb-2 text-xs tracking-widest text-ink-3">
        {fill(t.onboarding.stepOf, { current: 2, total: 3 })}
      </p>
      <PageTitle>{t.onboarding.servicesTitle}</PageTitle>
      <Hint>{t.onboarding.servicesHint}</Hint>

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
