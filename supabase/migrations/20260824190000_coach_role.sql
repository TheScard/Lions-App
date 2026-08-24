-- Neue Rolle 'coach': dieselben Rechte wie 'vorstand' (siehe
-- is_admin_or_vorstand() unten -- wird von praktisch allen bestehenden
-- RLS-Policies fuer Matches/Trainings/Events/Carpools/Gallery/Board/Storage
-- verwendet, daher propagiert die Erweiterung dieser einen Funktion
-- automatisch ueberall), PLUS Zugriff auf die Mitgliederverwaltung
-- (members INSERT/UPDATE/DELETE, bisher admin-only).
--
-- Die "mindestens 1 admin muss bestehen bleiben"-Regel (Trigger
-- prevent_last_admin_removal, siehe 20260824150100) ist davon NICHT
-- betroffen -- sie prueft ausschliesslich role = 'admin', nie 'coach'.
-- Ein coach kann also z.B. einen anderen coach oder sich selbst
-- degradieren/loeschen, ohne dass diese Sperre greift.

alter table members drop constraint if exists members_role_check;
alter table members add constraint members_role_check
  check (role in ('member', 'admin', 'vorstand', 'coach'));

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
      and role in ('admin', 'vorstand', 'coach')
  );
$$;

comment on function is_admin_or_vorstand is 'True, wenn der eingeloggte member (auth.uid()) die Rolle admin, vorstand oder coach hat.';

-- members-Schreibrechte: bisher admin-only, jetzt zusaetzlich coach.
drop policy if exists "members_insert_admin" on members;
create policy "members_insert_admin_coach"
  on members for insert
  to authenticated
  with check (
    exists (select 1 from members m where m.id = auth.uid() and m.role in ('admin', 'coach'))
  );

drop policy if exists "members_update_admin" on members;
create policy "members_update_admin_coach"
  on members for update
  to authenticated
  using (
    exists (select 1 from members m where m.id = auth.uid() and m.role in ('admin', 'coach'))
  );

drop policy if exists "members_delete_admin" on members;
create policy "members_delete_admin_coach"
  on members for delete
  to authenticated
  using (
    exists (select 1 from members m where m.id = auth.uid() and m.role in ('admin', 'coach'))
  );
