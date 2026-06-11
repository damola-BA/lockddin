# LockdDin Beta — Claude Code Project Instructions

LockdDin is a booking system for solo service providers (hairdressers, nail techs,
tattoo artists, trainers) in Belgium. Clients book through the provider's public link
with no account. The provider manages everything from a mobile-first dashboard (PWA).

**Beta V1 has NO payments and NO WhatsApp.** Notifications are email-only (Resend).
Do not add Mollie, Stripe, WhatsApp, Twilio, or SMS code anywhere. Both return at
full launch; the architecture should not preclude them, but no stubs, no dead code.

## Stack (locked — do not substitute)

- **Next.js 15+ (App Router, TypeScript, strict)** on Vercel
- **Supabase**: Postgres + Auth (email/password) + Row Level Security
- **Resend** for all transactional email, with **react-email** templates
- **Inngest** for ALL timed/background work: hold expiry, 6-hour reminders,
  delayed provider notifications, waitlist rounds. Never use setTimeout/cron for
  business logic.
- **Tailwind CSS**. Client booking page: warm paper aesthetic. Provider dashboard:
  ink-dark. (See "Operator's Ledger" notes in docs/fragments/F5 and F7.)
- Testing: **Vitest** for unit/property tests, **Playwright** for the booking flow.

## Hard rules

1. **All times are stored UTC, displayed Europe/Brussels.** Every slot calculation
   happens in the provider's timezone (Europe/Brussels for beta). Use date-fns-tz.
   Never do timezone math by hand.
2. **Slot integrity is sacred.** Two clients must never confirm the same slot.
   Concurrency is resolved at the database level (unique constraint + transactional
   hold claim), never in application code alone. See docs/fragments/F4-scheduling.md.
3. **The scheduling engine (F4) requires tests before integration.** Implement the
   8-step availability algorithm as a pure, deterministic function
   `getAvailableSlots(provider, service, date, now)` with no I/O except one injected
   bookings/holds fetch. Property tests + the worked examples in the fragment spec
   must pass before F5 consumes it.
4. **Confirmed bookings only** appear on the dashboard. Active holds are invisible
   to the provider (spec rule, do not "improve" this).
5. **Template changes never cancel existing bookings.** Only day overrides (with
   consequence preview) can cancel bookings.
6. **Every email send goes through one module** (`lib/notifications/`) that writes a
   row to `notification_log` before sending. No ad-hoc resend calls in routes.
7. **No client accounts.** Clients are identified by phone number (stable identifier);
   email is collected for notifications only.
8. Mobile-first. The provider dashboard must be fully usable on a 380px viewport.
9. Plain, kind microcopy. EN only for beta (i18n keys from day one via a simple
   dictionary module so FR/NL can be added later without refactor).

## Repo layout

```
app/
  (client)/b/[slug]/        # public booking page (F5)
  (provider)/dashboard/     # provider app (F7, F8)
  (provider)/onboarding/    # forced linear flow (F1, F2, F3)
  api/inngest/              # Inngest handler
lib/
  scheduling/               # F4 — pure functions + tests live here
  notifications/            # F9 — single email gateway
  db/                       # typed queries, Supabase client
docs/                       # this spec pack — the source of truth
```

## Way of working

- Read the relevant `docs/fragments/F*.md` file in full before touching a fragment.
- When the spec is silent, make the smallest reasonable decision and append it to
  `docs/DECISIONS.md` with one line of rationale (continue the DD numbering from DD07).
- Keep migrations in `supabase/migrations/` — schema is defined in docs/DATA_MODEL.md.
- Definition of done per milestone = the acceptance checklist in docs/BUILD_PLAN.md.
