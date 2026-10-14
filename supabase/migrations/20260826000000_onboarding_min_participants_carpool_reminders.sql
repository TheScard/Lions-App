-- Vier neue Spalten fuer: Erste-Schritte-Seite (onboarding_completed_at),
-- Mindestbeteiligung + Nachhaken (min_participants, last_nudge_at auf
-- trainings/matches). Fahrt-Erinnerungen (Teil 3) brauchen keine neue
-- Spalte, nur einen weiteren notification_log.kind-Wert ('carpool_2h'),
-- der bereits durch das generische (kind, ref_id)-Schema gedeckt ist.

-- ---------------------------------------------------------------------------
-- Erste-Schritte-Seite: NULL = noch nicht abgeschlossen, zeigt die Seite
-- einmalig. Bestehende Mitglieder bekommen bewusst KEINEN Wert gesetzt.
-- ---------------------------------------------------------------------------
alter table members add column if not exists onboarding_completed_at timestamptz;

comment on column members.onboarding_completed_at is
  'Zeitpunkt, zu dem das Mitglied die Erste-Schritte-Seite (/dashboard/start) abgeschlossen oder uebersprungen hat. NULL = noch nicht gesehen.';

-- ---------------------------------------------------------------------------
-- Mindestbeteiligung: optionales Minimum an Zusagen je Termin, plus
-- Zeitpunkt des letzten "Nachhaken"-Pushs (Rate-Limit, siehe nudgeTraining/
-- nudgeMatch Server Actions).
-- ---------------------------------------------------------------------------
alter table trainings add column if not exists min_participants integer check (min_participants > 0);
alter table trainings add column if not exists last_nudge_at timestamptz;

alter table matches add column if not exists min_participants integer check (min_participants > 0);
alter table matches add column if not exists last_nudge_at timestamptz;

comment on column trainings.min_participants is
  'Optionale Mindestanzahl an Zusagen. NULL = kein Minimum gesetzt.';
comment on column matches.min_participants is
  'Optionale Mindestanzahl an Zusagen. NULL = kein Minimum gesetzt.';
