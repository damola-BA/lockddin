-- Consequence preview & cancellation cascade (F4). Preview and apply share
-- one affected-bookings query; apply is a single transaction — overrides
-- written and bookings cancelled together, all or nothing.
-- "Affected" uses effective_end_at, consistent with the slot engine (DD14).

create or replace function affected_bookings_for_override(
  p_provider_id uuid,
  p_dates date[],
  p_kind override_kind,
  p_start time,
  p_end time,
  p_extra_blocks jsonb
) returns table (
  booking_id uuid,
  client_first_name text,
  client_email text,
  service_name text,
  starts_at timestamptz,
  ends_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select b.id, c.first_name, c.email, s.name, b.starts_at, b.ends_at
    from bookings b
    join clients c on c.id = b.client_id
    join services s on s.id = b.service_id
    join providers p on p.id = b.provider_id
   where b.provider_id = p_provider_id
     and b.status = 'confirmed'
     and (b.starts_at at time zone p.timezone)::date = any (p_dates)
     and (
       p_kind = 'closed'
       or (b.starts_at at time zone p.timezone)::time < p_start
       or (b.effective_end_at at time zone p.timezone)::time > p_end
       or exists (
         select 1
           from jsonb_array_elements(coalesce(p_extra_blocks, '[]'::jsonb)) blk
          where (b.starts_at at time zone p.timezone)::time < (blk->>'end')::time
            and (b.effective_end_at at time zone p.timezone)::time > (blk->>'start')::time
       )
     )
   order by b.starts_at;
$$;

create or replace function apply_override_with_cancellations(
  p_provider_id uuid,
  p_dates date[],
  p_kind override_kind,
  p_start time,
  p_end time,
  p_extra_blocks jsonb,
  p_daily_cap int,
  p_location_text text,
  p_cancel_reason text
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
      extra_blocks, daily_cap, location_text
    ) values (
      p_provider_id, v_date, p_kind, p_start, p_end,
      coalesce(p_extra_blocks, '[]'::jsonb), p_daily_cap, p_location_text
    )
    on conflict (provider_id, date) do update
      set kind = excluded.kind,
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          extra_blocks = excluded.extra_blocks,
          daily_cap = excluded.daily_cap,
          location_text = excluded.location_text;
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

revoke execute on function affected_bookings_for_override from public, anon, authenticated;
revoke execute on function apply_override_with_cancellations from public, anon, authenticated;
