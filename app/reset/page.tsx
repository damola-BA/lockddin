"use client";

import { useActionState } from "react";
import { requestPasswordReset, type ActionState } from "@/lib/auth/actions";
import { getDictionary } from "@/lib/i18n";
import {
  FormCard,
  PageTitle,
  Hint,
  Label,
  TextInput,
  PrimaryButton,
  ErrorText,
} from "@/components/provider/ui";

const t = getDictionary();

export default function ResetRequestPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    requestPasswordReset,
    {},
  );

  return (
    <div className="min-h-dvh bg-stone-950 text-stone-100">
      <FormCard>
        <PageTitle>{t.auth.resetTitle}</PageTitle>
        <Hint>{t.auth.resetHint}</Hint>
        {state.ok ? (
          <p className="rounded-lg border border-stone-700 bg-stone-900 p-4 text-sm text-stone-300">
            {t.auth.resetSent}
          </p>
        ) : (
          <form action={formAction}>
            <Label htmlFor="email">{t.auth.emailLabel}</Label>
            <TextInput
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
            />
            {state.error === "invalid_email" && (
              <ErrorText>{t.auth.emailInvalid}</ErrorText>
            )}
            <PrimaryButton disabled={pending}>
              {pending ? t.common.loading : t.auth.sendResetLink}
            </PrimaryButton>
          </form>
        )}
      </FormCard>
    </div>
  );
}
