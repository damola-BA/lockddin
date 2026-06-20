-- MVP identity switch: EMAIL becomes the client's stable identifier; the phone
-- field is removed from the booking flow. Phone does nothing today (no SMS
-- reminders) and returns in a later version. Supersedes the phone-based half of
-- hard rule 7 / DATA_MODEL for beta. See DD39.
--
-- This re-keys `clients` from (provider_id, phone) to (provider_id, email) and
-- rewrites confirm_client_booking to upsert by email. Slot integrity is still
-- guaranteed by the GiST EXCLUDE constraint on bookings — unchanged.

-- ── Re-key clients on email ──────────────────────────────────────────
-- Backfill any client missing an email so the new identity key is complete.
-- (Beta data only; placeholders are obviously non-deliverable.)
update clients
   set email = 'no-email+' || id::text || '@lockddin.invalid'
 where email is null or email = '';

-- Merge clients that share an email within one provider (a real case under the
-- old phone identity: one person, two phone numbers → two client rows). Keep the
-- earliest row, repoint its bookings + waitlist to it, fold in the no-show count,
-- then drop the extras — so (provider_id, email) can become unique.
create temporary table _keep on commit drop as
  select distinct on (provider_id, email)
         id as keep_id, provider_id, email
    from clients
   order by provider_id, email, created_at, id;

create temporary table _dup on commit drop as
  select c.id as dup_id, k.keep_id, c.no_show_count
    from clients c
    join _keep k
      on c.provider_id = k.provider_id and c.email = k.email
   where c.id <> k.keep_id;

update bookings b set client_id = d.keep_id
  from _dup d where b.client_id = d.dup_id;
update waitlist_entries w set client_id = d.keep_id
  from _dup d where w.client_id = d.dup_id;
update clients k
   set no_show_count = k.no_show_count + agg.extra
  from (select keep_id, sum(no_show_count) as extra from _dup group by keep_id) agg
 where k.id = agg.keep_id;
delete from clients c using _dup d where c.id = d.dup_id;

alter table clients alter column email set not null;
alter table clients alter column phone drop not null;

alter table clients drop constraint if exists clients_provider_id_phone_key;
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'clients_provider_id_email_key'
  ) then
    alter table clients add constraint clients_provider_id_email_key
      unique (provider_id, email);
  end if;
end $$;

-- ── confirm_client_booking: upsert by email, drop the phone param ────
-- The previous 5-arg signature (…, p_phone, …) is replaced by a 4-arg one.
drop function if exists confirm_client_booking(uuid, text, text, text, text);

create or replace function confirm_client_booking(
  p_hold_id uuid,
  p_first_name text,
  p_email text,
  p_manage_token text
) returns table (booking_id uuid, error text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hold slot_holds%rowtype;
  v_client_id uuid;
  v_window_hours int;
  v_booking_id uuid;
begin
  select * into v_hold
    from slot_holds
   where id = p_hold_id and status = 'active' and expires_at > now()
   for update;
  if not found then
    return query select null::uuid, 'released'::text;
    return;
  end if;

  insert into clients (provider_id, first_name, email)
  values (v_hold.provider_id, p_first_name, p_email)
  on conflict (provider_id, email) do update
    set first_name = excluded.first_name
  returning id into v_client_id;

  -- NOTE: the one-active-booking-per-client guard is intentionally removed for
  -- the MVP (design change #1) — with no phone lookup a returning client can
  -- simply book again; the EXCLUDE constraint still prevents double-booking a
  -- slot. The 'existing' error code is therefore no longer returned here.

  select cancellation_window_hours into v_window_hours
    from providers where id = v_hold.provider_id;

  begin
    insert into bookings (
      provider_id, client_id, service_id, service_ids,
      starts_at, ends_at, effective_end_at,
      status, cancellation_window_hours, source, manage_token
    ) values (
      v_hold.provider_id, v_client_id, v_hold.service_id, v_hold.service_ids,
      v_hold.starts_at, v_hold.ends_at, v_hold.effective_end_at,
      'confirmed', v_window_hours, 'client', p_manage_token
    )
    returning id into v_booking_id;
  exception
    when exclusion_violation then
      return query select null::uuid, 'taken'::text;
      return;
  end;

  update slot_holds set status = 'converted' where id = p_hold_id;
  return query select v_booking_id, null::text;
end;
$$;

revoke execute on function confirm_client_booking from public, anon, authenticated;
