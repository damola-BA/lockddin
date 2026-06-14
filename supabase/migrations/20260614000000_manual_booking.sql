-- Manual / walk-in booking (F8, AD07). The provider creates the booking
-- directly — no 5-minute hold. One active confirmed booking per client per
-- provider is enforced here; the GiST EXCLUDE constraint is the backstop
-- against double-booking a slot.
create or replace function create_manual_booking(
  p_provider_id uuid,
  p_client_id uuid,
  p_service_ids uuid[],
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_effective_end_at timestamptz,
  p_manage_token text
) returns table (booking_id uuid, error text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window int;
  v_id uuid;
begin
  if exists (
    select 1 from bookings
     where provider_id = p_provider_id
       and client_id = p_client_id
       and status = 'confirmed'
       and starts_at > now()
  ) then
    return query select null::uuid, 'existing'::text;
    return;
  end if;

  select cancellation_window_hours into v_window
    from providers where id = p_provider_id;

  begin
    insert into bookings (
      provider_id, client_id, service_id, service_ids,
      starts_at, ends_at, effective_end_at,
      status, cancellation_window_hours, source, manage_token
    ) values (
      p_provider_id, p_client_id, p_service_ids[1], p_service_ids,
      p_starts_at, p_ends_at, p_effective_end_at,
      'confirmed', v_window, 'manual', p_manage_token
    )
    returning id into v_id;
  exception
    when exclusion_violation then
      return query select null::uuid, 'taken'::text;
      return;
  end;

  return query select v_id, null::text;
end;
$$;

revoke execute on function create_manual_booking from public, anon, authenticated;
