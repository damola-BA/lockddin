# DATA_MODEL — Postgres schema (Supabase)

UTC timestamps everywhere (`timestamptz`). Provider timezone fixed to
Europe/Brussels for beta but stored per provider for future-proofing.
RLS: providers see only their own rows; the public booking page goes through
server routes (service role) — no client-side table access for anonymous users.

## providers
- id uuid PK (= supabase auth user id)
- email text unique not null
- business_name text, provider_name text, city text
- slug text unique not null  -- booking link, real-time availability check
- location_text text null    -- optional, shown in emails
- timezone text not null default 'Europe/Brussels'
- booking_window enum('3_days','current_week','current_month','3_months') not null
- cancellation_window_hours int not null default 12  -- 12|24|48|72|168
- min_lead_time_minutes int not null default 0       -- 0..20160 (2 weeks)
- global_buffer_minutes int not null default 0
- schedule_type enum('regular','flexible') not null
- is_active boolean not null default true            -- inactive → closed state on booking page
- onboarding_step text not null default 'profile'    -- forced linear flow resume point
- work_photos jsonb not null default '[]'
- created_at timestamptz

## services
- id uuid PK, provider_id FK
- name text not null, duration_minutes int not null, price_cents int not null
- buffer_minutes int null            -- overrides global buffer when set
- prep_instructions text null
- photos jsonb not null default '[]'
- sort_order int not null
- is_active boolean not null default true
- Constraint (app-level): cannot deactivate/delete last active service;
  delete blocked if upcoming confirmed bookings exist (list them).

## week_template_days   (regular schedule only)
- id uuid PK, provider_id FK
- weekday int not null (0=Mon..6=Sun), unique(provider_id, weekday)
- start_time time not null, end_time time not null
- daily_cap int null                 -- null = unlimited
- location_text text null            -- per-day override of profile location
- service_ids uuid[] null            -- null = all services available this day

## reserved_blocks      (recurring, attached to template day)
- id uuid PK, template_day_id FK
- start_time time, end_time time, label text null   -- label private to provider

## day_overrides        (one-off, per calendar date; also how flexible mode opens days)
- id uuid PK, provider_id FK, date date not null, unique(provider_id, date)
- kind enum('closed','open','modified') not null
    -- 'open' is used by flexible mode to make a date available
- start_time time null, end_time time null   -- for 'open'/'modified'
- extra_blocks jsonb not null default '[]'   -- one-off unavailable periods [{start,end,label}]
- daily_cap int null
- location_text text null

## clients              (scoped per provider — no global client identity)
- id uuid PK, provider_id FK
- phone text not null, unique(provider_id, phone)   -- THE stable identifier
- first_name text not null
- email text null               -- latest known; updated on each booking
- no_show_count int not null default 0
- created_at timestamptz

## bookings
- id uuid PK, provider_id FK, client_id FK, service_id FK
- starts_at timestamptz not null, ends_at timestamptz not null
- effective_end_at timestamptz not null   -- ends_at + buffer; used by slot engine
- status enum('confirmed','cancelled_by_client','cancelled_by_provider',
              'completed','no_show') not null default 'confirmed'
    -- 'completed' is derived lazily: any confirmed booking past ends_at reads as past;
    -- no provider action required (master spec rule)
- cancellation_window_hours int not null  -- SNAPSHOT at creation (master spec rule)
- cancel_reason text null                 -- provider cancellations
- source enum('client','manual') not null
- manage_token text unique not null       -- signed, single-use-per-action, 7-day expiry
- rescheduled_from uuid null FK bookings
- created_at timestamptz
- **Exclusion constraint**: no two rows with status='confirmed' for the same
  provider may overlap on [starts_at, effective_end_at). Use a GiST EXCLUDE
  constraint — this is the last line of defense for slot integrity.

## slot_holds
- id uuid PK, provider_id FK, service_id FK
- starts_at timestamptz, ends_at timestamptz, effective_end_at timestamptz
- expires_at timestamptz not null         -- now() + 5 min
- client_phone text null                  -- set when details entered
- status enum('active','converted','expired') not null
- Same-shape EXCLUDE constraint vs other active holds AND a transactional check
  vs confirmed bookings at claim time. Hold→booking conversion is one transaction.

## waitlist_entries
- id uuid PK, provider_id FK, service_id FK, client_id FK
- date_preference date null               -- null = any date in window
- joined_at timestamptz not null          -- queue position
- is_active boolean not null default true
- Deactivated automatically when this client confirms any booking with this provider.

## waitlist_rounds     (notification batches for an opened slot)
- id uuid PK, provider_id FK, slot_starts_at timestamptz, service_duration int
- batch_number int, notified_entry_ids uuid[], sent_at timestamptz

## late_action_attempts   (AD04 — the deposit-feature evidence log)
- id uuid PK, provider_id FK, booking_id FK
- kind enum('cancel','reschedule'), attempted_at timestamptz
- hours_before_start numeric

## notification_log
- id uuid PK, provider_id FK null, booking_id FK null
- recipient_email text, template_key text, payload jsonb
- status enum('queued','sent','failed','suppressed')
- created_at, sent_at

## Indexes that matter
- bookings (provider_id, starts_at) — dashboard views & slot engine reads
- slot_holds (provider_id, status, expires_at) — expiry sweeps & engine reads
- clients (provider_id, phone) — recognition lookup on booking page
