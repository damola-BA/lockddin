-- F5 client booking transactions. One client = one phone per provider;
-- one ACTIVE (confirmed, upcoming) booking per client per provider is
-- enforced here, inside the same transaction that converts the hold.

-- Confirm a booking from a hold, upserting the client by phone.
-- Returns (booking_id, error): error ∈ ('released','existing','taken').
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
   where id = p_hold_id
     and status = 'active'
     and expires_at > now()
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

  -- One active booking per client per provider (F5).
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

  -- Cancellation window is SNAPSHOT at creation (master spec rule).
  select cancellation_window_hours into v_window_hours
    from providers where id = v_hold.provider_id;

  begin
    insert into bookings (
      provider_id, client_id, service_id,
      starts_at, ends_at, effective_end_at,
      status, cancellation_window_hours, source, manage_token
    ) values (
      v_hold.provider_id, v_client_id, v_hold.service_id,
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
  update slot_holds set client_phone = p_phone where id = p_hold_id;
  return query select v_booking_id, null::text;
end;
$$;

-- Reschedule: same service only, outside the cancellation window only,
-- non-destructive (original stays confirmed until the new slot converts).
-- Returns (booking_id, error): error ∈ ('gone','late','wrong_service',
-- 'released','taken').
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
   where id = p_old_booking_id
     and status = 'confirmed'
     and starts_at > now()
   for update;
  if not found then
    return query select null::uuid, 'gone'::text;
    return;
  end if;

  -- Inside the window there is no self-service (AD04).
  if v_old.starts_at - make_interval(hours => v_old.cancellation_window_hours)
     <= now() then
    return query select null::uuid, 'late'::text;
    return;
  end if;

  select * into v_hold
    from slot_holds
   where id = p_hold_id
     and status = 'active'
     and expires_at > now()
   for update;
  if not found then
    return query select null::uuid, 'released'::text;
    return;
  end if;

  if v_hold.service_id <> v_old.service_id
     or v_hold.provider_id <> v_old.provider_id then
    return query select null::uuid, 'wrong_service'::text;
    return;
  end if;

  -- Free the original first so back-to-back moves within the same window
  -- don't trip the EXCLUDE constraint; the transaction makes it atomic —
  -- if the insert fails, the original cancellation rolls back too.
  update bookings set status = 'cancelled_by_client'
   where id = p_old_booking_id;

  begin
    insert into bookings (
      provider_id, client_id, service_id,
      starts_at, ends_at, effective_end_at,
      status, cancellation_window_hours, source, manage_token,
      rescheduled_from
    ) values (
      v_old.provider_id, v_old.client_id, v_old.service_id,
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

revoke execute on function confirm_client_booking from public, anon, authenticated;
revoke execute on function reschedule_booking from public, anon, authenticated;
