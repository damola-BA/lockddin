"use client";

import { useActionState } from "react";
import { signIn, type ActionState } from "@/lib/auth/actions";
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

export default function SignInPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    signIn,
    {},
  );

  return (
    <AuthShell panelTitle={t.auth.panelTitle} panelBody={t.auth.panelBody}>
      <PageTitle>{t.auth.signInTitle}</PageTitle>
      <form action={formAction} className="mt-4">
          <Label htmlFor="email">{t.auth.emailLabel}</Label>
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
          />
          <div className="mt-4">
            <Label htmlFor="password">{t.auth.passwordLabel}</Label>
            <TextInput
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {state.error === "bad_credentials" && (
            <ErrorText>{t.auth.signInFailed}</ErrorText>
          )}
          <PrimaryButton disabled={pending}>
            {pending ? t.common.loading : t.auth.signIn}
          </PrimaryButton>
        </form>
      <div className="mt-6 space-y-2 text-sm text-ink-3">
        <p>
          <a href="/reset" className="text-accent underline">
            {t.auth.forgotPassword}
          </a>
        </p>
        <p>
          {t.auth.noAccount}{" "}
          <a href="/onboarding/email" className="text-accent underline">
            {t.auth.createAccount}
          </a>
        </p>
      </div>
    </AuthShell>
  );
}
