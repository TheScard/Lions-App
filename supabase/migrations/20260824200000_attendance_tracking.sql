-- Teilnahme-Tracking: tatsaechliche Anwesenheit bei Trainings und Spielen,
-- unabhaengig vom (bei Trainings vorhandenen, bei Matches nicht existenten)
-- Zusage-Status. Eintragbar durch admin/vorstand/coach.

-- ---------------------------------------------------------------------------
-- training_rsvps.attended: NULL = noch nicht erfasst, true/false = tatsaechliche
-- Anwesenheit. Unabhaengig vom urspruenglichen status ('yes'/'no').
-- ---------------------------------------------------------------------------
alter table training_rsvps add column if not exists attended boolean;

comment on column training_rsvps.attended is
  'Tatsaechliche Anwesenheit beim Training. NULL = noch nicht erfasst, unabhaengig vom Zu-/Absage-status.';

-- admin/vorstand/coach muessen attended auch fuer FREMDE Zusagen setzen
-- koennen (nicht nur die eigene) -- die bestehenden *_own-Policies werden
-- dafuer um is_admin_or_vorstand() erweitert. Das deckt gleichzeitig den
-- Fall "Mitglied ohne vorherige Zusage nachtraeglich als anwesend markieren"
-- ab (INSERT mit fremder member_id).
drop policy if exists "training_rsvps_insert_own" on training_rsvps;
create policy "training_rsvps_insert_own_or_privileged"
  on training_rsvps for insert
  to authenticated
  with check (member_id = auth.uid() or is_admin_or_vorstand());

drop policy if exists "training_rsvps_update_own" on training_rsvps;
create policy "training_rsvps_update_own_or_privileged"
  on training_rsvps for update
  to authenticated
  using (member_id = auth.uid() or is_admin_or_vorstand());

-- ---------------------------------------------------------------------------
-- match_attendance: Matches haben (anders als Trainings) kein RSVP-System,
-- daher eine eigene Tabelle nur fuer die tatsaechliche Teilnahme.
-- ---------------------------------------------------------------------------
create table if not exists match_attendance (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  attended boolean not null default true,
  created_at timestamptz not null default now(),
  unique (match_id, member_id)
);

comment on table match_attendance is 'Tatsaechliche Teilnahme an einem Match. Eintragbar durch admin/vorstand/coach.';

create index if not exists idx_match_attendance_match on match_attendance (match_id);

alter table match_attendance enable row level security;

-- Transparenz: alle eingeloggten Mitglieder duerfen sehen, wer teilgenommen hat.
create policy "match_attendance_select_authenticated"
  on match_attendance for select
  to authenticated
  using (true);

create policy "match_attendance_insert_admin_vorstand"
  on match_attendance for insert
  to authenticated
  with check (is_admin_or_vorstand());

create policy "match_attendance_update_admin_vorstand"
  on match_attendance for update
  to authenticated
  using (is_admin_or_vorstand());

create policy "match_attendance_delete_admin_vorstand"
  on match_attendance for delete
  to authenticated
  using (is_admin_or_vorstand());

-- Explizite Grants (nicht nur RLS) -- siehe 20260824120200_grants.sql fuer
-- den Hintergrund, warum das fuer neue Tabellen nicht automatisch gilt.
grant select, insert, update, delete on match_attendance to anon, authenticated, service_role;
