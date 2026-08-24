-- Lions Adenau – Row Level Security Policies
--
-- WICHTIG zum Auth-Modell dieser App:
-- Es wird KEIN Supabase Auth (E-Mail/Passwort) verwendet, sondern ein eigenes
-- Login (Name + PIN, siehe lib/auth). Nach erfolgreichem Login signiert der
-- Server ein JWT mit denselben Claims, die Supabase/PostgREST erwartet:
--   { sub: <members.id>, role: "authenticated", ... }
-- Dieses JWT wird als httpOnly-Cookie gespeichert und vom Server-seitigen
-- Supabase-Client als Authorization-Bearer-Token mitgeschickt. Dadurch
-- funktionieren auth.uid() und auth.role() in den Policies unten exakt wie
-- bei regulaerem Supabase Auth, obwohl kein Supabase-Auth-User existiert.
--
-- Anonyme (nicht eingeloggte) Requests laufen unter der Rolle "anon" und
-- werden von den Policies unten ueberall ausgeschlossen.

-- ---------------------------------------------------------------------------
-- Helper: prueft, ob der aktuell eingeloggte member Admin oder Vorstand ist.
-- SECURITY DEFINER, damit die Funktion trotz RLS auf members lesen kann.
-- ---------------------------------------------------------------------------
create or replace function is_admin_or_vorstand()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from members
    where id = auth.uid()
      and role in ('admin', 'vorstand')
  );
$$;

comment on function is_admin_or_vorstand is 'True, wenn der eingeloggte member (auth.uid()) die Rolle admin oder vorstand hat.';

-- ---------------------------------------------------------------------------
-- RLS aktivieren
-- ---------------------------------------------------------------------------
alter table members enable row level security;
alter table matches enable row level security;
alter table trainings enable row level security;
alter table training_rsvps enable row level security;
alter table events enable row level security;
alter table carpools enable row level security;
alter table carpool_bookings enable row level security;
alter table gallery_photos enable row level security;
alter table board_members enable row level security;

-- ---------------------------------------------------------------------------
-- members
-- ---------------------------------------------------------------------------

-- Eingeloggte Mitglieder duerfen alle Mitgliederprofile lesen (fuer Namen,
-- Avatare, Vorstandszuordnung etc.). pin_hash liegt zwar in der gleichen
-- Zeile, sollte aber nie ueber den Client-Select-Pfad angefragt werden.
create policy "members_select_authenticated"
  on members for select
  to authenticated
  using (true);

-- Anlegen/Aendern/Loeschen von Mitgliedern ist ausschliesslich Admins
-- vorbehalten (Admin-Panel, spaeterer Schritt). Vorstand hat hier bewusst
-- KEIN Schreibrecht, da das Anlegen von Logins sicherheitskritisch ist.
create policy "members_insert_admin"
  on members for insert
  to authenticated
  with check (
    exists (select 1 from members m where m.id = auth.uid() and m.role = 'admin')
  );

create policy "members_update_admin"
  on members for update
  to authenticated
  using (
    exists (select 1 from members m where m.id = auth.uid() and m.role = 'admin')
  );

