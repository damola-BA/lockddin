"use client";

import { useActionState, useState } from "react";
import { completeOnboarding, type ActionState } from "@/lib/onboarding/actions";
import { resendVerification } from "@/lib/auth/actions";
import { getDictionary, fill } from "@/lib/i18n";
import { PageTitle, Hint, PrimaryButton, ErrorText } from "@/components/provider/ui";
import type { TemplateDayData } from "@/app/(provider)/dashboard/schedule/template-editor";
import { FlexibleBatchAdd } from "@/app/(provider)/dashboard/schedule/flexible-batch-add";
import { QuickWeekSetup } from "./quick-week-setup";

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
  templateDays,
}: {
  email: string;
  initialType: string;
  emailVerified: boolean;
  templateDays: TemplateDayData[];
}) {
  const [type, setType] = useState<"regular" | "flexible">(
    initialType === "flexible" ? "flexible" : "regular",
  );
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

      <div className="space-y-3">
        <label className="block cursor-pointer rounded-lg border border-stone-700 bg-stone-900 p-4 has-checked:border-amber-400">
          <span className="flex items-center gap-3">
            <input
              type="radio"
              name="schedule_type_choice"
              value="regular"
              checked={type === "regular"}
              onChange={() => setType("regular")}
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
              name="schedule_type_choice"
              value="flexible"
              checked={type === "flexible"}
              onChange={() => setType("flexible")}
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
      </div>

      {/* The real setup, right here in onboarding (DD16/DD17): one set of
          hours + breaks for the whole week; per-day tweaks and emergency
          changes live in the dashboard. */}
      <div className="mt-6 border-t border-stone-800 pt-4">
        {type === "regular" ? (
          <QuickWeekSetup
            initialWeekdays={templateDays.map((d) => d.weekday)}
            initialStart={templateDays[0]?.start ?? "09:00"}
            initialEnd={templateDays[0]?.end ?? "18:00"}
            initialBlocks={templateDays[0]?.blocks ?? []}
          />
        ) : (
          <FlexibleBatchAdd />
        )}
      </div>

      <form action={formAction} className="mt-8 space-y-3">
        <input type="hidden" name="schedule_type" value={type} />

        {!emailVerified && (
          <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-stone-200">
            {fill(t.auth.verifyNeeded, { email })} <ResendLink />
          </div>
        )}
        {state.error === "unverified" && (
          <ErrorText>{fill(t.auth.verifyNeeded, { email })}</ErrorText>
        )}
        {state.error === "no_week" && <ErrorText>{t.onboarding.needWeek}</ErrorText>}
        {state.error === "no_days" && <ErrorText>{t.onboarding.needDays}</ErrorText>}
        {(state.error === "pick_one" || state.error === "server") && (
          <ErrorText>{t.common.somethingWrong}</ErrorText>
        )}

        <PrimaryButton disabled={pending}>
          {pending ? t.common.loading : t.onboarding.finish}
        </PrimaryButton>
      </form>
    </main>
  );
}
