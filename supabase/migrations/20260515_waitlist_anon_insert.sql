-- Static landing: browser POST to PostgREST /rest/v1/waitlist with anon JWT.
--
-- "new row violates row-level security policy" = missing policy OR missing INSERT grant for anon.
-- Run this whole block in Supabase → SQL Editor.

grant usage on schema public to anon, authenticated;
grant insert on table waitlist to anon, authenticated;

drop policy if exists "waitlist_anon_insert_only" on waitlist;

-- Omit TO → applies to every role subject to RLS (anon + authenticated). service_role bypasses RLS.
create policy "waitlist_anon_insert_only"
  on waitlist
  for insert
  with check (true);
