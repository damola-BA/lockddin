"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  searchClientsForBooking,
  createClientForBooking,
  manualSlots,
  createManualBooking,
  type ManualClient,
} from "@/lib/booking/manual";
import { getDictionary, fill } from "@/lib/i18n";

const t = getDictionary();
const TZ = "Europe/Brussels";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
};

function euros(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export function ManualBooking({ services }: { services: Service[] }) {
  const router = useRouter();
  const [client, setClient] = useState<ManualClient | null>(null);
  const [picked, setPicked] = useState<Service[]>([]);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<{ startsAt: string; label: string }[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const serviceCsv = picked.map((s) => s.id).join(",");
  const totalPrice = picked.reduce((n, s) => n + s.price_cents, 0);
  const totalDuration = picked.reduce((n, s) => n + s.duration_minutes, 0);

  useEffect(() => {
    if (!date || picked.length === 0) return;
    setSlots(null);
    setSlot(null);
    manualSlots(picked.map((s) => s.id), date).then(setSlots);
  }, [date, serviceCsv]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 1: client ──────────────────────────────────────────────────
  if (!client) {
    return <ClientStep onPick={setClient} />;
  }

  // ── Step 2: services + slot ─────────────────────────────────────────
  if (!slot) {
    return (
      <div className="space-y-5">
        <PickedClient client={client} onChange={() => setClient(null)} />
        {client.hasActiveBooking && (
          <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
            {t.dashboard.walkInExisting}
          </p>
        )}

        <div>
          <p className="mb-2 font-serif text-lg">{t.dashboard.walkInPickServices}</p>
          <div className="space-y-2">
            {services.map((s) => {
              const on = picked.some((x) => x.id === s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    setPicked(on ? picked.filter((x) => x.id !== s.id) : [...picked, s])
                  }
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left ${
                    on ? "border-amber-400 bg-stone-900" : "border-stone-800 bg-stone-900"
                  }`}
                >
                  <span>
                    {on ? "✓ " : ""}
                    {s.name}
                    <span className="ml-2 font-mono text-xs text-stone-500">
                      {fill(t.client.minutes, { n: s.duration_minutes })}
                    </span>
                  </span>
                  <span className="font-mono text-sm text-stone-300">{euros(s.price_cents)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {picked.length > 0 && (
          <>
            <div>
              <p className="mb-1 text-sm text-stone-400">{t.dashboard.walkInPickDay}</p>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2.5 text-stone-100"
              />
            </div>

            {date && slots === null && (
              <p className="text-sm text-stone-500">{t.common.loading}</p>
            )}
            {slots !== null && slots.length === 0 && (
              <p className="text-sm text-stone-500">{t.dashboard.walkInNoSlots}</p>
            )}
            {slots && slots.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => (
                  <button
                    key={s.startsAt}
                    type="button"
                    onClick={() => setSlot(s.startsAt)}
                    className="rounded-lg border border-stone-700 px-3 py-2 font-mono text-sm text-stone-200"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Step 3: confirm ─────────────────────────────────────────────────
  const slotLabel = new Intl.DateTimeFormat("en-BE", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(slot));

  return (
    <div className="space-y-5">
      <PickedClient client={client} onChange={() => setClient(null)} />
      <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
        <p className="font-serif text-lg">{picked.map((s) => s.name).join(" + ")}</p>
        <p className="font-mono text-sm text-stone-300">{slotLabel}</p>
        <p className="mt-1 font-mono text-sm text-amber-300">
          {euros(totalPrice)} · {fill(t.client.minutes, { n: totalDuration })}
        </p>
        <button
          type="button"
          onClick={() => setSlot(null)}
          className="mt-2 text-xs text-stone-500 underline"
        >
          {t.dashboard.walkInChangeService}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400">
          {error === "existing"
            ? t.dashboard.walkInExisting
            : error === "slot_taken" || error === "taken"
              ? t.client.justTaken
              : t.common.somethingWrong}
        </p>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await createManualBooking(
              client.id,
              picked.map((s) => s.id),
              slot,
              date,
            );
            if (res.ok) router.push(`/dashboard/booking/${res.bookingId}`);
            else setError(res.error);
          })
        }
        className="w-full rounded-xl bg-amber-400 px-4 py-3 font-semibold text-stone-950 disabled:opacity-50"
      >
        {pending ? t.common.loading : t.dashboard.walkInConfirm}
      </button>
    </div>
  );
}

function PickedClient({
  client,
  onChange,
}: {
  client: ManualClient;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900 px-4 py-3">
      <span>
        <span className="font-serif">{client.firstName}</span>
        <span className="block font-mono text-xs text-stone-400">{client.phone}</span>
      </span>
      <button type="button" onClick={onChange} className="text-xs text-amber-400 underline">
        {t.dashboard.walkInChangeClient}
      </button>
    </div>
  );
}

function ClientStep({ onPick }: { onPick: (c: ManualClient) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ManualClient[]>([]);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  // new client fields
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      searchClientsForBooking(query).then(setResults);
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  return (
    <div className="space-y-4">
      <p className="font-serif text-lg">{t.dashboard.walkInStepClient}</p>

      {!creating ? (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.dashboard.walkInSearch}
            className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-stone-100 placeholder:text-stone-600"
          />
          <ul className="space-y-2">
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onPick(c)}
                  className="flex w-full items-center justify-between rounded-lg border border-stone-800 bg-stone-900 px-4 py-3 text-left"
                >
                  <span>
                    <span className="font-serif">{c.firstName}</span>
                    <span className="block font-mono text-xs text-stone-400">{c.phone}</span>
                  </span>
                  {c.hasActiveBooking && (
                    <span className="text-xs text-amber-400">{t.dashboard.walkInHasBooking}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="text-sm text-amber-400 underline"
          >
            {t.dashboard.walkInNewClient}
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={t.dashboard.walkInFirstName}
            className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-stone-100 placeholder:text-stone-600"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            placeholder={t.dashboard.walkInPhone}
            className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-stone-100 placeholder:text-stone-600"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder={t.dashboard.walkInEmail}
            className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-stone-100 placeholder:text-stone-600"
          />
          {err && <p className="text-sm text-red-400">{t.common.somethingWrong}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="flex-1 rounded-lg border border-stone-700 px-3 py-2.5 text-sm text-stone-300"
            >
              {t.common.back}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setErr(false);
                  const res = await createClientForBooking(firstName, phone, email);
                  if (res.ok) onPick(res.client);
                  else setErr(true);
                })
              }
              className="flex-1 rounded-lg bg-amber-400 px-3 py-2.5 text-sm font-semibold text-stone-950 disabled:opacity-50"
            >
              {pending ? t.common.loading : t.dashboard.walkInCreateClient}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
