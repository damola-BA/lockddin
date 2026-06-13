-- Provider-side booking actions (F7) + client anonymisation (F10).
-- These run via the service role from server actions that have already
-- checked the signed-in provider; every function still scopes its writes
-- to the booking's/client's own provider as defence in depth.

-- Mark / unmark a past booking as no-show (AD08): atomic status flip plus
-- the client's no_show_count. Fully undoable.
create or replace function set_booking_no_show(
  p_booking_id uuid,
  p_provider_id uuid,
  p_is_no_show boolean
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid;
  v_status booking_status;
begin
  select client_id, status into v_client, v_status
    from bookings
   where id = p_booking_id and provider_id = p_provider_id
   for update;
  if not found then return false; end if;

  if p_is_no_show then
    if v_status = 'no_show' then return true; end if;
    update bookings set status = 'no_show' where id = p_booking_id;
    update clients set no_show_count = no_show_count + 1 where id = v_client;
  else
    if v_status <> 'no_show' then return true; end if;
    update bookings set status = 'confirmed' where id = p_booking_id;
    update clients
       set no_show_count = greatest(0, no_show_count - 1)
     where id = v_client;
  end if;
  return true;
end;
$$;

-- Provider reschedule: atomically cancel the old booking and create the new
-- one at the chosen slot. Unlike client reschedule there is no cancellation-
-- window restriction — the provider can always move a booking. The bookings
-- EXCLUDE constraint guards against overlapping another confirmed booking.
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
   where id = p_old_booking_id
     and provider_id = p_provider_id
     and status = 'confirmed'
   for update;
  if not found then return null; end if;

  update bookings set status = 'cancelled_by_provider' where id = p_old_booking_id;

  begin
    insert into bookings (
      provider_id, client_id, service_id, starts_at, ends_at,
      effective_end_at, status, cancellation_window_hours, source,
      manage_token, rescheduled_from
    ) values (
      v_old.provider_id, v_old.client_id, v_old.service_id, p_starts_at,
      p_ends_at, p_effective_end_at, 'confirmed', v_old.cancellation_window_hours,
      v_old.source, p_new_token, v_old.id
    )
    returning id into v_new;
  exception
    when exclusion_violation then
      raise exception 'slot_taken' using errcode = 'P0001';
  end;

  return v_new;
end;
$$;

-- Anonymise a client (F10 delete): wipe personal fields but keep the rows so
-- historical bookings and stats survive with a placeholder. The unique
-- (provider_id, phone) constraint is preserved by namespacing the phone.
create or replace function anonymize_client(
  p_client_id uuid,
  p_provider_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update clients
     set first_name = 'Deleted client',
         phone = 'deleted:' || id::text,
         email = null
   where id = p_client_id and provider_id = p_provider_id;
  if not found then return false; end if;
  update waitlist_entries set is_active = false where client_id = p_client_id;
  return true;
end;
$$;

revoke execute on function set_booking_no_show from public, anon, authenticated;
revoke execute on function provider_reschedule_booking from public, anon, authenticated;
revoke execute on function anonymize_client from public, anon, authenticated;
