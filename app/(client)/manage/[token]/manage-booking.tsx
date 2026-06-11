"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import {
  cancelViaToken,
  rescheduleViaToken,
  type ManageActionState,
} from "@/lib/booking/manage";
import { placeHold, type HoldState } from "@/lib/booking/actions";
import { localDateOf } from "@/app/(client)/b/[slug]/booking-flow";
import { getDictionary, fill } from "@/lib/i18n";

const t = getDictionary();
const TZ = "Europe/Brussels";

function slotLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-BE", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type PublicSlot = { startsAt: string; endsAt: string };

export function ManageBooking({
  token,
  slug,
  businessName,
  providerEmail,
  clientFirstName,
  serviceId,
  serviceName,
  startsAt,
  whenText,
  cancellationWindowHours,
}: {
  token: string;
  slug: string;
  businessName: string;
  providerEmail: string;
  clientFirstName: string;
  serviceId: string;
  serviceName: string;
  startsAt: string;
  whenText: string;
  cancellationWindowHours: number;
}) {
  const [mode, setMode] = useState<"view" | "confirm-cancel" | "reschedule">("view");
  const [cancelState, cancelAction, cancelPending] = useActionState<
    ManageActionState,
    FormData
  >(cancelViaToken, {});
  const [reState, reAction, rePending] = useActionState<
    ManageActionState,
    FormData
  >(rescheduleViaToken, {});
  const [slots, setSlots] = useState<PublicSlot[] | null>(null);
  const [hold, holdAction] = useActionState<HoldState, FormData>(placeHold, {});
  const pickedRef = useRef<PublicSlot | null>(null);

  const loadSlots = useCallback(async () => {
    setSlots(null);
    const res = await fetch(`/api/b/${slug}/slots?service=${serviceId}`);
    const body = await res.json();
    setSlots(body.slots ?? []);
  }, [slug, serviceId]);

  useEffect(() => {
    if (mode === "reschedule" && slots === null) void loadSlots();
  }, [mode, slots, loadSlots]);

  // After a hold is placed, immediately attempt the reschedule swap.
  useEffect(() => {
    if (hold.ok && pickedRef.current) {
      const fd = new FormData();
      fd.set("token", token);
      fd.set("hold_id", hold.holdId);
      reAction(fd);
      pickedRef.current = null;
    }
    if (hold.ok === false) void loadSlots();
  }, [hold, token, reAction, loadSlots]);

  const late =
    (cancelState.ok === false && cancelState.reason === "late") ||
    (reState.ok === false && reState.reason === "late");

  if (cancelState.ok) {
    return (
      <div>
        <p className="mb-4 font-serif text-xl text-stone-900">{t.client.cancelled}</p>
        <a
          href={`/b/${slug}`}
          className="block w-full rounded-xl bg-stone-900 px-4 py-3 text-center font-semibold text-amber-50"
        >
          {t.client.bookAgain}
        </a>
      </div>
    );
  }
  if (reState.ok) {
    return (
      <div>
        <p className="mb-2 font-serif text-xl text-stone-900">{t.client.rescheduled}</p>
        <p className="font-mono text-stone-700">{reState.whenText}</p>
        <p className="mt-3 text-sm text-stone-500">
          {fill(t.client.confirmationSent, { email: "your inbox" })}
        </p>
        <a href={`/b/${slug}`} className="mt-4 inline-block text-sm text-stone-600 underline">
          ← {businessName}
        </a>
      </div>
    );
  }

  if (late) {
    return (
      <div>
        <h1 className="mb-2 font-serif text-xl text-stone-900">{t.client.lateTitle}</h1>
        <p className="mb-3 text-sm text-stone-600">
          {fill(t.client.lateBody, { name: businessName, hours: cancellationWindowHours })}
        </p>
        <a
          href={`mailto:${providerEmail}`}
          className="font-mono text-sm text-stone-900 underline"
        >
          {providerEmail}
        </a>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-stone-500">Hi {clientFirstName},</p>
      <h1 className="mb-1 font-serif text-2xl text-stone-900">{serviceName}</h1>
      <p className="mb-1 font-mono text-stone-700">{whenText}</p>
      <p className="mb-6 text-sm text-stone-500">{businessName}</p>

      {(cancelState.ok === false || reState.ok === false) && !late && (
        <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-stone-700">
          {reState.ok === false &&
          (reState.reason === "taken" || reState.reason === "released")
            ? t.client.justTaken
            : t.common.somethingWrong}
        </p>
      )}

      {mode === "view" && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setMode("reschedule")}
            className="w-full rounded-xl bg-stone-900 px-4 py-3 font-semibold text-amber-50"
          >
            {t.client.rescheduleTitle}
          </button>
          <button
            type="button"
            onClick={() => setMode("confirm-cancel")}
            className="w-full rounded-xl border border-stone-900 px-4 py-3 font-semibold text-stone-900"
          >
            {t.client.cancelTitle}
          </button>
          <p className="text-xs text-stone-500">{t.client.serviceChangeNote}</p>
        </div>
      )}

      {mode === "confirm-cancel" && (
        <form action={cancelAction} className="space-y-3">
          <input type="hidden" name="token" value={token} />
          <p className="text-sm text-stone-700">{t.client.cancelTitle}</p>
          <button
            type="submit"
            disabled={cancelPending}
            className="w-full rounded-xl bg-stone-900 px-4 py-3 font-semibold text-amber-50 disabled:opacity-50"
          >
            {cancelPending ? t.common.loading : t.client.cancelConfirm}
          </button>
          <button
            type="button"
            onClick={() => setMode("view")}
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-700"
          >
            {t.common.back}
          </button>
        </form>
      )}

      {mode === "reschedule" && (
        <div>
          <h2 className="mb-3 font-serif text-lg text-stone-900">
            {t.client.rescheduleTitle}
          </h2>
          {slots === null ? (
            <p className="text-sm text-stone-400">{t.common.loading}</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-stone-600">{t.client.noSlotsAtAll}</p>
          ) : (
            <div className="space-y-2">
              {slots
                .filter((s) => s.startsAt !== startsAt)
                .map((slot) => (
                  <button
                    key={slot.startsAt}
                    type="button"
                    disabled={rePending}
                    onClick={() => {
                      pickedRef.current = slot;
                      const fd = new FormData();
                      fd.set("slug", slug);
                      fd.set("service_id", serviceId);
                      fd.set("starts_at", slot.startsAt);
                      fd.set("date", localDateOf(slot.startsAt));
                      holdAction(fd);
                    }}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-left font-mono text-sm text-stone-800 shadow-sm disabled:opacity-50"
                  >
                    {slotLabel(slot.startsAt)}
                  </button>
                ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setMode("view")}
            className="mt-4 text-sm text-stone-600 underline"
          >
            {t.client.keepOriginal}
          </button>
        </div>
      )}
    </div>
  );
}
