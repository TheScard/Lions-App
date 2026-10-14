-- Abstimmung "Nehme teil" auch bei Spielen (analog zu training_rsvps).

create table if not exists match_rsvps (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  status text not null check (status in ('yes', 'no')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, member_id)
);

comment on table match_rsvps is 'Zu-/Absagen fuer Spiele, analog zu training_rsvps.';

create index if not exists idx_match_rsvps_member on match_rsvps (member_id);

alter table match_rsvps enable row level security;

create policy "match_rsvps_select_authenticated"
  on match_rsvps for select
  to authenticated
  using (true);

-- Ein Mitglied darf nur seine eigene Zu-/Absage anlegen/aendern/loeschen,
-- analog zu training_rsvps_insert_own/update_own/delete_own.
create policy "match_rsvps_insert_own"
  on match_rsvps for insert
  to authenticated
  with check (member_id = auth.uid());

create policy "match_rsvps_update_own"
  on match_rsvps for update
  to authenticated
  using (member_id = auth.uid());

create policy "match_rsvps_delete_own"
  on match_rsvps for delete
  to authenticated
  using (member_id = auth.uid());

-- Explizite Grants (nicht nur RLS) -- siehe 20260824120200_grants.sql fuer
-- den Hintergrund, warum das fuer neue Tabellen nicht automatisch gilt.
grant select, insert, update, delete on match_rsvps to anon, authenticated, service_role;
