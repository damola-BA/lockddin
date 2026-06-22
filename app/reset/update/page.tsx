"use client";

import { useActionState } from "react";
import { updatePassword, type ActionState } from "@/lib/auth/actions";
import { getDictionary } from "@/lib/i18n";
import { AuthShell } from "@/components/provider/auth-shell";
import {
  PageTitle,
  Label,
  TextInput,
  PrimaryButton,
  ErrorText,
} from "@/components/provider/ui";

const t = getDictionary();

export default function ResetUpdatePage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updatePassword,
    {},
  );

  return (
    <AuthShell panelTitle={t.auth.panelTitle} panelBody={t.auth.panelBody}>
      <PageTitle>{t.auth.newPasswordTitle}</PageTitle>
      <form action={formAction} className="mt-4">
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
          {state.error === "server" && (
            <ErrorText>{t.common.somethingWrong}</ErrorText>
          )}
          <PrimaryButton disabled={pending}>
            {pending ? t.common.loading : t.common.save}
          </PrimaryButton>
        </form>
    </AuthShell>
  );
}
