# DECISIONS — running log (continues wireframe DD numbering)

DD01–DD06: see wireframes (timer format, day stat bar, restrictions toggle
placement, no-deposit card treatment, 5-slot list, Operator's Ledger aesthetic).
AD01–AD12: beta adaptation decisions — see docs/BETA_SCOPE.md.

Append new decisions below as DD07+, one line of rationale each.

DD07: M0 smoke page (/smoke) reads/writes notification_log rows (template_key
"m0.smoke", status "suppressed") — reuses a real table instead of adding a
throwaway one, and suppressed rows can never be mistaken for sent email.
