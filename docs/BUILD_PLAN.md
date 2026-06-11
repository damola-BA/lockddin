# BUILD_PLAN — Fastest path to a live beta

Assumes near-full-time work with Claude Code. Aggressive but honest target:
**a provider-ready beta in 4–5 weeks**; a demo-able core (booking flow end to end)
in ~2. The master spec's dependency order holds, minus F6 (payments — deleted).

Sequence: F1→(F2∥F3)→F4→F5→F9→F7→F10→F8→Waitlist.

## Milestone 0 — Skeleton (Day 1–2)
Next.js + TypeScript strict + Tailwind; Supabase project + first migration from
DATA_MODEL.md (including the EXCLUDE constraints — get these in from day one);
Resend domain verification (start immediately — DNS propagation takes hours);
Inngest wired with a hello-world job; deployed to Vercel from the first day.
✅ A deployed page reads/writes one row; one Inngest job fires on schedule.

## Milestone 1 — Foundation: F1–F3 (Day 3–6)
Auth, forced-linear onboarding with resume, profile + slug check, services CRUD,
schedule-type fork UI (template editing itself lands in M2).
✅ F1-F3 acceptance checklist passes on a phone.

## Milestone 2 — Scheduling engine: F4 (Day 6–12) ← the hard one
Pure `lib/scheduling/` first: windows builder, 8-step algorithm, hold claim +
conversion transactions, expiry job. Template editor + day overrides + range
closure + consequence preview + flexible-mode batch add.
**Tests are the milestone**: property tests, boundary tests, the concurrency test
against real Postgres, DST test (see F4 spec). Do not start M3 until green.
✅ All F4 required tests pass; you can configure a realistic week and see correct
slots for every service.

## Milestone 3 — Client booking page: F5 (Day 12–17)
Full flow with hold countdown, phone recognition, existing-booking detection,
manage-link cancel/reschedule, all edge states, late-attempt logging.
✅ F5 acceptance checklist passes — including the two-phones race test.

## Milestone 4 — Notifications: F9 (Day 17–20)
Email gateway + all templates from the F9 table + delays/suppressions + 6h
reminder jobs.
✅ Every row in the F9 table observed in a real inbox; suppression verified by
booking-then-cancelling within 5 minutes.

## Milestone 5 — Dashboard + records: F7, F10 (Day 20–26)
Day/week/month, booking detail actions (cancel with reason → preview → email,
reschedule, no-show marking), day management, client list/detail/export/delete.
✅ F7 acceptance checklist passes on a 380px viewport.

## Milestone 6 — Manual booking: F8 (Day 26–28)
✅ Walk-in booked in <30s; one-active-booking flag works in search.

## Milestone 7 — Waitlist (Day 28–32) — CUT THIS FIRST IF BEHIND
✅ Cancellation triggers batched emails; first-to-confirm wins; rounds advance.

## Milestone 8 — Hardening + beta onboarding (Day 32–35)
Playwright run of the golden path; empty/error states; privacy notice page;
seed your own real provider account; onboard beta providers **one at a time, in
person or on a call** — watch them complete onboarding without help; where they
stall is your highest-priority fix list.

## Daily rhythm with Claude Code
- Start each session: "Read CLAUDE.md and the fragment spec for today's milestone."
- One milestone branch at a time; you click through the acceptance list yourself
  before merging — never skip this, Claude Code's "it works" is not acceptance.
- New decisions go to docs/DECISIONS.md (DD07+), one line each.

## While the build runs (founder track, ~30 min/day)
The code is no longer the bottleneck — providers are. During M2–M5, line up
**5 committed beta providers** (your prototype file is the demo). Beta "committed"
means: they agree to put the link in their Instagram bio and route real clients
through it for 4 weeks. Without this, the beta launches to nobody.
