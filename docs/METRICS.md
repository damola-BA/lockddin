# METRICS — What the beta must prove

The beta answers two questions. Instrument from day one (simple SQL views are
enough — no analytics product needed).

## Q1 — Will providers run their week on this?

- **Activation**: % of onboarded providers with ≥1 real client booking in week 1.
- **Retention (the metric)**: providers with ≥3 client-initiated bookings/week at
  week 4. This is the bar for "the workflow wins."
- Manual vs client-initiated booking ratio over time (should shift toward
  client-initiated as providers trust the link).
- Onboarding completion rate + step where drop-offs happen.

## Q2 — Evidence for the deposit feature (full-launch ammunition)

- **No-show rate per provider** (AD08 marking): no-shows / completed+no-show
  bookings. After 8 weeks: "You had 11 no-shows worth €640. Deposits would have
  protected that." This sentence is the full-launch upgrade pitch AND the
  subscription pricing justification.
- **Late-action attempts** (AD04 log): how often clients hit the
  inside-window wall — proves the cancellation-window mechanic matters.
- Waitlist conversion: % of opened slots refilled via waitlist (if built).

## Guardrails (watch weekly)

- Email delivery rate (notification_log failed %) — should be >98%.
- Slot-conflict events at confirm (constraint violations) — should be ~0; any
  spike = engine bug, stop everything.
- Time from link-open to confirmed booking (target: under 2 minutes, the master
  spec's promise).

## Beta exit criteria (move to full launch build when…)

1. ≥4 of 5 providers active at week 4 (Q1 retention bar), AND
2. measured no-show pain exists (any provider >5% no-show rate), AND
3. at least 2 providers say they'd pay — ask them directly: "Would you pay
   €X/month to keep this after the beta?" against Salonkee's €49 anchor.
Then: start Mollie for Platforms + Meta verification immediately (their lead
times become your critical path), and build F6 + WhatsApp on top of the
already-proven hold/notification architecture.
