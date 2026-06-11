# F1 · Identity & Authentication — and F2 · Profile — and F3 · Services (Foundation)

Three foundation fragments, combined here because they're small in beta form.

## F1 — Auth

- Supabase email/password auth. Email captured first (own screen) so an abandoned
  signup still leaves a contact.
- Email verification required **before onboarding completes**, not before it starts.
- Persistent session across PWA reloads.
- Password reset: secure email link, single use, 30-minute expiry, invalidated after use.
- **Forced linear onboarding**: email → password → profile → services → schedule.
  No skipping, no free navigation. Closing mid-onboarding returns the provider to
  the last incomplete step (`providers.onboarding_step`). Dashboard inaccessible
  until onboarding is complete.
- (Beta change AD11: there is NO WhatsApp/SMS verification step.)

## F2 — Provider profile & setup

Collected during onboarding, editable later in Settings:

- Business name, provider name, city.
- **Slug** (booking link): availability checked in real time as they type; confirmed
  on save; format `lockddin.app/b/{slug}` (or current domain).
- Optional location (plain text) — appears in client emails; can be overridden per
  template day.
- Work photos (general portfolio for the booking page header). Supabase storage.
- **Booking window**: 3 days / current week / current month / 3 months. Calendar
  boundaries, never rolling-day counts: "current week" = through Sunday;
  "3 months" = current month + next two full months.
- **Cancellation window**: 12h (default) / 24h / 48h / 72h / 1 week. Shown to
  clients before they confirm a booking.
- **Global buffer**: default none.
- **Minimum lead time**: default none; options 1h–2 weeks.
- **Schedule type fork** (regular vs flexible) with the exact reassurance copy from
  the master spec: "Specific-date exceptions can always be handled separately —
  this is just your starting pattern."
- Business active/inactive toggle → inactive shows a closed state on the booking page.
- Dashboard language: EN only at beta; store the field.

## F3 — Services

- CRUD with: name, duration (minutes), price (€ — display only in beta, no payment),
  per-service buffer override, prep instructions (shown at service selection, at
  the confirm step, and in confirmation + reminder emails), photo gallery,
  provider-defined sort order.
- Minimum one active service enforced (cannot deactivate/delete the last one).
- Delete blocked if upcoming confirmed bookings exist — show the affected bookings.
- Service restriction per template day is configured in F4's schedule setup, but
  surfaced during onboarding (master spec DD03).

## Acceptance

- New provider can sign up, verify email, complete all onboarding steps, land on
  an empty dashboard; quitting at any step resumes correctly.
- Slug collisions rejected in real time.
- Deleting the only active service is impossible; deleting a booked service shows
  the blocking bookings.
