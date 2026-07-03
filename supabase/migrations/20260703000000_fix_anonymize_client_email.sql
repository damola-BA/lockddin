-- Fix client deletion. The phone→email re-key (20260620_email_identity) made
-- clients.email NOT NULL and unique (provider_id, email), but anonymize_client
-- still set email = null on delete, so the UPDATE violated the constraint and
-- every "remove client" silently failed. Anonymize to a unique, non-deliverable
-- placeholder email instead, and null the now-optional phone.

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
         email = 'deleted+' || id::text || '@lockddin.invalid',
         phone = null
   where id = p_client_id and provider_id = p_provider_id;
  if not found then return false; end if;
  update waitlist_entries set is_active = false where client_id = p_client_id;
  return true;
end;
$$;

revoke execute on function anonymize_client from public, anon, authenticated;
