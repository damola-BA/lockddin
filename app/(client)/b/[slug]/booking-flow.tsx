"use client";

import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { storageUrl } from "@/lib/storage-url";
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
  photos: string[];
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
  // Multiple services can be booked in one visit (done back-to-back).
  const [selected, setSelected] = useState<Service[]>(
    services.length === 1 ? [services[0]] : [],
  );
  const [selectionDone, setSelectionDone] = useState(services.length === 1);
  const [slots, setSlots] = useState<PublicSlot[] | null>(null);
  const [bookableDays, setBookableDays] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dayDate, setDayDate] = useState<string | null>(null);
  const [daySlots, setDaySlots] = useState<PublicSlot[] | null>(null);
  const [picked, setPicked] = useState<PublicSlot | null>(null);
  const [notice, setNotice] = useState<"released" | "taken" | null>(null);
  const [galleryService, setGalleryService] = useState<Service | null>(null);

  const serviceCsv = selected.map((s) => s.id).join(",");
  const totalDuration = selected.reduce((n, s) => n + s.duration_minutes, 0);
  const totalPrice = selected.reduce((n, s) => n + s.price_cents, 0);
  const comboLabel = selected.map((s) => s.name).join(" + ");

  const loadEarliest = useCallback(
    async (csv: string) => {
      setSlots(null);
      const res = await fetch(`/api/b/${slug}/slots?service=${csv}`, {
        cache: "no-store",
      });
      const body = await res.json();
      setSlots(body.slots ?? []);
      setBookableDays(body.bookableDays ?? []);
    },
    [slug],
  );

  const loadDay = useCallback(
    async (csv: string, date: string) => {
      setDaySlots(null);
      const res = await fetch(`/api/b/${slug}/slots?service=${csv}&date=${date}`, {
        cache: "no-store",
      });
      const body = await res.json();
      setDaySlots(body.slots ?? []);
    },
    [slug],
  );

  useEffect(() => {
    if (selectionDone && serviceCsv) void loadEarliest(serviceCsv);
  }, [selectionDone, serviceCsv, loadEarliest]);

  const backToPicker = useCallback(
    (why: "released" | "taken" | null) => {
      setPicked(null);
      setNotice(why);
      if (serviceCsv) void loadEarliest(serviceCsv);
      if (serviceCsv && dayDate) void loadDay(serviceCsv, dayDate);
    },
    [serviceCsv, dayDate, loadEarliest, loadDay],
  );

  // ── step 1: service selection (one or more) ────────────────────────
  if (!selectionDone) {
    return (
      <section>
        <ReturningClientLookup slug={slug} />
        <h2 className="mb-1 font-serif text-xl text-ink">
          {t.client.pickService}
        </h2>
        <p className="mb-4 text-sm text-ink-3">{t.client.pickMultiple}</p>
        <div className="space-y-3">
          {services.map((s) => {
            const on = selected.some((x) => x.id === s.id);
            return (
              <div
                key={s.id}
                className={`rounded-xl border bg-white shadow-sm ${
                  on ? "border-ink ring-1 ring-ink" : "border-line"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setSelected(
                      on ? selected.filter((x) => x.id !== s.id) : [...selected, s],
                    )
                  }
                  className="w-full p-4 text-left"
                >
                  <span className="flex items-baseline justify-between">
                    <span className="font-serif text-lg text-ink">
                      {on ? "✓ " : ""}
                      {s.name}
                    </span>
                    <span className="font-mono text-sm text-ink-2">
                      {euros(s.price_cents)}
                    </span>
                  </span>
                  <span className="mt-1 block font-mono text-xs text-ink-3">
                    {fill(t.client.minutes, { n: s.duration_minutes })}
                  </span>
                  {s.prep_instructions && (
                    <span className="mt-2 block text-sm text-ink-3">
                      {t.client.prep}: {s.prep_instructions}
                    </span>
                  )}
                </button>
                {s.photos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setGalleryService(s)}
                    className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-left"
                  >
                    <div className="flex -space-x-1.5">
                      {s.photos.slice(0, 3).map((p) => (
                        <img
                          key={p}
                          src={storageUrl(p)}
                          alt=""
                          className="h-7 w-7 rounded-full border-2 border-white object-cover"
                        />
                      ))}
                    </div>
                    <span className="text-xs text-ink-3">
                      See {s.photos.length} photo{s.photos.length !== 1 ? "s" : ""}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectionDone(true)}
            className="sticky bottom-4 mt-4 w-full rounded-xl bg-ink px-4 py-3 font-semibold text-canvas"
          >
            {t.common.continue} · {euros(totalPrice)} ·{" "}
            <span className="font-mono">{fill(t.client.minutes, { n: totalDuration })}</span>
          </button>
        )}

        {galleryService && (
          <ServiceGallery
            service={galleryService}
            onClose={() => setGalleryService(null)}
          />
        )}
      </section>
    );
  }

  // ── step 4+: details with hold ─────────────────────────────────────
  if (picked) {
    return (
      <DetailsStep
        slug={slug}
        selected={selected}
        comboLabel={comboLabel}
        totalPrice={totalPrice}
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
        onClick={() => setSelectionDone(false)}
        className="mb-1 text-left text-sm text-ink-3"
      >
        {comboLabel} ·{" "}
        <span className="font-mono">{fill(t.client.minutes, { n: totalDuration })}</span>
        <span className="underline"> ✎</span>
      </button>

      {notice === "released" && (
        <p className="mb-3 rounded-lg border border-accent/60 bg-accent-l p-3 text-sm text-ink-2">
          {t.client.holdReleased}
        </p>
      )}
      {notice === "taken" && (
        <p className="mb-3 rounded-lg border border-accent/60 bg-accent-l p-3 text-sm text-ink-2">
          {t.client.justTaken}
        </p>
      )}

      <h2 className="mb-3 font-serif text-xl text-ink">
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
                void loadDay(serviceCsv, date);
              }}
              className={`rounded-lg px-2.5 py-1.5 font-mono text-xs ${
                dayDate === date
                  ? "bg-ink text-canvas"
                  : "border border-line bg-white text-ink-2"
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
        <p className="text-sm text-ink-4">{t.common.loading}</p>
      ) : visibleSlots.length === 0 ? (
        calendarOpen ? (
          <p className="text-sm text-ink-3">{t.client.noSlotsDay}</p>
        ) : null
      ) : (
        // All of a day's times together, earliest day first (DD24).
        <div className="space-y-4">
          {[...new Set(visibleSlots.map((s) => localDateOf(s.startsAt)))].map(
            (day) => (
              <div key={day}>
                <p className="mb-2 font-serif text-ink">
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
                        className="rounded-lg border border-line bg-white px-3.5 py-2 font-mono text-ink shadow-sm"
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
        <WaitlistJoin slug={slug} serviceId={selected[0].id} />
      ) : (
        <button
          type="button"
          onClick={() => {
            setCalendarOpen(!calendarOpen);
            setDayDate(null);
            setDaySlots(null);
          }}
          className="mt-4 text-sm text-ink-3 underline"
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
    <div className="mb-6 rounded-xl border border-line bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-serif text-ink">{t.client.returningTitle}</span>
        <span className="font-mono text-ink-4">{open ? "−" : "+"}</span>
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
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink"
          />
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 rounded-lg bg-ink px-3 py-2.5 text-sm font-semibold text-canvas disabled:opacity-50"
          >
            {busy ? "…" : t.client.returningCta}
          </button>
        </form>
      )}

      {result === "none" && (
        <p className="mt-3 text-sm text-ink-3">{t.client.returningNone}</p>
      )}

      {result !== null && result !== "none" && result.existing && (
        <div className="mt-3">
          <p className="font-serif text-ink">{result.existing.serviceName}</p>
          <p className="font-mono text-sm text-ink-2">{result.existing.whenText}</p>
          <a
            href={`/manage/${result.existing.manageToken}`}
            className="mt-3 block w-full rounded-xl bg-ink px-4 py-3 text-center font-semibold text-canvas"
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
  selected,
  comboLabel,
  totalPrice,
  slot,
  cancellationWindowHours,
  onReleased,
  onTaken,
  onBack,
}: {
  slug: string;
  selected: Service[];
  comboLabel: string;
  totalPrice: number;
  slot: PublicSlot;
  cancellationWindowHours: number;
  onReleased: () => void;
  onTaken: () => void;
  onBack: () => void;
}) {
  const serviceCsv = selected.map((s) => s.id).join(",");
  const [hold, holdAction] = useActionState<HoldState, FormData>(placeHold, {});
  const [confirm, confirmAction, confirmPending] = useActionState<
    ConfirmState,
    FormData
  >(confirmBooking, {});
  const [remaining, setRemaining] = useState<number | null>(null);
  const [recognized, setRecognized] = useState<RecognizeResult>({});
  const holdRequested = useRef(false);
  const reholds = useRef(0);
  const reholding = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Hold starts when the details step opens (F5 step 4).
  useEffect(() => {
    if (holdRequested.current) return;
    holdRequested.current = true;
    const fd = new FormData();
    fd.set("slug", slug);
    fd.set("service_ids", serviceCsv);
    fd.set("starts_at", slot.startsAt);
    fd.set("date", localDateOf(slot.startsAt));
    startTransition(() => holdAction(fd));
  }, [slug, serviceCsv, slot.startsAt, holdAction]);

  // Countdown — and rather than dumping everything the client has typed when
  // the 5-minute hold lapses, silently re-hold the same slot a couple of times
  // so an active booker never loses their work (DD35). Only a genuinely gone
  // slot (or a long-abandoned session) sends them back to the picker.
  useEffect(() => {
    if (!hold.ok) return;
    reholding.current = false; // a fresh hold just landed
    const expires = new Date(hold.expiresAt).getTime();
    const holdId = hold.holdId;
    const tick = () => {
      const left = Math.max(0, Math.floor((expires - Date.now()) / 1000));
      setRemaining(left);
      if (left > 0 || reholding.current) return;
      if (reholds.current < 2) {
        reholds.current += 1;
        reholding.current = true;
        void (async () => {
          await releaseHold(holdId); // free the EXCLUDE so the re-claim can take it
          const fd = new FormData();
          fd.set("slug", slug);
          fd.set("service_ids", serviceCsv);
          fd.set("starts_at", slot.startsAt);
          fd.set("date", localDateOf(slot.startsAt));
          startTransition(() => holdAction(fd));
        })();
      } else {
        onReleased();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hold, onReleased, slug, serviceCsv, slot.startsAt, holdAction]);

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
      <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-serif text-2xl text-ink">
          {t.client.confirmed}
        </h2>
        <p className="font-serif text-lg text-ink">{confirm.serviceName}</p>
        <p className="font-mono text-ink-2">{confirm.whenText}</p>
        {confirm.locationText && (
          <p className="mt-1 text-sm text-ink-3">{confirm.locationText}</p>
        )}
        {confirm.prepInstructions && (
          <p className="mt-3 text-sm text-ink-3">
            <strong>{t.client.prep}:</strong> {confirm.prepInstructions}
          </p>
        )}
        <p className="mt-3 text-sm text-ink-3">{confirm.cancellationText}</p>
        <p className="mt-3 text-sm text-ink-3">
          {fill(t.client.confirmationSent, { email: confirm.email })}
        </p>
        <a
          href={`/manage/${confirm.manageToken}`}
          className="mt-5 block w-full rounded-xl border border-ink px-4 py-3 text-center font-semibold text-ink"
        >
          {t.client.manageBooking}
        </a>
      </section>
    );
  }

  const mm = remaining !== null ? String(Math.floor(remaining / 60)) : "5";
  const ss =
    remaining !== null ? String(remaining % 60).padStart(2, "0") : "00";
  const ending = remaining !== null && remaining <= 60;

  return (
    <section>
      <button
        type="button"
        onClick={() => {
          if (hold.ok) void releaseHold(hold.holdId);
          onBack();
        }}
        className="mb-2 text-sm text-ink-3 underline"
      >
        ← {t.client.backToPicker}
      </button>
      <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <p className="font-serif text-lg text-ink">{comboLabel}</p>
        <p className="font-mono text-sm text-ink-2">
          {slotDay(slot.startsAt)} · {slotTime(slot.startsAt)}
        </p>
        {hold.ok && (
          <p
            className={`mt-2 rounded px-2 py-1 font-mono text-xs ${
              ending ? "bg-red-50 font-semibold text-red-600" : "bg-accent-l text-ink-3"
            }`}
          >
            {fill(ending ? t.client.holdEnding : t.client.holdNotice, { mm, ss })}
          </p>
        )}

        <form ref={formRef} action={confirmAction} className="mt-4 space-y-3">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="hold_id" value={hold.ok ? hold.holdId : ""} />

          {/* Returning client who already has a booking: an inline heads-up,
              not a full-screen takeover — they keep their place and can change
              the number to book a new time (DD35). */}
          {recognized.existing && (
            <div className="rounded-lg border border-accent/60 bg-accent-l p-3 text-sm">
              <p className="text-ink-2">{t.client.existingInline}</p>
              <p className="mt-1 font-serif text-ink">
                {recognized.existing.serviceName}
              </p>
              <p className="font-mono text-ink-2">{recognized.existing.whenText}</p>
              <a
                href={`/manage/${recognized.existing.manageToken}`}
                className="mt-2 inline-block font-semibold text-accent underline"
              >
                {t.client.manageBooking}
              </a>
              <p className="mt-2 text-ink-3">{t.client.existingOther}</p>
            </div>
          )}

          <Field label={t.client.firstName}>
            <input
              name="first_name"
              required
              autoComplete="given-name"
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink"
            />
          </Field>
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
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink"
            />
          </Field>
          <Field label={t.client.email}>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink"
            />
          </Field>
          <p className="text-xs text-ink-3">{t.client.consent}</p>
          {confirm.ok === false && confirm.reason === "invalid" && (
            <p className="text-sm text-red-600">{t.common.somethingWrong}</p>
          )}
          {confirm.ok === false && confirm.reason === "existing" && (
            <p className="text-sm text-red-600">{t.client.existingTitle}</p>
          )}
          <button
            type="submit"
            disabled={!hold.ok || confirmPending || !!recognized.existing}
            className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-canvas disabled:opacity-50"
          >
            {confirmPending
              ? t.common.loading
              : `${t.client.confirm} — ${euros(totalPrice)}`}
          </button>
          <p className="text-center text-xs text-ink-4">
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
      <span className="mb-1 block text-sm text-ink-3">{label}</span>
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
      <p className="mt-2 rounded-xl border border-line bg-white p-4 text-sm text-ink-2 shadow-sm">
        {t.client.waitlistJoined}
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-line bg-white p-4 shadow-sm">
      <h3 className="mb-1 font-serif text-lg text-ink">
        {t.client.noSlotsAtAll}
      </h3>
      <p className="mb-3 text-sm text-ink-3">{t.client.waitlistBody}</p>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="service_id" value={serviceId} />
        <Field label={t.client.firstName}>
          <input
            name="first_name"
            required
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink"
          />
        </Field>
        <Field label={t.client.phone}>
          <input
            name="phone"
            type="tel"
            required
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink"
          />
        </Field>
        <Field label={`${t.schedule.pickDate} (${t.client.waitlistAnyDay})`}>
          <input
            name="date_preference"
            type="date"
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink"
          />
        </Field>
        {state.error && (
          <p className="text-sm text-red-600">{t.common.somethingWrong}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl border border-ink px-4 py-3 font-semibold text-ink disabled:opacity-50"
        >
          {pending ? t.common.loading : t.client.waitlistTitle}
        </button>
      </form>
    </div>
  );
}

// ── Service photo gallery overlay ─────────────────────────────────────────────

function ServiceGallery({
  service,
  onClose,
}: {
  service: Service;
  onClose: () => void;
}) {
  const [active, setActive] = useState(0);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      onClick={onClose}
    >
      <div
        className="flex flex-col flex-1 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-4 text-white">
          <div>
            <p className="font-serif text-lg">{service.name}</p>
            <p className="text-xs text-white/60">
              {active + 1} / {service.photos.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* main photo */}
        <div className="relative flex-1 overflow-hidden">
          <img
            src={storageUrl(service.photos[active])}
            alt={service.name}
            className="h-full w-full object-contain"
          />
          {active > 0 && (
            <button
              type="button"
              onClick={() => setActive(active - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white"
            >
              ‹
            </button>
          )}
          {active < service.photos.length - 1 && (
            <button
              type="button"
              onClick={() => setActive(active + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white"
            >
              ›
            </button>
          )}
        </div>

        {/* thumbnail strip */}
        {service.photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-4 py-3">
            {service.photos.map((p, i) => (
              <button
                key={p}
                type="button"
                onClick={() => setActive(i)}
                className={`shrink-0 overflow-hidden rounded-lg border-2 ${
                  i === active ? "border-white" : "border-transparent"
                }`}
              >
                <img
                  src={storageUrl(p)}
                  alt=""
                  className="h-14 w-14 object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
