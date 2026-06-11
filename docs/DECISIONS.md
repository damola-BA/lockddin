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
