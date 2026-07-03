"use client";

import { useActionState, useState } from "react";
import { deleteClient, type DashActionState } from "@/lib/dashboard/actions";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary();

export function DeleteClient({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState<DashActionState, FormData>(
    deleteClient,
    {},
  );
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <div className="mt-10 flex justify-center border-t border-line-2 pt-6">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-[13px] font-semibold text-no transition-opacity hover:opacity-80"
        >
          {t.dashboard.deleteClient}
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="mt-10 rounded-2xl border border-no/40 bg-no-l/60 p-4">
      <input type="hidden" name="client_id" value={clientId} />
      <p className="mb-3.5 text-[13px] leading-relaxed text-ink-2">{t.dashboard.deleteClientConfirm}</p>
      {state.error && <p className="mb-2.5 text-[13px] font-medium text-no">{t.common.somethingWrong}</p>}
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] font-semibold text-ink-2"
        >
          {t.common.cancel}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-no px-3 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
        >
          {pending ? t.common.loading : t.dashboard.deleteClientCta}
        </button>
      </div>
    </form>
  );
}
