# F7 · Provider Dashboard — and F8 · Manual Booking (Core/Operational)

Ink-dark, dense, mobile-first PWA. The provider's daily tool.

## F7 — Dashboard

**Views**: Day (default — bookings in time order, visible gaps, stat bar), Week
(shape of the week), Month (overview). All views bounded by the provider's booking
window — no infinite future. **Confirmed bookings only — holds never shown.**

**Day stat bar** (wireframe DD02, adapted for no-deposit beta): bookings count ·
total booked value (€, sum of service prices) · gaps count.

**Booking card → detail**: client name, service, time, price, source
(client/manual), client's visit count.
Actions:
- **Cancel** — reason required (I'm unwell / Personal emergency / Scheduling
  conflict / Equipment or supply issue / Business closed that day / Other + free
  text) → consequence preview shows the exact email the client receives → confirm
  → email sent with reason + rebook link.
- **Reschedule** — pick new slot via the engine; client emailed; no provider
  self-notification.
- **Mark as no-show** (AD08) — available on past bookings only; undoable; increments
  client no_show_count. Surface gently: "Did Lena miss this appointment?"

**Day management**: tap a gap/day → Add a one-off block / Reduce today's cap /
Close this day (all are day overrides; template untouched). "Block time off" =
date-range closure with single consequence preview. Flexible mode: "Add available
days" batch action.

**Past bookings**: any confirmed booking past its end time displays as past
automatically — no completion action exists (master spec rule).

## F8 — Manual Booking (single path — AD07)

For clients who contact the provider directly. Three steps:

1. **Client search** — by name or phone; shows visit history and flags an existing
   active booking (one-per-client rule); "+ New client" inline (name + phone,
   email optional).
2. **Service + slot** — same engine, same rules, provider-side UI.
3. **Confirm** — booking created immediately. Client gets the standard
   confirmation email if email known (no deposit language exists anywhere in
   beta); 6-hour reminder queued. **No provider self-notification** — they created
   it.

## Acceptance

Provider can run a realistic day entirely from a phone: see the day, cancel with
reason, reschedule, block an afternoon, close a holiday week with one preview,
create a walk-in booking in under 30 seconds, mark yesterday's no-show.
