"use client";

import { useActionState } from "react";
import { signIn, type ActionState } from "@/lib/auth/actions";
import { getDictionary } from "@/lib/i18n";
import {
  FormCard,
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
    <div className="min-h-dvh bg-stone-950 text-stone-100">
      <FormCard>
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
        <div className="mt-6 space-y-2 text-center text-sm text-stone-400">
          <p>
            <a href="/reset" className="text-amber-400 underline">
              {t.auth.forgotPassword}
            </a>
          </p>
          <p>
            {t.auth.noAccount}{" "}
            <a href="/onboarding/email" className="text-amber-400 underline">
              {t.auth.createAccount}
            </a>
          </p>
        </div>
      </FormCard>
    </div>
  );
}
