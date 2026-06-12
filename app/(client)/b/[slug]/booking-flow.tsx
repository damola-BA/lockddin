"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import {
  placeHold,
  releaseHold,
  confirmBooking,
  recognizePhone,
  joinWaitlist,
  type HoldState,
  type ConfirmState,
  type RecognizeResult,
  type WaitlistState,
} from "@/lib/booking/actions";
import { getDictionary, fill } from "@/lib/i18n";

const t = getDictionary();

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  prep_instructions: string | null;
};

type PublicSlot = { startsAt: string; endsAt: string };

const TZ = "Europe/Brussels";

function euros(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function slotDay(iso: string): string {
  return new Intl.DateTimeFormat("en-BE", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

export function localDateOf(iso: string): string {
  // en-CA gives YYYY-MM-DD; the engine's `date` input is Brussels-local.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
}

function slotTime(iso: string): string {
  return new Intl.DateTimeFormat("en-BE", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function BookingFlow({
  slug,
  services,
  cancellationWindowHours,
}: {
  slug: string;
  services: Service[];
  cancellationWindowHours: number;
}) {
  const [service, setService] = useState<Service | null>(
    services.length === 1 ? services[0] : null,
  );
  const [slots, setSlots] = useState<PublicSlot[] | null>(null);
  const [bookableDays, setBookableDays] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dayDate, setDayDate] = useState<string | null>(null);
  const [daySlots, setDaySlots] = useState<PublicSlot[] | null>(null);
  const [picked, setPicked] = useState<PublicSlot | null>(null);
  const [notice, setNotice] = useState<"released" | "taken" | null>(null);

  const loadEarliest = useCallback(
    async (svcId: string) => {
      setSlots(null);
      const res = await fetch(`/api/b/${slug}/slots?service=${svcId}`, {
        cache: "no-store",
      });
      const body = await res.json();
      setSlots(body.slots ?? []);
      setBookableDays(body.bookableDays ?? []);
    },
    [slug],
  );

  const loadDay = useCallback(
    async (svcId: string, date: string) => {
      setDaySlots(null);
      const res = await fetch(`/api/b/${slug}/slots?service=${svcId}&date=${date}`, {
        cache: "no-store",
      });
      const body = await res.json();
      setDaySlots(body.slots ?? []);
    },
    [slug],
  );

  useEffect(() => {
    if (service) void loadEarliest(service.id);
  }, [service, loadEarliest]);

  const backToPicker = useCallback(
    (why: "released" | "taken" | null) => {
      setPicked(null);
      setNotice(why);
      if (service) void loadEarliest(service.id);
      if (service && dayDate) void loadDay(service.id, dayDate);
    },
    [service, dayDate, loadEarliest, loadDay],
  );

  // ── step 1: service selection ──────────────────────────────────────
  if (!service) {
    return (
      <section>
        <ReturningClientLookup slug={slug} />
        <h2 className="mb-4 font-serif text-xl text-stone-900">
          {t.client.pickService}
        </h2>
        <div className="space-y-3">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setService(s)}
              className="w-full rounded-xl border border-stone-200 bg-white p-4 text-left shadow-sm"
            >
              <span className="flex items-baseline justify-between">
                <span className="font-serif text-lg text-stone-900">{s.name}</span>
                <span className="font-mono text-sm text-stone-700">
                  {euros(s.price_cents)}
                </span>
              </span>
              <span className="mt-1 block font-mono text-xs text-stone-500">
                {fill(t.client.minutes, { n: s.duration_minutes })}
              </span>
              {s.prep_instructions && (
                <span className="mt-2 block text-sm text-stone-500">
                  {t.client.prep}: {s.prep_instructions}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>
    );
  }

  // ── step 4+: details with hold ─────────────────────────────────────
  if (picked) {
    return (
      <DetailsStep
        slug={slug}
        service={service}
        slot={picked}
        cancellationWindowHours={cancellationWindowHours}
        onReleased={() => backToPicker("released")}
        onTaken={() => backToPicker("taken")}
        onBack={() => backToPicker(null)}
      />
    );
  }

  // ── step 3: slot picker ────────────────────────────────────────────
  const visibleSlots = calendarOpen ? daySlots : slots;
  const showWaitlist =
    !calendarOpen && slots !== null && slots.length === 0;

  return (
    <section>
      <button
        type="button"
        onClick={() => {
          if (services.length > 1) setService(null);
        }}
        className="mb-1 text-sm text-stone-500"
      >
        {service.name} ·{" "}
        <span className="font-mono">{fill(t.client.minutes, { n: service.duration_minutes })}</span>
        {services.length > 1 && <span className="underline"> ✎</span>}
      </button>

      {notice === "released" && (
        <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-stone-700">
          {t.client.holdReleased}
        </p>
      )}
      {notice === "taken" && (
        <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-stone-700">
          {t.client.justTaken}
        </p>
      )}

      <h2 className="mb-3 font-serif text-xl text-stone-900">
        {calendarOpen && dayDate ? slotDay(`${dayDate}T12:00:00Z`) : t.client.nextSlots}
      </h2>

      {calendarOpen && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {bookableDays.map((date) => (
            <button
              key={date}
              type="button"
              onClick={() => {
                setDayDate(date);
                void loadDay(service.id, date);
              }}
              className={`rounded-lg px-2.5 py-1.5 font-mono text-xs ${
                dayDate === date
                  ? "bg-stone-900 text-amber-50"
                  : "border border-stone-300 bg-white text-stone-700"
              }`}
            >
              {new Intl.DateTimeFormat("en-BE", {
                timeZone: TZ,
                day: "numeric",
                month: "short",
              }).format(new Date(`${date}T12:00:00Z`))}
            </button>
          ))}
        </div>
      )}

      {visibleSlots === null ? (
        <p className="text-sm text-stone-400">{t.common.loading}</p>
      ) : visibleSlots.length === 0 ? (
        calendarOpen ? (
          <p className="text-sm text-stone-500">{t.client.noSlotsDay}</p>
        ) : null
      ) : (
        // All of a day's times together, earliest day first (DD24).
        <div className="space-y-4">
          {[...new Set(visibleSlots.map((s) => localDateOf(s.startsAt)))].map(
            (day) => (
              <div key={day}>
                <p className="mb-2 font-serif text-stone-900">
                  {slotDay(`${day}T12:00:00Z`)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {visibleSlots
                    .filter((s) => localDateOf(s.startsAt) === day)
                    .map((slot) => (
                      <button
                        key={slot.startsAt}
                        type="button"
                        onClick={() => setPicked(slot)}
                        className="rounded-lg border border-stone-200 bg-white px-3.5 py-2 font-mono text-stone-800 shadow-sm"
                      >
                        {slotTime(slot.startsAt)}
                      </button>
                    ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {showWaitlist ? (
        <WaitlistJoin slug={slug} serviceId={service.id} />
      ) : (
        <button
          type="button"
          onClick={() => {
            setCalendarOpen(!calendarOpen);
            setDayDate(null);
            setDaySlots(null);
          }}
          className="mt-4 text-sm text-stone-600 underline"
        >
          {calendarOpen ? t.client.backToNext : t.client.chooseDifferentDay}
        </button>
      )}
    </section>
  );
}

// ── returning client lookup (DD20): phone first, schedule instantly ──

function ReturningClientLookup({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<RecognizeResult | "none" | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mb-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-serif text-stone-900">{t.client.returningTitle}</span>
        <span className="font-mono text-stone-400">{open ? "−" : "+"}</span>
      </button>

      {open && result === null && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const r = await recognizePhone(slug, phone);
            setResult(r.existing ? r : "none");
            setBusy(false);
          }}
        >
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t.client.phone}
            required
            autoFocus
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900"
          />
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 rounded-lg bg-stone-900 px-3 py-2.5 text-sm font-semibold text-amber-50 disabled:opacity-50"
          >
            {busy ? "…" : t.client.returningCta}
          </button>
        </form>
      )}

      {result === "none" && (
        <p className="mt-3 text-sm text-stone-600">{t.client.returningNone}</p>
      )}

      {result !== null && result !== "none" && result.existing && (
        <div className="mt-3">
          <p className="font-serif text-stone-900">{result.existing.serviceName}</p>
          <p className="font-mono text-sm text-stone-700">{result.existing.whenText}</p>
          <a
            href={`/manage/${result.existing.manageToken}`}
            className="mt-3 block w-full rounded-xl bg-stone-900 px-4 py-3 text-center font-semibold text-amber-50"
          >
            {t.client.manageBooking}
          </a>
        </div>
      )}
    </div>
  );
}

// ── details step: hold countdown + recognition + confirm ─────────────

function DetailsStep({
  slug,
  service,
  slot,
  cancellationWindowHours,
  onReleased,
  onTaken,
  onBack,
}: {
  slug: string;
  service: Service;
  slot: PublicSlot;
  cancellationWindowHours: number;
  onReleased: () => void;
  onTaken: () => void;
  onBack: () => void;
}) {
  const [hold, holdAction] = useActionState<HoldState, FormData>(placeHold, {});
  const [confirm, confirmAction, confirmPending] = useActionState<
    ConfirmState,
    FormData
  >(confirmBooking, {});
  const [remaining, setRemaining] = useState<number | null>(null);
  const [recognized, setRecognized] = useState<RecognizeResult>({});
  const holdRequested = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Hold starts when the details step opens (F5 step 4).
  useEffect(() => {
    if (holdRequested.current) return;
    holdRequested.current = true;
    const fd = new FormData();
    fd.set("slug", slug);
    fd.set("service_id", service.id);
    fd.set("starts_at", slot.startsAt);
    fd.set("date", localDateOf(slot.startsAt));
    holdAction(fd);
  }, [slug, service.id, slot.startsAt, holdAction]);

  // Countdown.
  useEffect(() => {
    if (!hold.ok) return;
    const expires = new Date(hold.expiresAt).getTime();
    const tick = () => {
      const left = Math.max(0, Math.floor((expires - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) onReleased();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hold, onReleased]);

  // Confirm-stage failures route back to the picker.
  useEffect(() => {
    if (confirm.ok === false && confirm.reason === "released") onReleased();
    if (confirm.ok === false && confirm.reason === "taken") onTaken();
  }, [confirm, onReleased, onTaken]);

  useEffect(() => {
    if (hold.ok === false && hold.reason === "slot_taken") onTaken();
  }, [hold, onTaken]);

  if (confirm.ok) {
    return (
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-serif text-2xl text-stone-900">
          {t.client.confirmed}
        </h2>
        <p className="font-serif text-lg text-stone-900">{confirm.serviceName}</p>
        <p className="font-mono text-stone-700">{confirm.whenText}</p>
        {confirm.locationText && (
          <p className="mt-1 text-sm text-stone-600">{confirm.locationText}</p>
        )}
        {confirm.prepInstructions && (
          <p className="mt-3 text-sm text-stone-600">
            <strong>{t.client.prep}:</strong> {confirm.prepInstructions}
          </p>
        )}
        <p className="mt-3 text-sm text-stone-500">{confirm.cancellationText}</p>
        <p className="mt-3 text-sm text-stone-500">
          {fill(t.client.confirmationSent, { email: confirm.email })}
        </p>
      </section>
    );
  }

  if (recognized.existing) {
    return (
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 font-serif text-xl text-stone-900">
          {t.client.existingTitle}
        </h2>
        <p className="mb-3 text-sm text-stone-600">{t.client.existingBody}</p>
        <p className="font-serif text-stone-900">{recognized.existing.serviceName}</p>
        <p className="font-mono text-sm text-stone-700">
          {recognized.existing.whenText}
        </p>
        <a
          href={`/manage/${recognized.existing.manageToken}`}
          className="mt-4 block w-full rounded-xl bg-stone-900 px-4 py-3 text-center font-semibold text-amber-50"
        >
          {t.client.manageBooking}
        </a>
      </section>
    );
  }

  const mm = remaining !== null ? String(Math.floor(remaining / 60)) : "5";
  const ss =
    remaining !== null ? String(remaining % 60).padStart(2, "0") : "00";

  return (
    <section>
      <button
        type="button"
        onClick={() => {
          if (hold.ok) void releaseHold(hold.holdId);
          onBack();
        }}
        className="mb-2 text-sm text-stone-500 underline"
      >
        ← {t.client.backToPicker}
      </button>
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="font-serif text-lg text-stone-900">{service.name}</p>
        <p className="font-mono text-sm text-stone-700">
          {slotDay(slot.startsAt)} · {slotTime(slot.startsAt)}
        </p>
        {hold.ok && (
          <p className="mt-2 rounded bg-amber-50 px-2 py-1 font-mono text-xs text-stone-600">
            {fill(t.client.holdNotice, { mm, ss })}
          </p>
        )}

        <form ref={formRef} action={confirmAction} className="mt-4 space-y-3">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="hold_id" value={hold.ok ? hold.holdId : ""} />
          <Field label={t.client.phone}>
            <input
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              onBlur={async (e) => {
                const result = await recognizePhone(slug, e.target.value);
                setRecognized(result);
                if (result.firstName && formRef.current) {
                  const el = formRef.current.elements.namedItem("first_name");
                  if (el instanceof HTMLInputElement && !el.value) {
                    el.value = result.firstName;
                  }
                  const em = formRef.current.elements.namedItem("email");
                  if (em instanceof HTMLInputElement && !em.value && result.email) {
                    em.value = result.email;
                  }
                }
              }}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900"
            />
          </Field>
          <Field label={t.client.firstName}>
            <input
              name="first_name"
              required
              autoComplete="given-name"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900"
            />
          </Field>
          <Field label={t.client.email}>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900"
            />
          </Field>
          <p className="text-xs text-stone-500">{t.client.consent}</p>
          {confirm.ok === false && confirm.reason === "invalid" && (
            <p className="text-sm text-red-600">{t.common.somethingWrong}</p>
          )}
          {confirm.ok === false && confirm.reason === "existing" && (
            <p className="text-sm text-red-600">{t.client.existingTitle}</p>
          )}
          <button
            type="submit"
            disabled={!hold.ok || confirmPending}
            className="w-full rounded-xl bg-stone-900 px-4 py-3 font-semibold text-amber-50 disabled:opacity-50"
          >
            {confirmPending
              ? t.common.loading
              : `${t.client.confirm} — ${euros(service.price_cents)}`}
          </button>
          <p className="text-center text-xs text-stone-400">
            {fill(t.client.freeCancellation, {
              when: `${cancellationWindowHours}h before`,
            })}
          </p>
        </form>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-stone-600">{label}</span>
      {children}
    </label>
  );
}

// ── waitlist join (no availability edge state) ───────────────────────

function WaitlistJoin({ slug, serviceId }: { slug: string; serviceId: string }) {
  const [state, formAction, pending] = useActionState<WaitlistState, FormData>(
    joinWaitlist,
    {},
  );

  if (state.ok) {
    return (
      <p className="mt-2 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-700 shadow-sm">
        {t.client.waitlistJoined}
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="mb-1 font-serif text-lg text-stone-900">
        {t.client.noSlotsAtAll}
      </h3>
      <p className="mb-3 text-sm text-stone-600">{t.client.waitlistBody}</p>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="service_id" value={serviceId} />
        <Field label={t.client.firstName}>
          <input
            name="first_name"
            required
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900"
          />
        </Field>
        <Field label={t.client.phone}>
          <input
            name="phone"
            type="tel"
            required
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900"
          />
        </Field>
        <Field label={`${t.schedule.pickDate} (${t.client.waitlistAnyDay})`}>
          <input
            name="date_preference"
            type="date"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900"
          />
        </Field>
        {state.error && (
          <p className="text-sm text-red-600">{t.common.somethingWrong}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl border border-stone-900 px-4 py-3 font-semibold text-stone-900 disabled:opacity-50"
        >
          {pending ? t.common.loading : t.client.waitlistTitle}
        </button>
      </form>
    </div>
  );
}
