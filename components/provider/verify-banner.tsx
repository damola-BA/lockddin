"use client";

import { useActionState } from "react";
import { resendVerification, type ActionState } from "@/lib/auth/actions";
import { getDictionary, fill } from "@/lib/i18n";

const t = getDictionary();

// Email verification no longer blocks finishing onboarding (DD34) — this
// persistent, dismissable-by-verifying nudge lives on the dashboard instead,
// so a provider reaches their link immediately and confirms email in parallel.
export function VerifyBanner({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async () => resendVerification(),
    {},
  );

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-accent/40 bg-accent-l px-4 py-3 text-sm text-ink">
      <span>{fill(t.dashboard.verifyBanner, { email })}</span>
      {state.ok ? (
        <span className="font-medium text-ok">{t.dashboard.verifyResent}</span>
      ) : (
        <form action={formAction} className="inline">
          <button
            type="submit"
            disabled={pending}
            className="font-semibold text-accent underline disabled:opacity-50"
          >
            {t.dashboard.verifyResend}
          </button>
        </form>
      )}
    </div>
  );
}
