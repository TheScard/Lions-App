-- Lions Adenau – initiales Datenbankschema
-- Legt alle Kern-Tabellen der Vereins-App an.
-- RLS-Policies folgen in einer separaten Migration (20260824120100_rls_policies.sql).

create extension if not exists "pgcrypto"; -- fuer gen_random_uuid()

-- ---------------------------------------------------------------------------
-- members: Vereinsmitglieder / App-Nutzer (eigene Auth, kein Supabase Auth)
-- ---------------------------------------------------------------------------
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  pin_hash text not null,
  role text not null default 'member' check (role in ('member', 'admin', 'vorstand')),
  avatar_url text,
  created_at timestamptz not null default now()
);

comment on table members is 'Vereinsmitglieder. Login erfolgt ueber Name + PIN (pin_hash), nicht ueber Supabase Auth.';
comment on column members.pin_hash is 'bcrypt-Hash des PIN. Niemals den Klartext-PIN speichern.';

-- ---------------------------------------------------------------------------
-- matches: Spiele / Kalender
-- ---------------------------------------------------------------------------
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location_name text not null,
  location_address text not null,
  starts_at timestamptz not null,
  result text,
  created_by uuid references members(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- trainings
-- ---------------------------------------------------------------------------
create table if not exists trainings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  location text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- training_rsvps: Zu-/Absagen fuer Trainings
-- ---------------------------------------------------------------------------
create table if not exists training_rsvps (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references trainings(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  status text not null check (status in ('yes', 'no')),
  unique (training_id, member_id)
);

-- ---------------------------------------------------------------------------
-- events: allgemeine Vereins-Events
-- ---------------------------------------------------------------------------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  location text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- carpools: Fahrgemeinschaften
-- ---------------------------------------------------------------------------
create table if not exists carpools (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  driver_id uuid not null references members(id) on delete cascade,
  total_seats int not null check (total_seats > 0),
  departure_point text not null,
  departure_time timestamptz not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- carpool_bookings: Mitfahr-Buchungen
-- ---------------------------------------------------------------------------
create table if not exists carpool_bookings (
  id uuid primary key default gen_random_uuid(),
  carpool_id uuid not null references carpools(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (carpool_id, member_id)
);

-- ---------------------------------------------------------------------------
-- gallery_photos
-- ---------------------------------------------------------------------------
create table if not exists gallery_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  caption text,
  uploaded_by uuid references members(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- board_members: Vorstand
-- ---------------------------------------------------------------------------
create table if not exists board_members (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete set null,
  position text not null,
  responsibilities text,
  photo_url text,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- Indizes fuer haeufige Abfragen
-- ---------------------------------------------------------------------------
create index if not exists idx_matches_starts_at on matches (starts_at);
create index if not exists idx_trainings_starts_at on trainings (starts_at);
create index if not exists idx_events_starts_at on events (starts_at);
create index if not exists idx_training_rsvps_member on training_rsvps (member_id);
create index if not exists idx_carpool_bookings_member on carpool_bookings (member_id);
create index if not exists idx_carpools_match on carpools (match_id);
create index if not exists idx_board_members_sort on board_members (sort_order);
