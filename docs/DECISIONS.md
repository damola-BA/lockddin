# DECISIONS — running log (continues wireframe DD numbering)

DD01–DD06: see wireframes (timer format, day stat bar, restrictions toggle
placement, no-deposit card treatment, 5-slot list, Operator's Ledger aesthetic).
AD01–AD12: beta adaptation decisions — see docs/BETA_SCOPE.md.

Append new decisions below as DD07+, one line of rationale each.

DD07: M0 smoke page (/smoke) reads/writes notification_log rows (template_key
"m0.smoke", status "suppressed") — reuses a real table instead of adding a
throwaway one, and suppressed rows can never be mistaken for sent email.

DD08: signup_leads table stores the email entered at step 1 — F1 requires an
abandoned signup to leave a contact, and no existing table can hold a
pre-account email.

DD09: Supabase auto-confirm stays ON; email verification is our own token
(providers.email_verified_at / email_verify_token) sent via the notifications
gateway — Supabase's confirm-first flow would block onboarding before
verification (F1 forbids that) and would bypass hard rule 6 (all email through
lib/notifications). Password reset uses admin.generateLink('recovery') sent
through the same gateway.

DD10: providers.language column added (default 'en') — F2 says to store the
dashboard language but DATA_MODEL omitted a column for it.

DD11: public storage bucket "work-photos", one folder per provider id —
simplest layout that lets RLS scope writes per provider while the booking
page reads freely.

DD12: work-photo and service-photo upload UI deferred from onboarding to
Settings (M5) — BUILD_PLAN M1 scope omits photos, the M1 acceptance list
doesn't test them, and the bucket + columns are already in place.

DD13: a discreet sign-out link is shown during onboarding — leaving entirely
is not step navigation, and without it a provider who starts on the wrong
email is trapped in the forced-linear flow.

DD14: "affected by override" uses effective_end_at (duration + buffer),
consistent with the slot engine — a booking the engine would not have
offered under the new hours is treated as conflicting.

DD15: provider-cancellation emails from override cascades are written to
notification_log as status='queued' in M2; the F9 gateway gains the
template and sends queued rows in M4 — no email leaves before its
template exists.

DD16: the onboarding schedule step embeds the real week/days editor (beta
user feedback): finishing requires ≥1 working day (regular) or ≥1 future
open day (flexible), so no provider launches an empty booking page and the
dashboard pages become edit tools, not first-time setup.

DD17: onboarding week setup is one-shot (beta user feedback): one hours
pair + one set of recurring breaks applied to all ticked weekdays at once;
per-day variation is a dashboard edit, not an onboarding requirement.

DD18: phone normalisation is Belgian-first — national 0X… numbers become
+32…, international numbers pass through; anything else is rejected. The
normalised form is the stored identifier.

DD19: manage tokens are HMAC-signed strings embedding their own 7-day
expiry; the stored column is the lookup key, so rotating it on every
action enforces single-use, and reminder emails (M4) re-issue a fresh
token so links stay usable for far-out bookings.

DD20: a collapsible "Booked here before?" phone lookup sits at the top of
the booking page (beta user feedback) — returning clients see their
appointment instantly, while first-time clients keep the friction-free
service-first flow; details-step recognition stays as the safety net.

DD21: superseded manage links resolve to honest states ("this appointment
was cancelled/has passed" + book-again link) instead of a generic
"expired" (beta user feedback); tokens are no longer rotated on cancel —
single-use is enforced by the status flip, which blocks all actions.

DD22: claim-time validation checks the picked INTERVAL (fits windows, lead
time, window, cap, no known overlap) rather than exact membership in a
recomputed slot list — gap-start slots shift whenever a hold expires or a
booking is cancelled, which made perfectly free times fail with a false
"slot taken". Races remain settled by the claim transaction + EXCLUDE
constraints.

DD32: the onboarding profile + services steps become editable after
signup — /dashboard/settings (updateProfileSettings in
lib/dashboard/settings-actions.ts edits the F2 profile fields in place;
never touches onboarding_step, no redirect, no re-verification email) and
/dashboard/services (reuses the onboarding service CRUD through a shared
components/provider/services-editor.tsx). Onboarding was one-shot, so a
provider could not fix a typo'd business name, booking link, policy, or
service after finishing setup. Day management (/dashboard/days) is
unchanged; the two dashboard nav links were added additively.

DD31: M8 hardening — graceful error boundaries per route group (client
warm-paper, provider ink-dark, plus global-error + not-found) so an
unexpected error shows a friendly retry, never a raw crash, even to a
client mid-booking. Privacy notice fleshed out for AD12. Playwright
golden-path E2E (e2e/, run with `npm run test:e2e`, gated by E2E_BASE_URL
/E2E_SLUG, kept out of the Vitest run) green against a seeded provider.

DD30: jsonb RPC params (day_overrides.extra_blocks) are passed to
supabase-js as arrays/objects, never JSON.stringify'd — stringifying
double-encodes and stores the literal string "[]" instead of an array,
which then crashed the day-manager render and could crash the slot engine
(".map is not a function"). Readers also guard with Array.isArray for any
legacy bad rows. Found via in-browser repro of the close→reopen flow.

DD29: cancellation reasons live in lib/dashboard/cancel-reasons.ts, NOT in
the "use server" actions file. A "use server" module may export only async
server actions; exporting a plain object (CANCEL_REASONS) corrupted the
whole module so every provider action (cancel/reschedule/no-show) threw on
invocation and the day-manager/booking-detail pages lost interactivity.
Found via a real-browser repro (server action 500 before any DB write).

DD28: "Manage this day" is rebuilt as a date-centric control panel (beta
user feedback): the day's bookings with inline cancel (reason → email),
plus that date's hours, daily cap (client limit), per-day service limit
(new day_overrides.service_ids), and one-off blocks — saved via one
saveDay action that applies immediately when nothing is affected and only
asks to confirm when a change would cancel bookings. Provider cancel now
returns a visible success instead of a silent redirect.

DD27: a booking can cover several services done back-to-back in one visit
(beta user feedback): total duration = sum, price = sum, one buffer (the
largest among the chosen services) at the end. The engine is unchanged —
callers pass a synthetic combined service (duration+buffer). Bookings and
holds gain service_ids[]; service_id stays as the first/primary for FK and
single-service reads. A per-day service restriction applies only if EVERY
chosen service is allowed that day.

DD26: the time-block editor folds a filled-but-not-yet-"Added" draft into
the submitted value (beta user lost a lunch break by typing the times and
hitting Save without clicking "+ Add block"); the visible list still only
shows committed rows, but a valid draft is never silently dropped.

DD25: the F9 reschedule email reuses the booking.confirmed template (new
time + fresh manage link is exactly its content); the reminder job listens
to both booking/confirmed and booking/rescheduled events, and a reschedule
sends no provider email per the F9 table.

DD24: slot generation steps through each gap by duration + buffer instead
of one slot per gap (beta user feedback): clients see every bookable time
of a day, and exact-length steps still leave no dead fragments; the
"next available" list shows whole days (all of the earliest day before
the next one starts). Amends the master spec's one-slot-per-gap rule.

DD23: localInstant rolls minute-1440 to the NEXT local midnight —
date-fns-tz silently parses "T24:00:00" as 00:00 of the same day, which
collapsed the availability loader's day window to zero width and hid all
bookings/holds from the engine (booked times kept displaying; the DB
claim transaction was the only thing preventing double-bookings). The
loader now has its own integration regression test — pure-engine tests
alone cannot catch assembly-layer bugs.
