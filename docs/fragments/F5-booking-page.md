# F5 · Client Booking Page (Core)

Public page at `/b/{slug}`. No account, no app, no download. Warm-paper aesthetic
("Operator's Ledger": editorial serif for names/dates, mono for times/prices —
see wireframes). Mobile-first; must feel instant.

## Main flow

1. **Profile header** — business name, city, work photos.
2. **Service selection** — name, duration, price, service photos, prep
   instructions inline when set. (No deposit line in beta — price only.)
3. **Slot picker — two views.** Default: the 5 earliest available slots as a list
   (wireframe DD05 fixed this at 5). Toggle "Choose a different day" → calendar of
   the booking window only (past days greyed, impossible days unavailable); tapping
   a day lists that day's slots.
4. **Details step — hold starts here (5 min, countdown visible).**
   First name + phone + email. Phone recognition: known phone auto-fills name.
   - **Existing booking detection**: if the phone has a confirmed booking with this
     provider, do NOT proceed — show their current appointment (service, date,
     time) with cancel/reschedule options. One active booking per client per
     provider, enforced here and at the DB.
   - Consent line: "You'll receive booking emails about this appointment."
     Privacy notice link in the footer.
5. **Confirm booking** (replaces payment — AD02). Atomic hold→booking conversion.
6. **Confirmation screen** — service, date, time, location if set, prep
   instructions, the cancellation policy ("Free cancellation until X"), and
   "Confirmation sent to {email}".

## Cancel / reschedule via emailed link

Signed `manage_token` link in every client email; 7-day expiry; actions are
single-use.

- **Outside the cancellation window**: Cancel (confirmed instantly, slot released,
  waitlist check fires) or Reschedule (same service only; new slot via the engine;
  original booking kept if they abandon — non-destructive; no slots → offer
  waitlist or keep original).
- **Inside the window** (AD04): no self-service. Page explains the policy
  ("{Provider} asks for {N} hours notice") and shows provider contact. The attempt
  is logged to `late_action_attempts`.
- Service change ≠ reschedule: tell the client to cancel and rebook (master spec
  rule); only possible outside the window.

## Edge states (all required)

- Inactive business → closed state.
- No availability → waitlist join (any date in window, or a specific day);
  name/phone auto-fill for returning clients.
- Hold expired mid-form → "Your slot has been released" → back to picker.
- Slot conflict at confirm (constraint violation) → friendly "just taken" message
  → back to picker. (The Mollie race-condition refund flow is gone in beta; this
  is its only remnant.)

## Acceptance

Two phones racing for the last slot: one confirms, one gets the taken message.
Returning phone sees existing booking, not a new flow. Late-cancel attempt is
blocked and logged. Every email arrives with working manage links.
