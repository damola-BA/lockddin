-- M1 foundation: abandoned-signup capture, own email verification,
-- dashboard language, work-photos storage bucket. See DD08–DD11.

-- ── signup_leads (DD08) ──────────────────────────────────────────────
-- F1: email is captured on its own screen so an abandoned signup still
-- leaves a contact. Written via service role only; no provider access.

create table signup_leads (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now(),
  converted_at timestamptz -- set when the signup becomes a provider
);

alter table signup_leads enable row level security;
-- no policies: service-role access only.

-- ── providers: own email verification (DD09) + language (DD10) ──────
-- Supabase auto-confirm stays ON; verification is ours so onboarding can
-- proceed before the email is verified (F1) and so the email goes through
-- lib/notifications like every other send (hard rule 6).

alter table providers
  add column email_verified_at timestamptz,
  add column email_verify_token uuid not null default gen_random_uuid(),
  add column language text not null default 'en';

-- The providers row is created at the profile step, before the schedule
-- fork chooses regular/flexible — the column needs a starting value.
alter table providers alter column schedule_type set default 'regular';

-- ── work photos bucket (DD11) ────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('work-photos', 'work-photos', true)
on conflict (id) do nothing;

create policy "providers manage own work photos"
on storage.objects for all to authenticated
using (bucket_id = 'work-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'work-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "work photos are public"
on storage.objects for select to anon
using (bucket_id = 'work-photos');
