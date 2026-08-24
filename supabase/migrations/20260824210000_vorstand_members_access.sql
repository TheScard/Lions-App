-- Erweitert die Mitgliederverwaltung (members INSERT/UPDATE/DELETE) von
-- admin+coach (siehe 20260824190000_coach_role.sql) zusaetzlich auf
-- vorstand. Die "mindestens 1 admin"-Regel (Trigger
-- prevent_last_admin_removal, siehe 20260824150100) bleibt unveraendert
-- ausschliesslich auf role = 'admin' bezogen.

drop policy if exists "members_insert_admin_coach" on members;
create policy "members_insert_admin_coach_vorstand"
  on members for insert
  to authenticated
  with check (
    exists (select 1 from members m where m.id = auth.uid() and m.role in ('admin', 'coach', 'vorstand'))
  );

drop policy if exists "members_update_admin_coach" on members;
create policy "members_update_admin_coach_vorstand"
  on members for update
  to authenticated
  using (
    exists (select 1 from members m where m.id = auth.uid() and m.role in ('admin', 'coach', 'vorstand'))
  );

drop policy if exists "members_delete_admin_coach" on members;
create policy "members_delete_admin_coach_vorstand"
  on members for delete
  to authenticated
  using (
    exists (select 1 from members m where m.id = auth.uid() and m.role in ('admin', 'coach', 'vorstand'))
  );
