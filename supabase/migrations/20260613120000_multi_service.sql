-- Multi-service bookings (DD27). A booking/hold can cover several services
-- done back-to-back in one visit: total duration = sum, price = sum, one
-- buffer (the largest among the chosen services) at the end. The slot
-- engine is unchanged — callers pass it a combined duration + buffer.
--
-- service_id stays as the FIRST/primary service so existing FKs and single-
-- service reads keep working; service_ids[] carries the full ordered list.

alter table bookings add column service_ids uuid[] not null default '{}';
update bookings set service_ids = array[service_id] where cardinality(service_ids) = 0;

alter table slot_holds add column service_ids uuid[] not null default '{}';
update slot_holds set service_ids = array[service_id] where cardinality(service_ids) = 0;

-- ── claim_slot_hold: now takes the full service list ─────────────────
drop function if exists claim_slot_hold(uuid, uuid, timestamptz, timestamptz, timestamptz);

create or replace function claim_slot_hold(
  p_provider_id uuid,
  p_service_ids uuid[],
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_effective_end_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hold_id uuid;
begin
  update slot_holds
     set status = 'expired'
   where provider_id = p_provider_id
     and status = 'active'
     and expires_at <= now();

  if exists (
    select 1 from bookings
     where provider_id = p_provider_id
       and status = 'confirmed'
       and tstzrange(starts_at, effective_end_at, '[)') &&
           tstzrange(p_starts_at, p_effective_end_at, '[)')
  ) then
    return null;
  end if;

  begin
    insert into slot_holds (
      provider_id, service_id, service_ids, starts_at, ends_at,
      effective_end_at, expires_at, status
    ) values (
      p_provider_id, p_service_ids[1], p_service_ids, p_starts_at, p_ends_at,
      p_effective_end_at, now() + interval '5 minutes', 'active'
    )
    returning id into v_hold_id;
  exception
    when exclusion_violation then
      return null;
  end;

  return v_hold_id;
end;
$$;

-- ── confirm_client_booking: copy the hold's service list ─────────────
create or replace function confirm_client_booking(
  p_hold_id uuid,
  p_phone text,
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

  insert into clients (provider_id, phone, first_name, email)
  values (v_hold.provider_id, p_phone, p_first_name, p_email)
  on conflict (provider_id, phone) do update
    set first_name = excluded.first_name,
        email = coalesce(excluded.email, clients.email)
  returning id into v_client_id;

  if exists (
    select 1 from bookings b
     where b.provider_id = v_hold.provider_id
       and b.client_id = v_client_id
       and b.status = 'confirmed'
       and b.starts_at > now()
  ) then
    return query select null::uuid, 'existing'::text;
    return;
  end if;

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

  update slot_holds set status = 'converted', client_phone = p_phone where id = p_hold_id;
  return query select v_booking_id, null::text;
end;
$$;

-- ── convert_hold_to_booking (manual path): copy the service list ─────
create or replace function convert_hold_to_booking(
  p_hold_id uuid,
  p_client_id uuid,
  p_cancellation_window_hours int,
  p_manage_token text,
  p_source booking_source
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hold slot_holds%rowtype;
  v_booking_id uuid;
begin
  select * into v_hold
    from slot_holds
   where id = p_hold_id and status = 'active' and expires_at > now()
   for update;
  if not found then return null; end if;

  begin
    insert into bookings (
      provider_id, client_id, service_id, service_ids,
      starts_at, ends_at, effective_end_at,
      status, cancellation_window_hours, source, manage_token
    ) values (
      v_hold.provider_id, p_client_id, v_hold.service_id, v_hold.service_ids,
      v_hold.starts_at, v_hold.ends_at, v_hold.effective_end_at,
      'confirmed', p_cancellation_window_hours, p_source, p_manage_token
    )
    returning id into v_booking_id;
  exception
    when exclusion_violation then
      return null;
  end;

  update slot_holds set status = 'converted' where id = p_hold_id;
  return v_booking_id;
end;
$$;

-- ── reschedule_booking (client): carry the same service list ─────────
create or replace function reschedule_booking(
  p_old_booking_id uuid,
  p_hold_id uuid,
  p_new_manage_token text
) returns table (booking_id uuid, error text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old bookings%rowtype;
  v_hold slot_holds%rowtype;
  v_booking_id uuid;
begin
  select * into v_old
    from bookings
   where id = p_old_booking_id and status = 'confirmed' and starts_at > now()
   for update;
  if not found then
    return query select null::uuid, 'gone'::text;
    return;
  end if;

  if v_old.starts_at - make_interval(hours => v_old.cancellation_window_hours) <= now() then
    return query select null::uuid, 'late'::text;
    return;
  end if;

  select * into v_hold
    from slot_holds
   where id = p_hold_id and status = 'active' and expires_at > now()
   for update;
  if not found then
    return query select null::uuid, 'released'::text;
    return;
  end if;

  if v_hold.provider_id <> v_old.provider_id then
    return query select null::uuid, 'wrong_service'::text;
    return;
  end if;

  update bookings set status = 'cancelled_by_client' where id = p_old_booking_id;

  begin
    insert into bookings (
      provider_id, client_id, service_id, service_ids,
      starts_at, ends_at, effective_end_at,
      status, cancellation_window_hours, source, manage_token, rescheduled_from
    ) values (
      v_old.provider_id, v_old.client_id, v_old.service_id, v_old.service_ids,
      v_hold.starts_at, v_hold.ends_at, v_hold.effective_end_at,
      'confirmed', v_old.cancellation_window_hours, 'client',
      p_new_manage_token, v_old.id
    )
    returning id into v_booking_id;
  exception
    when exclusion_violation then
      raise exception 'slot_taken' using errcode = 'P0001';
  end;

  update slot_holds set status = 'converted' where id = p_hold_id;
  return query select v_booking_id, null::text;
exception
  when others then
    if sqlerrm = 'slot_taken' then
      return query select null::uuid, 'taken'::text;
      return;
    end if;
    raise;
end;
$$;

-- ── provider_reschedule_booking: carry the same service list ─────────
create or replace function provider_reschedule_booking(
  p_old_booking_id uuid,
  p_provider_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_effective_end_at timestamptz,
  p_new_token text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old bookings%rowtype;
  v_new uuid;
begin
  select * into v_old
    from bookings
   where id = p_old_booking_id and provider_id = p_provider_id and status = 'confirmed'
   for update;
  if not found then return null; end if;

  update bookings set status = 'cancelled_by_provider' where id = p_old_booking_id;

  begin
    insert into bookings (
      provider_id, client_id, service_id, service_ids, starts_at, ends_at,
      effective_end_at, status, cancellation_window_hours, source,
      manage_token, rescheduled_from
    ) values (
      v_old.provider_id, v_old.client_id, v_old.service_id, v_old.service_ids,
      p_starts_at, p_ends_at, p_effective_end_at, 'confirmed',
      v_old.cancellation_window_hours, v_old.source, p_new_token, v_old.id
    )
    returning id into v_new;
  exception
    when exclusion_violation then
      raise exception 'slot_taken' using errcode = 'P0001';
  end;

  return v_new;
end;
$$;

revoke execute on function claim_slot_hold from public, anon, authenticated;
revoke execute on function confirm_client_booking from public, anon, authenticated;
revoke execute on function convert_hold_to_booking from public, anon, authenticated;
revoke execute on function reschedule_booking from public, anon, authenticated;
revoke execute on function provider_reschedule_booking from public, anon, authenticated;
