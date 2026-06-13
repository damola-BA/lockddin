"use client";

import { useActionState, useEffect, useState } from "react";
import {
  providerCancelBooking,
  providerReschedule,
  toggleNoShow,
  rescheduleSlots,
  CANCEL_REASONS,
  type DashActionState,
} from "@/lib/dashboard/actions";
import { getDictionary, fill } from "@/lib/i18n";

const t = getDictionary();

type Mode = "menu" | "cancel" | "reschedule";

export function BookingActions({
  bookingId,
  providerId,
  serviceIds,
  clientName,
  businessName,
  serviceName,
  whenText,
  isPast,
  isNoShow,
}: {
  bookingId: string;
  providerId: string;
  serviceIds: string[];
  slug: string;
  clientName: string;
  businessName: string;
  serviceName: string;
  whenText: string;
  isPast: boolean;
  isNoShow: boolean;
  timezone: string;
}) {
  const [mode, setMode] = useState<Mode>("menu");

  // Past bookings: the only action is the gentle no-show prompt (AD08).
  if (isPast) {
    return (
      <NoShowControl bookingId={bookingId} clientName={clientName} isNoShow={isNoShow} />
    );
  }

  if (mode === "cancel") {
    return (
      <CancelForm
        bookingId={bookingId}
        clientName={clientName}
        businessName={businessName}
        serviceName={serviceName}
        whenText={whenText}
        onBack={() => setMode("menu")}
      />
    );
  }

  if (mode === "reschedule") {
    return (
      <RescheduleForm
        bookingId={bookingId}
        providerId={providerId}
        serviceIds={serviceIds}
        onBack={() => setMode("menu")}
      />
    );
  }

  return (
    <div className="mt-6 space-y-3">
      <button
        type="button"
        onClick={() => setMode("reschedule")}
        className="w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 font-semibold text-stone-100"
      >
        {t.dashboard.rescheduleBooking}
      </button>
      <button
        type="button"
        onClick={() => setMode("cancel")}
        className="w-full rounded-xl border border-red-500/40 bg-stone-900 px-4 py-3 font-semibold text-red-300"
      >
        {t.dashboard.cancelBooking}
      </button>
    </div>
  );
}

function NoShowControl({
  bookingId,
  clientName,
  isNoShow,
}: {
  bookingId: string;
  clientName: string;
  isNoShow: boolean;
}) {
  const [state, action, pending] = useActionState<DashActionState, FormData>(
    toggleNoShow,
    {},
  );
  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="is_no_show" value={isNoShow ? "false" : "true"} />
      {!isNoShow ? (
        <>
          <p className="mb-3 text-sm text-stone-400">
            {fill(t.dashboard.markNoShow, { name: clientName })}
          </p>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 font-semibold text-stone-100 disabled:opacity-50"
          >
            {t.dashboard.markedNoShow}
          </button>
        </>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-stone-300 disabled:opacity-50"
        >
          {t.dashboard.undoNoShow}
        </button>
      )}
      {state.error && <p className="mt-2 text-sm text-red-400">{t.common.somethingWrong}</p>}
    </form>
  );
}

function CancelForm({
  bookingId,
  clientName,
  businessName,
  serviceName,
  whenText,
  onBack,
}: {
  bookingId: string;
  clientName: string;
  businessName: string;
  serviceName: string;
  whenText: string;
  onBack: () => void;
}) {
  const [state, action, pending] = useActionState<DashActionState, FormData>(
    providerCancelBooking,
    {},
  );
  const [reason, setReason] = useState("unwell");
  const [reasonText, setReasonText] = useState("");

  if (state.ok) {
    return (
      <div className="mt-6 rounded-xl border border-stone-700 bg-stone-900 p-5 text-center">
        <p className="mb-3 font-serif text-lg text-stone-100">
          {fill(t.dashboard.cancelDone, { name: clientName })}
        </p>
        <a
          href="/dashboard"
          className="inline-block rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-stone-950"
        >
          {t.dashboard.viewDay}
        </a>
      </div>
    );
  }

  const reasonLabel =
    reason === "other" ? reasonText || CANCEL_REASONS.other : CANCEL_REASONS[reason];
  const previewReason =
    reason === "other" && reasonText ? `"${reasonText}"` : `Their reason: ${reasonLabel}.`;

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="booking_id" value={bookingId} />
      <button type="button" onClick={onBack} className="text-sm text-stone-400 underline">
        ← {t.dashboard.backToBooking}
      </button>

      <p className="font-serif text-lg">{t.dashboard.cancelReasonTitle}</p>
      <div className="space-y-2">
        {Object.entries(CANCEL_REASONS).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="reason"
              value={key}
              checked={reason === key}
              onChange={() => setReason(key)}
              className="accent-amber-400"
            />
            {label}
          </label>
        ))}
      </div>

      {reason === "other" && (
        <input
          name="reason_text"
          value={reasonText}
          onChange={(e) => setReasonText(e.target.value)}
          placeholder={t.dashboard.reasonText}
          className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2.5 text-sm text-stone-100"
        />
      )}

      <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-stone-300">
        <p className="mb-1 font-medium text-stone-100">
          {fill(t.dashboard.cancelPreviewTitle, { name: clientName })}
        </p>
        <p>
          {fill(t.dashboard.cancelPreviewBody, {
            name: clientName,
            business: businessName,
            service: serviceName,
            when: whenText,
            reason: previewReason,
          })}
        </p>
      </div>

      {state.error && <p className="text-sm text-red-400">{t.common.somethingWrong}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-red-500 px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {pending ? t.common.loading : fill(t.dashboard.confirmCancel, { name: clientName })}
      </button>
    </form>
  );
}

function RescheduleForm({
  bookingId,
  providerId,
  serviceIds,
  onBack,
}: {
  bookingId: string;
  providerId: string;
  serviceIds: string[];
  onBack: () => void;
}) {
  const [state, action, pending] = useActionState<DashActionState, FormData>(
    providerReschedule,
    {},
  );
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<{ startsAt: string; label: string }[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const serviceCsv = serviceIds.join(",");

  useEffect(() => {
    if (!date) return;
    setSlots(null);
    setPicked(null);
    rescheduleSlots(providerId, serviceIds, date).then(setSlots);
  }, [date, providerId, serviceCsv]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="service_ids" value={serviceCsv} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="starts_at" value={picked ?? ""} />

      <button type="button" onClick={onBack} className="text-sm text-stone-400 underline">
        ← {t.dashboard.backToBooking}
      </button>
      <p className="font-serif text-lg">{t.dashboard.rescheduleTitle}</p>

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2.5 text-stone-100"
      />

      {date && slots === null && <p className="text-sm text-stone-500">{t.common.loading}</p>}
      {slots !== null && slots.length === 0 && (
        <p className="text-sm text-stone-500">{t.dashboard.rescheduleNoSlots}</p>
      )}
      {slots && slots.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {slots.map((s) => (
            <button
              key={s.startsAt}
              type="button"
              onClick={() => setPicked(s.startsAt)}
              className={`rounded-lg px-3 py-2 font-mono text-sm ${
                picked === s.startsAt
                  ? "bg-amber-400 font-semibold text-stone-950"
                  : "border border-stone-700 text-stone-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {state.error && (
        <p className="text-sm text-red-400">
          {state.error === "slot_taken" ? t.client.justTaken : t.common.somethingWrong}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || !picked}
        className="w-full rounded-xl bg-amber-400 px-4 py-3 font-semibold text-stone-950 disabled:opacity-50"
      >
        {pending ? t.common.loading : t.dashboard.rescheduleBooking}
      </button>
    </form>
  );
}
