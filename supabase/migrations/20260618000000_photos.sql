-- Service photos (up to 6 per service) are stored as an ordered path array
-- in services.work_photos (jsonb, already exists from initial schema).
-- We just need the banner_path on providers.

alter table providers
  add column if not exists banner_path text;