create policy "members_delete_admin"
  on members for delete
  to authenticated
  using (
    exists (select 1 from members m where m.id = auth.uid() and m.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- matches
-- ---------------------------------------------------------------------------
create policy "matches_select_authenticated"
  on matches for select
  to authenticated
  using (true);

-- Anlegen/Aendern/Loeschen (inkl. Ergebnis-Feld) nur Admin/Vorstand.
create policy "matches_insert_admin_vorstand"
  on matches for insert
  to authenticated
  with check (is_admin_or_vorstand());

create policy "matches_update_admin_vorstand"
  on matches for update
  to authenticated
  using (is_admin_or_vorstand());

create policy "matches_delete_admin_vorstand"
  on matches for delete
  to authenticated
  using (is_admin_or_vorstand());

-- ---------------------------------------------------------------------------
-- trainings
-- ---------------------------------------------------------------------------
create policy "trainings_select_authenticated"
  on trainings for select
  to authenticated
  using (true);

create policy "trainings_insert_admin_vorstand"
  on trainings for insert
  to authenticated
  with check (is_admin_or_vorstand());

create policy "trainings_update_admin_vorstand"
  on trainings for update
  to authenticated
  using (is_admin_or_vorstand());

create policy "trainings_delete_admin_vorstand"
  on trainings for delete
  to authenticated
  using (is_admin_or_vorstand());

-- ---------------------------------------------------------------------------
-- training_rsvps
-- ---------------------------------------------------------------------------
create policy "training_rsvps_select_authenticated"
  on training_rsvps for select
  to authenticated
  using (true);

-- Ein Mitglied darf nur seine eigene Zu-/Absage anlegen oder aendern.
create policy "training_rsvps_insert_own"
  on training_rsvps for insert
  to authenticated
  with check (member_id = auth.uid());

create policy "training_rsvps_update_own"
  on training_rsvps for update
  to authenticated
  using (member_id = auth.uid());

create policy "training_rsvps_delete_own"
  on training_rsvps for delete
  to authenticated
  using (member_id = auth.uid());

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create policy "events_select_authenticated"
  on events for select
  to authenticated
  using (true);

create policy "events_insert_admin_vorstand"
  on events for insert
  to authenticated
  with check (is_admin_or_vorstand());

create policy "events_update_admin_vorstand"
  on events for update
  to authenticated
  using (is_admin_or_vorstand());

create policy "events_delete_admin_vorstand"
  on events for delete
  to authenticated
  using (is_admin_or_vorstand());

-- ---------------------------------------------------------------------------
-- carpools (Fahrgemeinschaften)
-- ---------------------------------------------------------------------------
create policy "carpools_select_authenticated"
  on carpools for select
  to authenticated
  using (true);

-- Jedes Mitglied darf eine eigene Fahrt als Fahrer anbieten.
create policy "carpools_insert_own"
  on carpools for insert
  to authenticated
  with check (driver_id = auth.uid());

-- Nur der Fahrer selbst (oder Admin/Vorstand) darf seine Fahrt aendern/loeschen.
create policy "carpools_update_own_or_admin"
  on carpools for update
  to authenticated
  using (driver_id = auth.uid() or is_admin_or_vorstand());

create policy "carpools_delete_own_or_admin"
  on carpools for delete
  to authenticated
  using (driver_id = auth.uid() or is_admin_or_vorstand());

-- ---------------------------------------------------------------------------
-- carpool_bookings
-- ---------------------------------------------------------------------------
create policy "carpool_bookings_select_authenticated"
  on carpool_bookings for select
  to authenticated
  using (true);

-- Ein Mitglied darf sich nur selbst zu einer Fahrt buchen.
create policy "carpool_bookings_insert_own"
  on carpool_bookings for insert
  to authenticated
  with check (member_id = auth.uid());

-- Buchung stornieren: nur die eigene Buchung (oder der Fahrer bzw. Admin/Vorstand
-- raeumt seine Fahrt auf).
create policy "carpool_bookings_delete_own_or_driver_or_admin"
  on carpool_bookings for delete
  to authenticated
  using (
    member_id = auth.uid()
    or is_admin_or_vorstand()
    or exists (
      select 1 from carpools c
      where c.id = carpool_bookings.carpool_id
        and c.driver_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- gallery_photos
-- ---------------------------------------------------------------------------
create policy "gallery_photos_select_authenticated"
  on gallery_photos for select
  to authenticated
  using (true);

-- Jedes eingeloggte Mitglied darf Fotos hochladen (uploaded_by = eigene id).
create policy "gallery_photos_insert_own"
  on gallery_photos for insert
  to authenticated
  with check (uploaded_by = auth.uid());

-- Loeschen: eigener Upload oder Admin/Vorstand (Moderation).
create policy "gallery_photos_delete_own_or_admin"
  on gallery_photos for delete
  to authenticated
  using (uploaded_by = auth.uid() or is_admin_or_vorstand());

-- ---------------------------------------------------------------------------
-- board_members (Vorstand)
-- ---------------------------------------------------------------------------
create policy "board_members_select_authenticated"
  on board_members for select
  to authenticated
  using (true);

create policy "board_members_insert_admin_vorstand"
  on board_members for insert
  to authenticated
  with check (is_admin_or_vorstand());

create policy "board_members_update_admin_vorstand"
  on board_members for update
  to authenticated
  using (is_admin_or_vorstand());

create policy "board_members_delete_admin_vorstand"
  on board_members for delete
  to authenticated
  using (is_admin_or_vorstand());
