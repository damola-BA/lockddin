"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import {
  cancelViaToken,
  rescheduleViaToken,
  type ManageActionState,
} from "@/lib/booking/manage";
import { placeHold, type HoldState } from "@/lib/booking/actions";
import { localDateOf } from "@/app/(client)/b/[slug]/booking-flow";
import { WeekPicker, MonthPicker } from "@/app/(client)/b/[slug]/slot-calendar";
import { fill } from "@/lib/i18n";
import { useT } from "@/lib/i18n/context";
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

function slotTimeOnly(iso: string): string {
  return new Intl.DateTimeFormat("en-BE", {
    timeZone: TZ,
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
  serviceIds,
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
  serviceIds: string[];
  serviceName: string;
  startsAt: string;
  whenText: string;
  cancellationWindowHours: number;
}) {
  const t = useT();
  const serviceCsv = serviceIds.join(",");
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
  const [bookableDays, setBookableDays] = useState<string[]>([]);
  // null = the "Soonest" view (earliest slots across days); a date = that day.
  const [dayDate, setDayDate] = useState<string | null>(null);
  const [daySlots, setDaySlots] = useState<PublicSlot[] | null>(null);
  // Which picker is showing, and the week/month it's anchored on.
  const [view, setView] = useState<"soonest" | "week" | "month">("soonest");
  const [anchor, setAnchor] = useState<string>("");
  const [hold, holdAction] = useActionState<HoldState, FormData>(placeHold, {});
  const pickedRef = useRef<PublicSlot | null>(null);

  const today = localDateOf(new Date().toISOString());
  const bookableSet = new Set(bookableDays);
  const lastBookable = bookableDays.length ? bookableDays[bookableDays.length - 1] : today;

  function openView(next: "soonest" | "week" | "month") {
    setView(next);
    setDayDate(null);
    setDaySlots(null);
    if (next !== "soonest" && !anchor) setAnchor(today);
  }
  function pickDay(date: string) {
    setDayDate(date);
    void loadDay(date);
  }

  const loadSlots = useCallback(async () => {
    setSlots(null);
    const res = await fetch(`/api/b/${slug}/slots?service=${serviceCsv}`, {
      cache: "no-store",
    });
    const body = await res.json();
    setSlots(body.slots ?? []);
    setBookableDays(body.bookableDays ?? []);
  }, [slug, serviceCsv]);

  const loadDay = useCallback(
    async (date: string) => {
      setDaySlots(null);
      const res = await fetch(
        `/api/b/${slug}/slots?service=${serviceCsv}&date=${date}`,
        { cache: "no-store" },
      );
      const body = await res.json();
      setDaySlots(body.slots ?? []);
    },
    [slug, serviceCsv],
  );

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
    // Hold couldn't be placed (someone took it) — refresh the view being shown.
    if (hold.ok === false) {
      if (dayDate) void loadDay(dayDate);
      else void loadSlots();
    }
  }, [hold, token, reAction, loadSlots, loadDay, dayDate]);

  const visibleSlots = view === "soonest" ? slots : dayDate ? daySlots : null;

  const late =
    (cancelState.ok === false && cancelState.reason === "late") ||
    (reState.ok === false && reState.reason === "late");

  if (cancelState.ok) {
    return (
      <div>
        <p className="mb-4 font-serif text-xl text-ink">{t.client.cancelled}</p>
        <a
          href={`/b/${slug}`}
          className="block w-full rounded-xl bg-ink px-4 py-3 text-center font-semibold text-canvas"
        >
          {t.client.bookAgain}
        </a>
      </div>
    );
  }
  if (reState.ok) {
    return (
      <div>
        <p className="mb-2 font-serif text-xl text-ink">{t.client.rescheduled}</p>
        <p className="font-mono text-ink-2">{reState.whenText}</p>
        <p className="mt-3 text-sm text-ink-3">
          {fill(t.client.confirmationSent, { email: "your inbox" })}
        </p>
        <a href={`/b/${slug}`} className="mt-4 inline-block text-sm text-ink-3 underline">
          ← {businessName}
        </a>
      </div>
    );
  }

  if (late) {
    return (
      <div>
        <h1 className="mb-2 font-serif text-xl text-ink">{t.client.lateTitle}</h1>
        <p className="mb-3 text-sm text-ink-3">
          {fill(t.client.lateBody, { name: businessName, hours: cancellationWindowHours })}
        </p>
        <a
          href={`mailto:${providerEmail}`}
          className="font-mono text-sm text-ink underline"
        >
          {providerEmail}
        </a>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-ink-3">Hi {clientFirstName},</p>
      <h1 className="mb-1 font-serif text-2xl text-ink">{serviceName}</h1>
      <p className="mb-1 font-mono text-ink-2">{whenText}</p>
      <p className="mb-6 text-sm text-ink-3">{businessName}</p>

      {(cancelState.ok === false || reState.ok === false) && !late && (
        <p className="mb-3 rounded-lg border border-accent/60 bg-accent-l p-3 text-sm text-ink-2">
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
            className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-canvas"
          >
            {t.client.rescheduleTitle}
          </button>
          <button
            type="button"
            onClick={() => setMode("confirm-cancel")}
            className="w-full rounded-xl border border-ink px-4 py-3 font-semibold text-ink"
          >
            {t.client.cancelTitle}
          </button>
          <p className="text-xs text-ink-3">{t.client.serviceChangeNote}</p>
        </div>
      )}

      {mode === "confirm-cancel" && (
        <form action={cancelAction} className="space-y-3">
          <input type="hidden" name="token" value={token} />
          <p className="text-sm text-ink-2">{t.client.cancelTitle}</p>
          <button
            type="submit"
            disabled={cancelPending}
            className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-canvas disabled:opacity-50"
          >
            {cancelPending ? t.common.loading : t.client.cancelConfirm}
          </button>
          <button
            type="button"
            onClick={() => setMode("view")}
            className="w-full rounded-xl border border-line px-4 py-3 text-ink-2"
          >
            {t.common.back}
          </button>
        </form>
      )}

      {mode === "reschedule" && (
        <div>
          <h2 className="mb-3 font-serif text-lg text-ink">
            {t.client.rescheduleTitle}
          </h2>

          {/* Soonest · Week · Month — browse the calendar, not just the earliest. */}
          <div className="mb-3 inline-flex rounded-xl bg-surface-2 p-1">
            {(["soonest", "week", "month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => openView(v)}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold ${
                  view === v ? "bg-ctrl text-ctrl-ink shadow-sm" : "text-ink-3"
                }`}
              >
                {v === "soonest" ? t.client.soonest : v === "week" ? t.client.weekView : t.client.monthView}
              </button>
            ))}
          </div>

          {view === "week" && (
            <WeekPicker
              anchor={anchor || today}
              today={today}
              lastBookable={lastBookable}
              bookable={bookableSet}
              selected={dayDate}
              onAnchor={setAnchor}
              onPick={pickDay}
            />
          )}
          {view === "month" && (
            <MonthPicker
              anchor={anchor || today}
              today={today}
              lastBookable={lastBookable}
              bookable={bookableSet}
              selected={dayDate}
              onAnchor={setAnchor}
              onPick={pickDay}
            />
          )}

          {view !== "soonest" && !dayDate ? (
            <p className="mt-3 text-sm text-ink-3">{t.client.pickADay}</p>
          ) : visibleSlots === null ? (
            <p className="mt-3 text-sm text-ink-4">{t.common.loading}</p>
          ) : visibleSlots.filter((s) => s.startsAt !== startsAt).length === 0 ? (
            <p className="mt-3 text-sm text-ink-3">
              {view === "soonest" ? t.client.noSlotsAtAll : t.client.noSlotsDay}
            </p>
          ) : (
            <div className={`mt-3 ${view === "soonest" ? "space-y-2" : "grid grid-cols-3 gap-2"}`}>
              {visibleSlots
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
                      fd.set("service_ids", serviceCsv);
                      fd.set("starts_at", slot.startsAt);
                      fd.set("date", localDateOf(slot.startsAt));
                      holdAction(fd);
                    }}
                    className={`rounded-xl border border-line bg-surface px-4 py-3 font-mono text-sm text-ink shadow-sm disabled:opacity-50 ${
                      view === "soonest" ? "w-full text-left" : "text-center"
                    }`}
                  >
                    {view === "soonest" ? slotLabel(slot.startsAt) : slotTimeOnly(slot.startsAt)}
                  </button>
                ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setMode("view")}
            className="mt-4 text-sm text-ink-3 underline"
          >
            {t.client.keepOriginal}
          </button>
        </div>
      )}
    </div>
  );
}

