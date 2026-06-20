"use client";

import { useActionState, useState } from "react";
import { completeOnboarding, type ActionState } from "@/lib/onboarding/actions";
import { getDictionary } from "@/lib/i18n";
import { PrimaryButton, ErrorText } from "@/components/provider/ui";
import { OnboardingProgress } from "@/components/provider/onboarding-progress";
import type { TemplateDayData } from "@/app/(provider)/dashboard/schedule/template-editor";
import { FlexibleBatchAdd } from "@/app/(provider)/dashboard/schedule/flexible-batch-add";
import { QuickWeekSetup } from "./quick-week-setup";

const t = getDictionary();

export function ScheduleStep({
  initialType,
  templateDays,
}: {
  initialType: string;
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
    <main className="mx-auto w-full max-w-md px-5 py-8">
      <OnboardingProgress step={3} />
      <h1 className="mt-1.5 font-serif text-[25px] font-semibold leading-tight text-ink">
        {t.onboarding.hoursQuestion}
      </h1>
      <p className="mb-6 mt-2 text-sm text-ink-3">{t.onboarding.scheduleReassurance}</p>

      <div className="space-y-3">
        <label className="block cursor-pointer rounded-lg border border-line bg-surface p-4 has-checked:border-accent">
          <span className="flex items-center gap-3">
            <input
              type="radio"
              name="schedule_type_choice"
              value="regular"
              checked={type === "regular"}
              onChange={() => setType("regular")}
              className="accent-accent"
            />
            <span className="font-medium text-ink">{t.onboarding.hoursRegular}</span>
          </span>
          <span className="mt-1 block pl-7 text-sm text-ink-3">
            {t.onboarding.hoursRegularHint}
          </span>
        </label>

        <label className="block cursor-pointer rounded-lg border border-line bg-surface p-4 has-checked:border-accent">
          <span className="flex items-center gap-3">
            <input
              type="radio"
              name="schedule_type_choice"
              value="flexible"
              checked={type === "flexible"}
              onChange={() => setType("flexible")}
              className="accent-accent"
            />
            <span className="font-medium text-ink">{t.onboarding.hoursFlexible}</span>
          </span>
          <span className="mt-1 block pl-7 text-sm text-ink-3">
            {t.onboarding.hoursFlexibleHint}
          </span>
        </label>
      </div>

      <div className="mt-6 border-t border-line pt-4">
        {/* Flexible mode adds open days incrementally via its own form, so it
            sits outside the single Finish form below. */}
        {type === "flexible" && <FlexibleBatchAdd />}

        <form action={formAction} className="mt-2 space-y-4">
          <input type="hidden" name="schedule_type" value={type} />

          {/* Regular mode: the week is saved as part of this one submit
              (DD34) — no separate save button to forget. */}
          {type === "regular" && (
            <QuickWeekSetup
              initialWeekdays={templateDays.map((d) => d.weekday)}
              initialStart={templateDays[0]?.start ?? "09:00"}
              initialEnd={templateDays[0]?.end ?? "18:00"}
              initialBlocks={templateDays[0]?.blocks ?? []}
            />
          )}

          {state.error === "no_week" && <ErrorText>{t.onboarding.needWeek}</ErrorText>}
          {state.error === "no_days" && <ErrorText>{t.onboarding.needDays}</ErrorText>}
          {(state.error === "pick_one" ||
            state.error === "server" ||
            state.error === "invalid_hours" ||
            state.error === "invalid_blocks") && (
            <ErrorText>{t.common.somethingWrong}</ErrorText>
          )}

          <PrimaryButton disabled={pending}>
            {pending ? t.common.loading : t.onboarding.finishGoLive}
          </PrimaryButton>
        </form>
      </div>
    </main>
  );
}
