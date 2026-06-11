# F9 · Notifications (email) — F10 · Client Records — Waitlist

## F9 — Notifications (Resend + react-email, via lib/notifications/ only)

Every send writes `notification_log` first (status queued→sent/failed/suppressed).
Notifications fire on **booking status change**, not on any payment event.
Sender: `bookings@{domain}` with the provider's business name as the from-name.
Reply-to: provider's email.

| Trigger | To | Content / rules |
|---|---|---|
| Booking confirmed (client flow) | Client | Business name, service, date, time, location if set, prep instructions if set, cancellation policy line, manage link. Immediate. |
| Booking confirmed (client flow) | Provider | Client name, service, date, time. **Delayed 5 min (Inngest); suppressed if cancelled within the delay** (AD10). |
| Manual booking created | Client (if email known) | Same as confirmation, no provider notification. Immediate. |
| 6h before appointment | Client | Reminder: service, date, time, location, prep instructions, manage link. **Only if booked >6h in advance** (no reminder for same-day quick bookings). One reminder only. |
| Client cancels (outside window) | Client | Cancellation confirmed. |
| Client cancels (outside window) | Provider | Client name cancelled, slot now free. **Delayed 20 min; suppressed if the same client rebooks within the window.** |
| Provider cancels | Client | Cancelled by provider + chosen reason + apology + rebook link. (No provider self-notification.) |
| Reschedule (either party) | Client | New date/time/location, manage link. No provider email on provider-initiated. |
| Waitlist match | Waitlisted client | Slot now available for their service, date/time, direct pre-filled booking link, "first to confirm gets it — the slot is not held for you." |

Reminder scheduling: enqueue an Inngest job at booking creation for
`starts_at − 6h`; the job re-checks booking status (and reschedules itself if the
booking was rescheduled) before sending.

## F10 — Client Records

- Searchable list (name / phone). Detail: visit history, booking count, total
  booked value, **no-show count** (AD08).
- Auto-created on first booking (client or manual). Phone = stable identifier;
  email updated to latest provided.
- One active confirmed booking per client per provider — enforced here and in F5/F8.
- Delete client (hard delete of personal fields; bookings keep an anonymised
  placeholder). CSV export of client records.
- Confirming any booking deactivates that client's active waitlist entries.

## Waitlist (build LAST — first to cut if behind)

1. No slots in window → join option (F5): any date, or specific day. Queue position
   = joined_at.
2. Slot opens via cancellation, provider unblocking time, or the booking window
   rolling forward (daily Inngest cron checks the new day against active entries).
3. **Duration-fit rule**: eligible entries are those whose service duration ≤ the
   freed duration. No gap-merging cleverness.
4. Notify the **first 3 eligible** by email; 10-minute rounds; next 3 if unfilled;
   stop when booked or exhausted. First to complete the booking flow (standard
   5-min hold) wins.
5. Lead time does NOT apply to waitlist bookings.
6. Entry deactivated on any confirmed booking by that client with this provider.
