-- Team-Zuweisung: Mitglieder, Matches und Trainings gehoeren jeweils zu
-- einem Team ('herren' oder 'u16'). Normale Mitglieder sehen nur Inhalte
-- ihres eigenen Teams, admin/vorstand sehen weiterhin beide Teams.
--
-- Events, gallery_photos und board_members bleiben bewusst UNVERAENDERT
-- (weiterhin fuer alle sichtbar, kein Team-Bezug).

-- ---------------------------------------------------------------------------
-- members.team: NULLABLE. NULL = kein zugewiesenes Team (z.B. reine
-- Vorstands-/Admin-Accounts ohne aktiven Spielbetrieb) -- diese sehen
-- ueber die admin/vorstand-Sonderregel in den Policies unten ohnehin
-- weiterhin alles, unabhaengig vom eigenen team-Wert.
-- ---------------------------------------------------------------------------
alter table members add column if not exists team text;
alter table members drop constraint if exists members_team_check;
alter table members add constraint members_team_check
  check (team in ('herren', 'u16') or team is null);

comment on column members.team is
  'Team-Zuordnung des Mitglieds (herren/u16). NULL = kein Team zugewiesen (z.B. reine Vorstands-/Admin-Accounts).';

-- ---------------------------------------------------------------------------
-- matches.team / trainings.team: NOT NULL, mit Default 'herren'.
--
-- WICHTIG: Der Default 'herren' ist nur eine technische Notloesung, damit
-- bestehende Zeilen beim Hinzufuegen der NOT-NULL-Spalte nicht brechen.
-- Bitte nach dieser Migration bestehende matches/trainings-Eintraege
-- manuell im Admin-Bereich (/admin/matches, /admin/trainings) pruefen und
-- das korrekte Team (herren/u16) nachtragen, falls 'herren' nicht stimmt.
-- ---------------------------------------------------------------------------
alter table matches add column if not exists team text not null default 'herren';
alter table matches drop constraint if exists matches_team_check;
alter table matches add constraint matches_team_check check (team in ('herren', 'u16'));

alter table trainings add column if not exists team text not null default 'herren';
alter table trainings drop constraint if exists trainings_team_check;
alter table trainings add constraint trainings_team_check check (team in ('herren', 'u16'));

-- ---------------------------------------------------------------------------
-- RLS: SELECT auf matches/trainings nur fuer das eigene Team, admin/
-- vorstand sehen weiterhin beide Teams. INSERT/UPDATE/DELETE bleibt
-- unveraendert admin/vorstand-only (siehe 20260824120100_rls_policies.sql),
-- unabhaengig vom Team.
-- ---------------------------------------------------------------------------
drop policy if exists "matches_select_authenticated" on matches;
create policy "matches_select_own_team_or_admin_vorstand"
  on matches for select
  to authenticated
  using (
    is_admin_or_vorstand()
    or team = (select m.team from members m where m.id = auth.uid())
  );

drop policy if exists "trainings_select_authenticated" on trainings;
create policy "trainings_select_own_team_or_admin_vorstand"
  on trainings for select
  to authenticated
  using (
    is_admin_or_vorstand()
    or team = (select m.team from members m where m.id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- carpools: an ein Match gekoppelte Fahrten (match_id gesetzt) sind nur
-- fuer Mitglieder des jeweiligen Match-Teams sichtbar. Fahrten ohne
-- match_id (match_id is null) bleiben wie bisher fuer alle sichtbar.
-- ---------------------------------------------------------------------------
drop policy if exists "carpools_select_authenticated" on carpools;
create policy "carpools_select_team_or_unassigned_or_admin_vorstand"
  on carpools for select
  to authenticated
  using (
    is_admin_or_vorstand()
    or match_id is null
    or exists (
      select 1 from matches m
      where m.id = carpools.match_id
        and m.team = (select mem.team from members mem where mem.id = auth.uid())
    )
  );
