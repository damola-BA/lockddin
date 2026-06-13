"use client";

import { useActionState, useState } from "react";
import {
  providerCancelBooking,
  CANCEL_REASONS,
  type DashActionState,
} from "@/lib/dashboard/actions";
import { getDictionary, fill } from "@/lib/i18n";
import type { DayBooking } from "@/lib/dashboard/queries";

const t = getDictionary();

function euros(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

// All of the day's bookings with an inline cancel (reason → email).
export function DayBookingsList({ bookings }: { bookings: DayBooking[] }) {
  if (bookings.length === 0) {
    return <p className="text-sm text-stone-500">{t.dashboard.noBookingsDay}</p>;
  }
  return (
    <ul className="space-y-2">
      {bookings.map((b) => (
        <BookingRow key={b.id} booking={b} />
      ))}
    </ul>
  );
}

function BookingRow({ booking }: { booking: DayBooking }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<DashActionState, FormData>(
    providerCancelBooking,
    {},
  );
  const [reason, setReason] = useState("unwell");

  if (state.ok) {
    return (
      <li className="rounded-xl border border-stone-800 bg-stone-900/50 px-4 py-3 text-sm text-stone-500">
        {fill(t.dashboard.cancelDone, { name: booking.clientName })}
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-stone-800 bg-stone-900">
      <div className="flex items-center justify-between px-4 py-3">
        <a href={`/dashboard/booking/${booking.id}`} className="min-w-0 flex-1">
          <span className="font-mono text-amber-300">{booking.timeText}</span>
          <span className="ml-3 font-serif text-stone-100">{booking.clientName}</span>
          <span className="block truncate text-xs text-stone-400">
            {booking.serviceName} · {euros(booking.priceCents)}
          </span>
        </a>
        {booking.status !== "no_show" && !booking.isPast && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="ml-3 shrink-0 text-xs text-red-400 underline"
          >
            {t.dashboard.cancelInline}
          </button>
        )}
      </div>

      {open && (
        <form action={action} className="space-y-2 border-t border-stone-800 px-4 py-3">
          <input type="hidden" name="booking_id" value={booking.id} />
          <select
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
          >
            {Object.entries(CANCEL_REASONS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          {reason === "other" && (
            <input
              name="reason_text"
              placeholder={t.dashboard.reasonText}
              className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
            />
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending
              ? t.common.loading
              : fill(t.dashboard.confirmCancel, { name: booking.clientName })}
          </button>
        </form>
      )}
    </li>
  );
}
