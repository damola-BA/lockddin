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
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mt-10 w-full rounded-xl border border-red-300 px-4 py-3 text-sm text-red-600"
      >
        {t.dashboard.deleteClient}
      </button>
    );
  }

  return (
    <form action={action} className="mt-10 rounded-xl border border-red-300 bg-red-50 p-4">
      <input type="hidden" name="client_id" value={clientId} />
      <p className="mb-3 text-sm text-ink-2">{t.dashboard.deleteClientConfirm}</p>
      {state.error && <p className="mb-2 text-sm text-red-600">{t.common.somethingWrong}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="flex-1 rounded-lg border border-line px-3 py-2 text-sm text-ink-2"
        >
          {t.common.cancel}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? t.common.loading : t.dashboard.deleteClientCta}
        </button>
      </div>
    </form>
  );
}
