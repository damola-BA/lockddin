-- LockdDin initial schema — source of truth: docs/DATA_MODEL.md
-- UTC timestamps everywhere. RLS: providers see only their own rows;
-- the public booking page uses server routes (service role), never
-- client-side anonymous table access.

create extension if not exists btree_gist;

-- ── enums ────────────────────────────────────────────────────────────

create type booking_window as enum ('3_days', 'current_week', 'current_month', '3_months');
create type schedule_type as enum ('regular', 'flexible');
create type override_kind as enum ('closed', 'open', 'modified');
create type booking_status as enum (
  'confirmed', 'cancelled_by_client', 'cancelled_by_provider', 'completed', 'no_show'
);
create type booking_source as enum ('client', 'manual');
create type hold_status as enum ('active', 'converted', 'expired');
create type late_action_kind as enum ('cancel', 'reschedule');
create type notification_status as enum ('queued', 'sent', 'failed', 'suppressed');

-- ── providers ────────────────────────────────────────────────────────

create table providers (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  business_name text,
  provider_name text,
  city text,
  slug text unique not null,
  location_text text,
  timezone text not null default 'Europe/Brussels',
  booking_window booking_window not null,
  cancellation_window_hours int not null default 12,
  min_lead_time_minutes int not null default 0
    check (min_lead_time_minutes between 0 and 20160),
  global_buffer_minutes int not null default 0,
  schedule_type schedule_type not null,
  is_active boolean not null default true,
  onboarding_step text not null default 'profile',
  work_photos jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ── services ─────────────────────────────────────────────────────────
-- App-level constraints (not enforced here): cannot deactivate/delete the
-- last active service; delete blocked while upcoming confirmed bookings exist.

create table services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers (id) on delete cascade,
  name text not null,
  duration_minutes int not null check (duration_minutes > 0),
  price_cents int not null check (price_cents >= 0),
  buffer_minutes int,
  prep_instructions text,
  photos jsonb not null default '[]',
  sort_order int not null,
  is_active boolean not null default true
);

-- ── week_template_days (regular schedule only) ───────────────────────

create table week_template_days (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0=Mon..6=Sun
  start_time time not null,
  end_time time not null,
  daily_cap int,
  location_text text,
  service_ids uuid[], -- null = all services available this day
  unique (provider_id, weekday)
);

-- ── reserved_blocks (recurring, attached to template day) ────────────

create table reserved_blocks (
  id uuid primary key default gen_random_uuid(),
  template_day_id uuid not null references week_template_days (id) on delete cascade,
  start_time time not null,
  end_time time not null,
  label text -- private to provider
);

-- ── day_overrides (one-off, per calendar date) ───────────────────────
-- 'open' is how flexible mode makes a date available.

create table day_overrides (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers (id) on delete cascade,
  date date not null,
  kind override_kind not null,
  start_time time,
  end_time time,
  extra_blocks jsonb not null default '[]', -- [{start,end,label}]
  daily_cap int,
  location_text text,
  unique (provider_id, date)
);

-- ── clients (scoped per provider — no global identity) ───────────────

create table clients (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers (id) on delete cascade,
  phone text not null, -- THE stable identifier
  first_name text not null,
  email text, -- latest known; updated on each booking
  no_show_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (provider_id, phone)
);

-- ── bookings ─────────────────────────────────────────────────────────

create table bookings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers (id) on delete cascade,
  client_id uuid not null references clients (id),
  service_id uuid not null references services (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  effective_end_at timestamptz not null, -- ends_at + buffer; used by slot engine
  status booking_status not null default 'confirmed',
  -- 'completed' is derived lazily: any confirmed booking past ends_at reads
  -- as past; no provider action required (master spec rule)
  cancellation_window_hours int not null, -- SNAPSHOT at creation (master spec rule)
  cancel_reason text,
  source booking_source not null,
  manage_token text unique not null, -- signed, single-use-per-action, 7-day expiry
  rescheduled_from uuid references bookings (id),
  created_at timestamptz not null default now(),
  check (starts_at < ends_at and ends_at <= effective_end_at),
  -- Last line of defense for slot integrity: no two confirmed bookings for
  -- the same provider may overlap on [starts_at, effective_end_at).
  constraint bookings_no_confirmed_overlap exclude using gist (
    provider_id with =,
    tstzrange(starts_at, effective_end_at, '[)') with &&
  ) where (status = 'confirmed')
);

