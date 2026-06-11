-- Hold claim + conversion as single-transaction Postgres functions (F4).
-- Concurrency is resolved here, at the database, never in application
-- code alone (hard rule 2). The GiST EXCLUDE constraints are the backstop:
-- an exclusion_violation simply means "slot just taken".

-- Claim a 5-minute hold on a slot. Returns the hold id, or NULL when the
-- slot is already taken (by a confirmed booking or another active hold).
create or replace function claim_slot_hold(
  p_provider_id uuid,
  p_service_id uuid,
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
  -- Flip stale holds first: rows past expiry still carry status='active'
  -- until the Inngest job lands, and the EXCLUDE constraint only looks at
  -- status. Without this, an expired hold could block a legitimate claim.
  update slot_holds
     set status = 'expired'
   where provider_id = p_provider_id
     and status = 'active'
     and expires_at <= now();

  -- Transactional check vs confirmed bookings (claim-time rule). The
  -- conversion function re-checks, and the bookings EXCLUDE constraint is
  -- the final line of defense.
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
      provider_id, service_id, starts_at, ends_at, effective_end_at,
      expires_at, status
    ) values (
      p_provider_id, p_service_id, p_starts_at, p_ends_at, p_effective_end_at,
      now() + interval '5 minutes', 'active'
    )
    returning id into v_hold_id;
  exception
    when exclusion_violation then
      return null; -- another active hold won the race
  end;

  return v_hold_id;
end;
$$;

-- Convert an active, unexpired hold into a confirmed booking. Returns the
-- booking id, or NULL when the hold is gone ("Your slot has been released")
-- or the slot was taken in the meantime.
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
   where id = p_hold_id
     and status = 'active'
     and expires_at > now()
   for update;

  if not found then
    return null; -- expired mid-form → "Your slot has been released"
  end if;

  begin
    insert into bookings (
      provider_id, client_id, service_id,
      starts_at, ends_at, effective_end_at,
      status, cancellation_window_hours, source, manage_token
    ) values (
      v_hold.provider_id, p_client_id, v_hold.service_id,
      v_hold.starts_at, v_hold.ends_at, v_hold.effective_end_at,
      'confirmed', p_cancellation_window_hours, p_source, p_manage_token
    )
    returning id into v_booking_id;
  exception
    when exclusion_violation then
      return null; -- EXCLUDE backstop: slot taken between claim and confirm
  end;

  update slot_holds set status = 'converted' where id = p_hold_id;
  return v_booking_id;
end;
$$;

-- Expire a hold if (and only if) it is still active. Called by the Inngest
-- job scheduled at hold creation.
create or replace function expire_hold(p_hold_id uuid) returns boolean
language sql
security definer
set search_path = public
as $$
  update slot_holds
     set status = 'expired'
   where id = p_hold_id
     and status = 'active'
  returning true;
$$;

-- These run via the service role only.
revoke execute on function claim_slot_hold from public, anon, authenticated;
revoke execute on function convert_hold_to_booking from public, anon, authenticated;
revoke execute on function expire_hold from public, anon, authenticated;
