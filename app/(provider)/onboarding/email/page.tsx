"use client";

import { useActionState } from "react";
import { submitEmail, type ActionState } from "@/lib/auth/actions";
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

export default function EmailStep() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    submitEmail,
    {},
  );

  return (
    <FormCard>
      <PageTitle>{t.auth.emailTitle}</PageTitle>
      <Hint>{t.auth.emailHint}</Hint>
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
        {state.error === "server" && (
          <ErrorText>{t.common.somethingWrong}</ErrorText>
        )}
        <PrimaryButton disabled={pending}>
          {pending ? t.common.loading : t.common.continue}
        </PrimaryButton>
      </form>
      <p className="mt-6 text-center text-sm text-ink-3">
        {t.auth.alreadyHaveAccount}{" "}
        <a href="/signin" className="text-accent underline">
          {t.auth.signInInstead}
        </a>
      </p>
    </FormCard>
  );
}
