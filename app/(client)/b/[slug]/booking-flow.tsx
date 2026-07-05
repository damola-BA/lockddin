"use client";

import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  Calendar,
  CalendarPlus,
  Check,
  ChevronLeft,
  Mail,
  MapPin,
  User,
} from "lucide-react";
import { storageUrl } from "@/lib/storage-url";
import { WeekPicker, MonthPicker } from "@/app/(client)/b/[slug]/slot-calendar";
import {
  placeHold,
  releaseHold,
  confirmBooking,
  joinWaitlist,
  type HoldState,
  type ConfirmState,
  type WaitlistState,
} from "@/lib/booking/actions";
import { StepSpine } from "@/components/provider/ui";
import { fill, formatDuration, type Dictionary } from "@/lib/i18n";
import { useT } from "@/lib/i18n/context";

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

const spine = (t: Dictionary) => [
  { key: "service", label: t.client.stepService },
  { key: "time", label: t.client.stepTime },
  { key: "details", label: t.client.stepDetails },
];

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

// Hour-of-day in Brussels, for the Morning / Afternoon split.
function slotHour(iso: string): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "2-digit",
      hour12: false,
    }).format(new Date(iso)),
  );
}

// Selected-time chip uses the dark control fill; everything else is a hairline.
function timeChipClass(active: boolean): string {
  return active
    ? "border border-ctrl bg-ctrl text-ctrl-ink"
    : "border border-line bg-surface text-ink hover:border-accent";
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
  const t = useT();
  const SPINE = spine(t);
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
  // Time-step picker: earliest suggestions, or a Week / Month calendar.
  const [timeView, setTimeView] = useState<"soonest" | "week" | "month">("soonest");
  const [anchor, setAnchor] = useState("");
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

  // ── step 1: service selection (photo-forward cards + sticky dock) ────
  if (!selectionDone) {
    return (
      <section>
        <h2 className="mb-1 font-serif text-[22px] font-semibold text-ink">
          {t.client.pickService}
        </h2>
        <p className="mb-4 text-sm text-ink-3">{t.client.pickMultiple}</p>
        <div className="space-y-3">
          {services.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              selected={selected.some((x) => x.id === s.id)}
              onToggle={() =>
                setSelected((cur) =>
                  cur.some((x) => x.id === s.id)
                    ? cur.filter((x) => x.id !== s.id)
                    : [...cur, s],
                )
              }
              onGallery={() => setGalleryService(s)}
            />
          ))}
        </div>

        {selected.length > 0 && (
          <div className="sticky bottom-4 mt-5 flex items-center gap-3 rounded-[18px] bg-ctrl p-3 pl-5 shadow-[var(--shadow)]">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-ctrl-soft">
                {selected.length} service{selected.length !== 1 ? "s" : ""} ·{" "}
                <span className="tabular">{formatDuration(totalDuration)}</span>
              </p>
              <p className="mt-0.5 font-serif text-xl font-semibold text-ctrl-ink tabular">
                {euros(totalPrice)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectionDone(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-[13px] bg-accent px-5 py-3.5 text-[15px] font-bold text-white"
            >
              {t.common.continue}
              <ArrowRight size={16} strokeWidth={2.4} />
            </button>
          </div>
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

  // ── step 3: details with hold ───────────────────────────────────────
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

  // ── step 2: time picker ─────────────────────────────────────────────
  const visibleSlots = calendarOpen ? daySlots : slots;
  const showWaitlist =
    timeView === "soonest" && !calendarOpen && slots !== null && slots.length === 0;
  const today = localDateOf(new Date().toISOString());
  const bookableSet = new Set(bookableDays);
  const lastBookable = bookableDays.length ? bookableDays[bookableDays.length - 1] : today;

  function openTimeView(next: "soonest" | "week" | "month") {
    setTimeView(next);
    setCalendarOpen(false);
    setDayDate(null);
    setDaySlots(null);
    if (next !== "soonest" && !anchor) setAnchor(today);
  }
  function pickCalendarDay(date: string) {
    setCalendarOpen(true);
    setDayDate(date);
    void loadDay(serviceCsv, date);
  }

  return (
    <section>
      {services.length > 1 && (
        <button
          type="button"
          onClick={() => setSelectionDone(false)}
          className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-accent"
        >
          <ChevronLeft size={15} strokeWidth={2.2} />
          {t.client.editServices}
        </button>
      )}

      <StepSpine steps={SPINE} current="time" />

      {/* combo summary */}
      <div className="mt-3.5 mb-1 flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5">
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-accent-l text-accent">
          <Check size={18} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-serif font-semibold text-ink">{comboLabel}</p>
          <p className="mt-0.5 text-[13px] text-ink-3 tabular">
            {formatDuration(totalDuration)} · {euros(totalPrice)}
          </p>
        </div>
      </div>

      {notice === "released" && (
        <p className="mt-3 rounded-xl border border-accent/40 bg-accent-l p-3 text-sm text-ink-2">
          {t.client.holdReleased}
        </p>
      )}
      {notice === "taken" && (
        <p className="mt-3 rounded-xl border border-accent/40 bg-accent-l p-3 text-sm text-ink-2">
          {t.client.justTaken}
        </p>
      )}

      <h2 className="mt-6 mb-3.5 font-serif text-[22px] font-semibold text-ink">
        {t.client.pickTime}
      </h2>

      {/* Soonest · Week · Month — earliest suggestions or browse the calendar. */}
      {bookableDays.length > 0 && (
        <>
          <div className="mb-3 inline-flex rounded-xl bg-surface-2 p-1">
            {(["soonest", "week", "month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => openTimeView(v)}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold ${
                  timeView === v ? "bg-ctrl text-ctrl-ink shadow-sm" : "text-ink-3"
                }`}
              >
                {v === "soonest" ? t.client.soonest : v === "week" ? t.client.weekView : t.client.monthView}
              </button>
            ))}
          </div>
          {timeView === "week" && (
            <WeekPicker
              anchor={anchor || today}
              today={today}
              lastBookable={lastBookable}
              bookable={bookableSet}
              selected={dayDate}
              onAnchor={setAnchor}
              onPick={pickCalendarDay}
            />
          )}
          {timeView === "month" && (
            <MonthPicker
              anchor={anchor || today}
              today={today}
              lastBookable={lastBookable}
              bookable={bookableSet}
              selected={dayDate}
              onAnchor={setAnchor}
              onPick={pickCalendarDay}
            />
          )}
        </>
      )}

      {timeView !== "soonest" && !calendarOpen ? (
        <p className="mt-4 text-sm text-ink-3">{t.client.pickADay}</p>
      ) : visibleSlots === null ? (
        <p className="mt-4 text-sm text-ink-4">{t.common.loading}</p>
      ) : visibleSlots.length === 0 ? (
        calendarOpen ? (
          <p className="mt-4 text-sm text-ink-3">{t.client.noSlotsDay}</p>
        ) : null
      ) : calendarOpen && dayDate ? (
        <DayTimes
          dayLabel={slotDay(`${dayDate}T12:00:00Z`)}
          slots={visibleSlots}
          onPick={setPicked}
        />
      ) : (
        // "Soonest": each day's times together, earliest day first (DD24).
        <div className="mt-2 space-y-6">
          {[...new Set(visibleSlots.map((s) => localDateOf(s.startsAt)))].map((day) => (
            <DayTimes
              key={day}
              dayLabel={slotDay(`${day}T12:00:00Z`)}
              slots={visibleSlots.filter((s) => localDateOf(s.startsAt) === day)}
              onPick={setPicked}
            />
          ))}
        </div>
      )}

      {showWaitlist && <WaitlistJoin slug={slug} serviceId={selected[0].id} />}
    </section>
  );
}

// ── service card (photo-forward) ─────────────────────────────────────

function ServiceCard({
  service,
  selected,
  onToggle,
  onGallery,
}: {
  service: Service;
  selected: boolean;
  onToggle: () => void;
  onGallery: () => void;
}) {
  const t = useT();
  const cover = service.photos[0];
  return (
    <div
      className={`overflow-hidden rounded-2xl bg-surface transition-shadow ${
        selected
          ? "border-[1.5px] border-accent [box-shadow:0_0_0_3px_var(--accent-l)]"
          : "border border-line"
      }`}
    >
      <button type="button" onClick={onToggle} className="block w-full text-left">
        {/* image banner with price chip + selection check */}
        <div className="relative h-[104px] bg-canvas-2">
          {cover ? (
            <img
              src={storageUrl(cover)}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[repeating-linear-gradient(135deg,color-mix(in_srgb,var(--accent)_7%,transparent)_0_2px,transparent_2px_14px)]" />
          )}
          <span className="absolute bottom-2.5 left-3 rounded-lg bg-[rgba(34,29,25,.78)] px-2.5 py-1 text-[13px] font-bold text-white tabular">
            {euros(service.price_cents)}
          </span>
          <span
            className={`absolute right-2.5 top-2.5 flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-white shadow ${
              selected ? "bg-accent text-white" : "bg-white/90 text-transparent"
            }`}
          >
            {selected && <Check size={13} strokeWidth={3} />}
          </span>
        </div>
        <div className="px-4 py-3.5">
          <p className="font-serif text-[17px] font-semibold text-ink">{service.name}</p>
          <p className="mt-1 text-[12.5px] text-ink-3 tabular">
            {formatDuration(service.duration_minutes)}
            {service.photos.length > 0 &&
              ` · ${service.photos.length} photo${service.photos.length !== 1 ? "s" : ""}`}
          </p>
          {service.prep_instructions && (
            <p className="mt-2 text-[13px] text-ink-3">
              {t.client.prep}: {service.prep_instructions}
            </p>
          )}
        </div>
      </button>
      {service.photos.length > 0 && (
        <button
          type="button"
          onClick={onGallery}
          className="flex w-full items-center gap-2 border-t border-line-2 px-4 py-2.5 text-left"
        >
          <div className="flex -space-x-1.5">
            {service.photos.slice(0, 3).map((p) => (
              <img
                key={p}
                src={storageUrl(p)}
                alt=""
                className="h-7 w-7 rounded-full border-2 border-surface object-cover"
              />
            ))}
          </div>
          <span className="text-xs text-ink-3">
            See {service.photos.length} photo{service.photos.length !== 1 ? "s" : ""}
          </span>
        </button>
      )}
    </div>
  );
}

// ── a single day's times, split Morning / Afternoon ──────────────────

function DayTimes({
  dayLabel,
  slots,
  onPick,
}: {
  dayLabel: string;
  slots: PublicSlot[];
  onPick: (s: PublicSlot) => void;
}) {
  const t = useT();
  const morning = slots.filter((s) => slotHour(s.startsAt) < 12);
  const afternoon = slots.filter((s) => slotHour(s.startsAt) >= 12);

  return (
    <div>
      <p className="mb-3 font-serif text-[15px] font-medium text-ink-2">{dayLabel}</p>
      {morning.length > 0 && (
        <Period label={t.client.morning} slots={morning} onPick={onPick} />
      )}
      {afternoon.length > 0 && (
        <Period label={t.client.afternoon} slots={afternoon} onPick={onPick} />
      )}
    </div>
  );
}

function Period({
  label,
  slots,
  onPick,
}: {
  label: string;
  slots: PublicSlot[];
  onPick: (s: PublicSlot) => void;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-4">
        {label}
      </p>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {slots.map((slot) => (
          <button
            key={slot.startsAt}
            type="button"
            onClick={() => onPick(slot)}
            className={`rounded-xl py-3 text-center text-[15px] font-semibold tabular ${timeChipClass(false)}`}
          >
            {slotTime(slot.startsAt)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── details step: hold ring countdown + email + confirm ──────────────

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
  const t = useT();
  const SPINE = spine(t);
  const serviceCsv = selected.map((s) => s.id).join(",");
  const [hold, holdAction] = useActionState<HoldState, FormData>(placeHold, {});
  const [confirm, confirmAction, confirmPending] = useActionState<
    ConfirmState,
    FormData
  >(confirmBooking, {});
  const [remaining, setRemaining] = useState<number | null>(null);
  // Client-side validation — Confirm stays disabled until a first name and a
  // valid email are entered; the email error only shows once the field is left.
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const formValid = firstName.trim().length > 0 && emailValid;
  const holdRequested = useRef(false);
  const reholds = useRef(0);
  const reholding = useRef(false);

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
  // so an active booker never loses their work (DD35).
  useEffect(() => {
    if (!hold.ok) return;
    reholding.current = false;
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
          await releaseHold(holdId);
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

  useEffect(() => {
    if (confirm.ok === false && confirm.reason === "released") onReleased();
    if (confirm.ok === false && confirm.reason === "taken") onTaken();
  }, [confirm, onReleased, onTaken]);

  useEffect(() => {
    if (hold.ok === false && hold.reason === "slot_taken") onTaken();
  }, [hold, onTaken]);

  if (confirm.ok) {
    return (
      <ConfirmedTicket
        confirm={confirm}
        slot={slot}
        comboLabel={comboLabel}
      />
    );
  }

  const mm = remaining !== null ? String(Math.floor(remaining / 60)) : "5";
  const ss = remaining !== null ? String(remaining % 60).padStart(2, "0") : "00";
  // Ring depletes over the 5-minute (300s) window.
  const frac = remaining !== null ? Math.max(0, Math.min(1, remaining / 300)) : 1;
  const R = 19;
  const CIRC = 2 * Math.PI * R;

  return (
    <section>
      <button
        type="button"
        onClick={() => {
          if (hold.ok) void releaseHold(hold.holdId);
          onBack();
        }}
        className="mb-3.5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-3"
      >
        <ChevronLeft size={15} strokeWidth={2.2} />
        {t.client.backToPicker}
      </button>

      <StepSpine steps={SPINE} current="details" />

      <div className="mt-3.5 overflow-hidden rounded-[18px] border border-line bg-surface">
        <div className="px-4 pb-3.5 pt-4">
          <p className="font-serif text-[18px] font-semibold text-ink">{comboLabel}</p>
          <p className="mt-1 text-[13.5px] text-ink-3 tabular">
            {slotDay(slot.startsAt)} · {slotTime(slot.startsAt)}
          </p>
        </div>
        {hold.ok && (
          <div className="flex items-center gap-3.5 border-t border-line-2 bg-accent-l/60 px-4 py-3.5">
            <div className="relative h-11 w-11 shrink-0">
              <svg width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r={R} fill="none" stroke="var(--accent-l)" strokeWidth="4" />
                <circle
                  cx="22"
                  cy="22"
                  r={R}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - frac)}
                  transform="rotate(-90 22 22)"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-accent-d">
                {t.client.holdRingTitle}
              </p>
              <p className="mt-0.5 text-[16px] font-bold text-accent-d tabular">
                {fill(t.client.holdLeft, { mm, ss })}
              </p>
            </div>
          </div>
        )}

        <form action={confirmAction} className="space-y-3.5 px-4 pb-4 pt-4">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="hold_id" value={hold.ok ? hold.holdId : ""} />

          <LabeledField label={t.client.firstName} icon={<User size={16} strokeWidth={1.8} />}>
            <input
              name="first_name"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-transparent text-[15px] font-medium text-ink placeholder:text-ink-4 focus:outline-none"
            />
          </LabeledField>

          <LabeledField
            label={t.client.email}
            icon={<Mail size={16} strokeWidth={1.8} />}
            accent={!emailTouched || emailValid}
          >
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              className="w-full bg-transparent text-[15px] text-ink placeholder:text-ink-4 focus:outline-none"
            />
          </LabeledField>

          {emailTouched && email.length > 0 && !emailValid ? (
            <p className="text-[12px] font-medium text-red-600">{t.client.emailInvalid}</p>
          ) : (
            <p className="text-[12px] leading-relaxed text-ink-4">
              {t.client.emailReassure}
            </p>
          )}

          {confirm.ok === false && confirm.reason === "invalid" && (
            <p className="text-sm text-red-600">{t.common.somethingWrong}</p>
          )}

          <button
            type="submit"
            disabled={!hold.ok || confirmPending || !formValid}
            className="flex w-full items-center justify-center gap-2 rounded-[15px] bg-ctrl px-4 py-4 text-[15.5px] font-bold text-ctrl-ink shadow-[var(--shadow)] disabled:opacity-50"
          >
            {confirmPending ? (
              t.common.loading
            ) : (
              <>
                {t.client.confirm}
                <span className="opacity-50">·</span>
                <span className="tabular">{euros(totalPrice)}</span>
              </>
            )}
          </button>
          <p className="text-center text-[12px] text-ink-4">
            {fill(t.client.freeCancellation, {
              when: `${cancellationWindowHours}h before`,
            })}
          </p>
        </form>
      </div>
    </section>
  );
}

function LabeledField({
  label,
  icon,
  accent = false,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-2">{label}</span>
      <span
        className={`flex items-center gap-2.5 rounded-xl bg-surface px-3.5 py-3 ${
          accent
            ? "border-[1.5px] border-accent [box-shadow:0_0_0_3px_var(--accent-l)]"
            : "border border-line"
        }`}
      >
        <span className={`shrink-0 ${accent ? "text-accent" : "text-faint"}`}>{icon}</span>
        {children}
      </span>
    </label>
  );
}

// ── confirmed: the ticket moment ─────────────────────────────────────

function googleCalendarUrl(
  title: string,
  slot: PublicSlot,
  location: string | null,
  details: string | null,
): string {
  const fmt = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(slot.startsAt)}/${fmt(slot.endsAt)}`,
  });
  if (location) params.set("location", location);
  if (details) params.set("details", details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function ConfirmedTicket({
  confirm,
  slot,
  comboLabel,
}: {
  confirm: Extract<ConfirmState, { ok: true }>;
  slot: PublicSlot;
  comboLabel: string;
}) {
  const t = useT();
  const calUrl = googleCalendarUrl(
    confirm.serviceName,
    slot,
    confirm.locationText,
    confirm.prepInstructions,
  );

  return (
    <section className="flex flex-col">
      <div className="pb-1 pt-2 text-center">
        <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-ok text-white shadow-[0_14px_30px_-12px_rgba(31,110,66,.55)]">
          <Check size={36} strokeWidth={2.6} />
        </div>
        <h2 className="mt-5 font-serif text-[30px] font-semibold text-ink">
          {t.client.confirmed}
        </h2>
      </div>

      {/* ticket */}
      <div className="mt-6 overflow-hidden rounded-[18px] border border-line bg-surface shadow-[var(--shadow)]">
        <div className="px-[18px] pb-4 pt-[18px]">
          <p className="font-serif text-[18px] font-semibold text-ink">{comboLabel}</p>
          <div className="mt-2 flex items-center gap-2">
            <Calendar size={15} strokeWidth={1.8} className="text-accent" />
            <span className="text-sm font-semibold text-ink-2 tabular">
              {confirm.whenText}
            </span>
          </div>
          {confirm.locationText && (
            <div className="mt-1.5 flex items-center gap-2">
              <MapPin size={15} strokeWidth={1.8} className="text-accent" />
              <span className="text-sm text-ink-2">{confirm.locationText}</span>
            </div>
          )}
        </div>
        {/* perforation */}
        <div className="h-px bg-[repeating-linear-gradient(90deg,var(--line)_0_6px,transparent_6px_12px)]" />
        <div className="bg-surface-2 px-[18px] py-3.5">
          <p className="text-[12.5px] font-bold uppercase tracking-[0.04em] text-ink-3">
            {t.client.prep}
          </p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
            {confirm.prepInstructions ? `${confirm.prepInstructions} ` : ""}
            {confirm.cancellationText}
          </p>
        </div>
      </div>

      <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-ok-l px-3 py-1.5">
        <Mail size={13} strokeWidth={2} className="text-ok" />
        <span className="text-[12.5px] font-semibold text-ok">
          {fill(t.client.confirmationSent, { email: confirm.email })}
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-2.5">
        <a
          href={calUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2.5 rounded-[14px] bg-ctrl px-4 py-3.5 text-[14.5px] font-bold text-ctrl-ink"
        >
          <CalendarPlus size={17} strokeWidth={1.9} />
          {t.client.addToCalendar}
        </a>
        <a
          href={`/manage/${confirm.manageToken}`}
          className="flex w-full items-center justify-center rounded-[14px] border border-line bg-surface px-4 py-3.5 text-[14.5px] font-semibold text-ink-2"
        >
          {t.client.manageBooking}
        </a>
      </div>
    </section>
  );
}

// ── waitlist join (no availability edge state) ───────────────────────

function WaitlistJoin({ slug, serviceId }: { slug: string; serviceId: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState<WaitlistState, FormData>(
    joinWaitlist,
    {},
  );

  if (state.ok) {
    return (
      <p className="mt-4 rounded-2xl border border-line bg-surface p-4 text-sm text-ink-2 shadow-sm">
        {t.client.waitlistJoined}
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <h3 className="mb-1 font-serif text-lg font-semibold text-ink">
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
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-ink focus:border-accent focus:outline-none"
          />
        </Field>
        <Field label={t.client.email}>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-ink focus:border-accent focus:outline-none"
          />
        </Field>
        <Field label={`${t.schedule.pickDate} (${t.client.waitlistAnyDay})`}>
          <input
            name="date_preference"
            type="date"
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-ink focus:border-accent focus:outline-none"
          />
        </Field>
        {state.error && (
          <p className="text-sm text-red-600">{t.common.somethingWrong}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-[14px] border border-ctrl bg-ctrl px-4 py-3.5 font-semibold text-ctrl-ink disabled:opacity-50"
        >
          {pending ? t.common.loading : t.client.waitlistTitle}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-2">{label}</span>
      {children}
    </label>
  );
}

// ── Service photo gallery overlay ────────────────────────────────────

function ServiceGallery({
  service,
  onClose,
}: {
  service: Service;
  onClose: () => void;
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={onClose}>
      <div
        className="flex flex-1 flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-4 text-white">
          <div>
            <p className="font-serif text-lg">{service.name}</p>
            <p className="text-xs text-white/60 tabular">
              {active + 1} / {service.photos.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/80 hover:text-white"
            aria-label="Close"
          >
            <ChevronLeft size={20} className="rotate-45" />
          </button>
        </div>

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
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"
              aria-label="Previous"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          {active < service.photos.length - 1 && (
            <button
              type="button"
              onClick={() => setActive(active + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"
              aria-label="Next"
            >
              <ChevronLeft size={22} className="rotate-180" />
            </button>
          )}
        </div>

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
                <img src={storageUrl(p)} alt="" className="h-14 w-14 object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
