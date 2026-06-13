-- Extend the atomic override apply to also store a per-day service limit.
-- Service limits never cancel existing bookings (they only shape future
-- availability), so the affected-bookings calc is unchanged.
drop function if exists apply_override_with_cancellations(
  uuid, date[], override_kind, time, time, jsonb, int, text, text
);

create or replace function apply_override_with_cancellations(
  p_provider_id uuid,
  p_dates date[],
  p_kind override_kind,
  p_start time,
  p_end time,
  p_extra_blocks jsonb,
  p_daily_cap int,
  p_location_text text,
  p_cancel_reason text,
  p_service_ids uuid[]
) returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
begin
  foreach v_date in array p_dates loop
    insert into day_overrides (
      provider_id, date, kind, start_time, end_time,
      extra_blocks, daily_cap, location_text, service_ids
    ) values (
      p_provider_id, v_date, p_kind, p_start, p_end,
      coalesce(p_extra_blocks, '[]'::jsonb), p_daily_cap, p_location_text,
      p_service_ids
    )
    on conflict (provider_id, date) do update
      set kind = excluded.kind,
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          extra_blocks = excluded.extra_blocks,
          daily_cap = excluded.daily_cap,
          location_text = excluded.location_text,
          service_ids = excluded.service_ids;
  end loop;

  return query
  update bookings
     set status = 'cancelled_by_provider',
         cancel_reason = p_cancel_reason
   where id in (
     select booking_id
       from affected_bookings_for_override(
         p_provider_id, p_dates, p_kind, p_start, p_end, p_extra_blocks
       )
   )
  returning id;
end;
$$;

revoke execute on function apply_override_with_cancellations from public, anon, authenticated;
