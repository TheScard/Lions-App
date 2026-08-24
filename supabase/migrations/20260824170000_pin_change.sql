-- Selbstständige PIN-Änderung: Mitglieder koennen nach dem ersten Login mit
-- einer vom Admin generierten/zurueckgesetzten PIN optional eine eigene PIN
-- waehlen. must_change_pin ist dabei rein ein Hinweis-Flag (kein Zugriffs-
-- schutz) -- die eigentliche Aenderung laeuft ueber den Service-Role-Client
-- in einer Server Action, siehe app/dashboard/account/actions.ts.
alter table members add column if not exists must_change_pin boolean not null default false;

comment on column members.must_change_pin is
  'true = PIN wurde vom Admin generiert/zurueckgesetzt und noch nicht vom Mitglied selbst geaendert. Nur fuer einen optionalen Hinweis im Dashboard, keine Zugriffssperre.';
