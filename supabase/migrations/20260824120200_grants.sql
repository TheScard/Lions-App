-- Basis-Grants fuer anon/authenticated/service_role.
--
-- RLS-Policies (siehe 20260824120100_rls_policies.sql) schraenken den
-- Zugriff ein, ersetzen aber keine Tabellen-Grants: Ohne GRANT wird der
-- Zugriff von Postgres unabhaengig von RLS komplett verweigert. anon bleibt
-- trotz GRANT wirkungslos aussperrt, weil keine Policy fuer die Rolle
-- "anon" existiert (RLS verweigert ohne passende Policy per Default).

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on
  members,
  matches,
  trainings,
  training_rsvps,
  events,
  carpools,
  carpool_bookings,
  gallery_photos,
  board_members
to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
