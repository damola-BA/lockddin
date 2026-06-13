-- Per-day service restriction (F7 manage-day redesign): a one-off date can
-- limit which services are bookable, mirroring the weekly template's
-- service_ids. null = all services allowed that date.
alter table day_overrides add column service_ids uuid[];
