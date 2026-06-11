"use client";

import { useActionState } from "react";
import { submitPassword, type ActionState } from "@/lib/auth/actions";
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

export default function PasswordStep() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    submitPassword,
    {},
  );

  return (
    <FormCard>
      <PageTitle>{t.auth.passwordTitle}</PageTitle>
      <Hint>{t.auth.passwordHint}</Hint>
      <form action={formAction}>
        <Label htmlFor="password">{t.auth.passwordLabel}</Label>
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          autoFocus
        />
        {state.error === "too_short" && (
          <ErrorText>{t.auth.passwordTooShort}</ErrorText>
        )}
        {state.error === "email_taken" && (
          <ErrorText>
            {t.auth.emailTaken}{" "}
            <a href="/signin" className="underline">
              {t.auth.signInInstead}
            </a>
          </ErrorText>
        )}
        {state.error === "server" && (
          <ErrorText>{t.common.somethingWrong}</ErrorText>
        )}
        <PrimaryButton disabled={pending}>
          {pending ? t.common.loading : t.common.continue}
        </PrimaryButton>
      </form>
    </FormCard>
  );
}