-- ── slot_holds ───────────────────────────────────────────────────────
-- Hold→booking conversion is one transaction; claim also checks vs
-- confirmed bookings transactionally (application layer, F4).

create table slot_holds (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers (id) on delete cascade,
  service_id uuid not null references services (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  effective_end_at timestamptz not null,
  expires_at timestamptz not null, -- now() + 5 min
  client_phone text, -- set when details entered
  status hold_status not null,
  check (starts_at < ends_at and ends_at <= effective_end_at),
  constraint slot_holds_no_active_overlap exclude using gist (
    provider_id with =,
    tstzrange(starts_at, effective_end_at, '[)') with &&
  ) where (status = 'active')
);

-- ── waitlist_entries ─────────────────────────────────────────────────
-- Deactivated automatically when this client confirms any booking with
-- this provider.

create table waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers (id) on delete cascade,
  service_id uuid not null references services (id),
  client_id uuid not null references clients (id),
  date_preference date, -- null = any date in window
  joined_at timestamptz not null default now(), -- queue position
  is_active boolean not null default true
);

-- ── waitlist_rounds (notification batches for an opened slot) ────────

create table waitlist_rounds (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers (id) on delete cascade,
  slot_starts_at timestamptz not null,
  service_duration int not null,
  batch_number int not null,
  notified_entry_ids uuid[] not null default '{}',
  sent_at timestamptz not null default now()
);

-- ── late_action_attempts (AD04 — deposit-feature evidence log) ───────

create table late_action_attempts (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers (id) on delete cascade,
  booking_id uuid not null references bookings (id) on delete cascade,
  kind late_action_kind not null,
  attempted_at timestamptz not null default now(),
  hours_before_start numeric not null
);

-- ── notification_log ─────────────────────────────────────────────────

create table notification_log (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references providers (id) on delete set null,
  booking_id uuid references bookings (id) on delete set null,
  recipient_email text not null,
  template_key text not null,
  payload jsonb not null default '{}',
  status notification_status not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- ── indexes that matter ──────────────────────────────────────────────

create index bookings_provider_starts_idx on bookings (provider_id, starts_at);
create index slot_holds_provider_status_expires_idx on slot_holds (provider_id, status, expires_at);
-- clients (provider_id, phone) is covered by its unique constraint.

-- ── row level security ───────────────────────────────────────────────
-- Providers (authenticated) see only their own rows. Anonymous clients
-- never touch tables directly — the booking page goes through server
-- routes using the service role, which bypasses RLS.

alter table providers enable row level security;
alter table services enable row level security;
alter table week_template_days enable row level security;
alter table reserved_blocks enable row level security;
alter table day_overrides enable row level security;
alter table clients enable row level security;
alter table bookings enable row level security;
alter table slot_holds enable row level security;
alter table waitlist_entries enable row level security;
alter table waitlist_rounds enable row level security;
alter table late_action_attempts enable row level security;
alter table notification_log enable row level security;

create policy "providers own row" on providers
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "own services" on services
  for all to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

create policy "own template days" on week_template_days
  for all to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

create policy "own reserved blocks" on reserved_blocks
  for all to authenticated
  using (
    exists (
      select 1 from week_template_days d
      where d.id = template_day_id and d.provider_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from week_template_days d
      where d.id = template_day_id and d.provider_id = auth.uid()
    )
  );

create policy "own day overrides" on day_overrides
  for all to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

create policy "own clients" on clients
  for all to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

create policy "own bookings" on bookings
  for all to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

-- Active holds are invisible to the provider (spec rule). No select policy
-- for providers on slot_holds — holds are managed solely via service role.

create policy "own waitlist entries" on waitlist_entries
  for all to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

create policy "own waitlist rounds" on waitlist_rounds
  for all to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

create policy "own late attempts" on late_action_attempts
  for all to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

create policy "own notification log" on notification_log
  for all to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());
