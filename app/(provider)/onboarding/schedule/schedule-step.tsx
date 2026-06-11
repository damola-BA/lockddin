"use client";

import { useActionState } from "react";
import { completeOnboarding, type ActionState } from "@/lib/onboarding/actions";
import { resendVerification } from "@/lib/auth/actions";
import { getDictionary, fill } from "@/lib/i18n";
import { PageTitle, Hint, PrimaryButton, ErrorText } from "@/components/provider/ui";

const t = getDictionary();

function ResendLink() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async () => resendVerification(),
    {},
  );
  return (
    <form action={formAction} className="inline">
      {state.ok ? (
        <span className="text-emerald-400">{t.auth.verificationResent}</span>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="text-amber-400 underline disabled:opacity-50"
        >
          {t.auth.resendVerification}
        </button>
      )}
    </form>
  );
}

export function ScheduleStep({
  email,
  initialType,
  emailVerified,
}: {
  email: string;
  initialType: string;
  emailVerified: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    completeOnboarding,
    {},
  );

  return (
    <main className="mx-auto w-full max-w-md px-5 py-10">
      <p className="mb-2 text-xs tracking-widest text-stone-500">
        {fill(t.onboarding.stepOf, { current: 3, total: 3 })}
      </p>
      <PageTitle>{t.onboarding.scheduleTitle}</PageTitle>
      <Hint>{t.onboarding.scheduleReassurance}</Hint>

      <form action={formAction} className="space-y-3">
        <label className="block cursor-pointer rounded-lg border border-stone-700 bg-stone-900 p-4 has-checked:border-amber-400">
          <span className="flex items-center gap-3">
            <input
              type="radio"
              name="schedule_type"
              value="regular"
              defaultChecked={initialType !== "flexible"}
              className="accent-amber-400"
            />
            <span className="font-medium text-stone-100">
              {t.onboarding.scheduleRegular}
            </span>
          </span>
          <span className="mt-1 block pl-7 text-sm text-stone-400">
            {t.onboarding.scheduleRegularHint}
          </span>
        </label>

        <label className="block cursor-pointer rounded-lg border border-stone-700 bg-stone-900 p-4 has-checked:border-amber-400">
          <span className="flex items-center gap-3">
            <input
              type="radio"
              name="schedule_type"
              value="flexible"
              defaultChecked={initialType === "flexible"}
              className="accent-amber-400"
            />
            <span className="font-medium text-stone-100">
              {t.onboarding.scheduleFlexible}
            </span>
          </span>
          <span className="mt-1 block pl-7 text-sm text-stone-400">
            {t.onboarding.scheduleFlexibleHint}
          </span>
        </label>

        {!emailVerified && (
          <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-stone-200">
            {fill(t.auth.verifyNeeded, { email })} <ResendLink />
          </div>
        )}
        {state.error === "unverified" && (
          <ErrorText>{fill(t.auth.verifyNeeded, { email })}</ErrorText>
        )}
        {state.error === "pick_one" && <ErrorText>{t.common.somethingWrong}</ErrorText>}
        {state.error === "server" && <ErrorText>{t.common.somethingWrong}</ErrorText>}

        <PrimaryButton disabled={pending}>
          {pending ? t.common.loading : t.onboarding.finish}
        </PrimaryButton>
      </form>
    </main>
  );
}
