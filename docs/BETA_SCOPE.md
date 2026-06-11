# BETA_SCOPE — What's in, what's out, and every adaptation decision

The master spec defined 10 fragments around deposits (Mollie) and WhatsApp.
Beta V1 removes both. This document records exactly how each affected mechanic
was adapted, so nothing is improvised mid-build and full launch can re-add
payments/WhatsApp without unwinding beta decisions.

## In scope (beta)

| Fragment | Status |
|---|---|
| F1 Identity & Auth | In — simplified (no WhatsApp verification step) |
| F2 Provider Profile & Setup | In — adapted |
| F3 Services | In — unchanged except deposit display removed |
| F4 Scheduling Engine | In — unchanged (the core asset) |
| F5 Client Booking Page | In — adapted (no payment step) |
| ~~F6 Payments~~ | **Deleted** (not stubbed — deferred to full launch) |
| F7 Provider Dashboard | In — adapted (+ no-show marking) |
| F8 Manual Booking | In — single path |
| F9 Notifications | In — email via Resend instead of WhatsApp/SMS |
| F10 Client Records | In — unchanged + no-show count |
| Waitlist | In — **last in build order, first to cut if behind schedule** |

## Out of scope (full launch features — do not build)

Mollie deposits & refunds · WhatsApp/SMS anything · payment race-condition refund
flow · deposit links in manual booking · FR/NL translations (keys only) ·
subscription billing · provider analytics beyond the metrics in METRICS.md.

## Adaptation decisions (AD01–AD12)

**AD01 — Hold shortened 10 min → 5 min, purpose redefined.**
Original hold existed to protect a slot during payment. Without payment, checkout
is a 1-minute form, but the hold is still required to prevent two clients racing
for the same slot, and it is the concurrency architecture deposits will reuse at
full launch. 5 minutes covers form-filling; countdown shown to client.

**AD02 — Booking confirms on details submission.**
Flow: pick service → pick slot (hold starts) → enter first name, phone, email →
tap "Confirm booking" → confirmed. No payment screen. The confirm action atomically
converts the hold into a booking (DB transaction, see F4).

**AD03 — Email replaces WhatsApp 1:1; phone remains the stable identifier.**
Every WhatsApp template in the master spec becomes an email template with the same
trigger, timing, and content rules (see F9). Email is collected at booking solely
for notifications. Returning-client recognition, duplicate prevention, and the
one-active-booking rule all still key on phone number, exactly as the master spec
defines — so client records migrate unchanged when WhatsApp arrives.

**AD04 — Cancellation window mechanic preserved without money.**
Outside the window: client self-cancels or reschedules via the signed link in their
email. Inside the window: self-service cancel/reschedule is **not available**; the
page explains the provider's notice policy and shows the provider's contact. The
provider can always cancel from the dashboard. Every inside-window attempt is
logged (`late_action_attempts`) — this is core beta data: it measures exactly the
behavior deposits will later monetize.

**AD05 — Provider cancellation: refund step removed, everything else intact.**
Reason selection (preset list + Other) → consequence preview (affected clients,
exact email text) → confirm → cancellation email with reason + rebook link.

**AD06 — Reschedule: "deposit transfers" clause becomes a no-op.**
Same rules: client may reschedule outside the window only; same service only;
non-destructive if no slots (keep original or join waitlist). Provider may
reschedule any time.

**AD07 — Manual booking collapses to one path.**
Master spec Path A (send deposit link) is meaningless without Mollie. Beta manual
booking = client search → service + slot → confirm. Client receives the standard
confirmation email (if email known; phone-only manual clients simply get no email
— acceptable for beta, log it). 6-hour reminder queued as normal.

**AD08 — No-show marking added (new, replaces deposit protection with data).**
On any past booking, the provider can tap "Mark as no-show" (undoable). Stored on
the booking and aggregated per client and per provider. This is the beta's most
important new affordance: 8 weeks of real no-show data per provider is the sales
pitch for the deposit feature at full launch.

**AD09 — Waitlist mechanic preserved; channel is email; batching kept at 3.**
First-to-confirm wins via the same 5-minute hold. 10-minute rounds between batches
(unchanged). Lead time still does not apply to waitlist notifications.

**AD10 — Provider notification delay kept at 5–10 min (use 5), suppression kept.**
Even by email, the provider should never hear about a booking that didn't survive
its first minutes. Implemented as a delayed Inngest job that checks booking status
before sending. Same for the 20-minute cancellation-notification suppression rule.

**AD11 — Onboarding loses the WhatsApp verification gate.**
Forced linear flow stays: email → password (email verification before onboarding
completes) → profile → services → schedule. The notification-channel step is
removed entirely for beta. Provider notification email = account email.

**AD12 — GDPR-light posture for beta (not zero).**
No payment data and no WhatsApp removes the heavy items, but we still store names,
phones, emails. Beta ships with: a plain-language privacy notice linked on the
booking page, client data deletion (already spec'd in F10), CSV export, and a
consent line at booking ("You'll receive booking emails about this appointment").
Marketing consent is NOT collected (we send transactional email only).

## The one-question test for any scope debate

> Does building this teach us whether providers will run their week on LockdDin?

If no — it waits for full launch.
