# F4 · Scheduling Engine (Core — CRITICAL PATH)

The heart of the product and the only fragment where a bug is catastrophic
(double-booking destroys provider trust permanently). Build as pure functions in
`lib/scheduling/` with tests BEFORE any UI consumes it.

## Inputs the engine knows about

- Week template (regular mode): working days, hours, recurring reserved blocks,
  per-day service restrictions, per-day cap, per-day location.
- Day overrides: close a date / one-off blocks / reduced cap / (flexible mode) open
  a date with hours.
- Flexible mode: template skipped entirely; only `day_overrides.kind='open'` dates
  are available. Dashboard provides a batch "add available days" action that applies
  default hours to multiple selected dates.
- Provider settings: booking window, min lead time, global buffer.
- Service: duration, per-service buffer (overrides global).
- Confirmed bookings + active holds (the only DB read).

**Template changes only affect future availability. They never cancel existing
confirmed bookings.** Only day overrides (via consequence preview) cancel bookings.

## The 8-step availability algorithm (per service, per date)

Run cheap checks first; the DB read is step 6 and only fires if 1–5 pass.

1. **Availability check** — is this service allowed on this day? (template day's
   `service_ids`; null = all). Fail → stop.
2. **Capacity check** — daily cap set and already reached by confirmed bookings →
   stop. (This needs a count; cache the count from step 6's fetch when iterating a
   range of dates — implementation may reorder 2 after 6 internally as long as
   observable behavior matches.)
3. **Mathematical check** — working hours minus reserved blocks minus override
   blocks: if the longest uninterrupted window < service duration + buffer → stop.
4. **Lead time check** — hide any slot starting within `min_lead_time` from `now`.
5. **Build windows** — working hours − recurring blocks − one-off blocks → list of
   candidate windows; keep only windows ≥ duration + buffer.
6. **DB read** — fetch confirmed bookings (status='confirmed', using
   `effective_end_at`) and active holds for this provider/date; merge into occupied
   ranges.
7. **Slot generation** — for each window, walk the gaps between occupied ranges;
   every gap ≥ duration + buffer yields ONE slot at the **gap start time**.
   No 15-minute subdivision (master spec explicitly removed it).
8. **Return** — slots in chronological order, or empty (→ F5 shows waitlist option).

Buffer semantics: a 90-min service with 30-min buffer occupies 120 min
(`effective_end_at`); the client sees and books 90 min. Buffer is invisible to clients.

## Holds & conversion (concurrency — read carefully)

- Entering the details step places a **5-minute hold** (AD01). The slot disappears
  from availability for everyone else immediately.
- Claiming a hold = single transaction: re-run conflict check against confirmed
  bookings + active holds, insert hold. DB EXCLUDE constraints (see DATA_MODEL) are
  the backstop — a constraint violation means "slot just taken," surface gracefully.
- Confirming a booking = single transaction: verify hold active & unexpired →
  insert booking → mark hold converted. If the hold expired mid-form, show the
  master spec's "Your slot has been released" state and return to the picker.
- Expiry: Inngest job scheduled at hold creation (+5 min) flips status to expired
  if still active. Engine treats only `status='active' AND expires_at > now()` as
  occupying.

## Consequence preview & cancellation cascade

Before any override/closure that affects confirmed bookings, return the full list:
client name, service, time (per affected booking). Date-range closure ("Block time
off") = one preview for the whole range, one confirm. On confirm: cancel all
affected bookings atomically and enqueue one cancellation email per client (F9).
No partial application — all or nothing.

## Required tests (gate for moving to F5)

- Worked example from the wireframes: Balayage 180 min, €145 — appears in slot
  lists correctly around reserved blocks and existing bookings.
- Property tests (fast-check): for random templates/blocks/bookings, every returned
  slot (a) fits duration+buffer inside a window, (b) overlaps no confirmed booking
  or active hold, (c) respects lead time and booking window boundaries.
- Boundary tests: booking-window edges (Sunday end of "current week"; month
  boundaries for "3 months"); slot exactly at closing time; service longer than any
  window; cap reached exactly.
- Concurrency test: two parallel hold claims for the same slot — exactly one wins
  (run against a real Postgres, not a mock).
- DST test: slots across the late-October and late-March Europe/Brussels
  transitions are 60/90-min-accurate.
