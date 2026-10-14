-- Web Push: Subscriptions der Geraete + Idempotenz-Log fuer zeitgesteuerte
-- Erinnerungen (Vercel Cron). Beide Tabellen werden ausschliesslich ueber
-- den Service-Role-Client (lib/supabase/admin.ts) gelesen/geschrieben,
-- nachdem Session/Rolle serverseitig geprueft wurden -- RLS ist aktiviert,
-- bekommt aber bewusst KEINE Policies fuer anon/authenticated: ohne
-- passende Policy verweigert RLS per Default, service_role umgeht RLS
-- ohnehin vollstaendig. Darum auch das GRANT unten nur fuer service_role.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

comment on table push_subscriptions is
  'Web-Push-Subscriptions je Geraet. Ein Mitglied kann mehrere Geraete haben. Nur ueber Service-Role-Client zugaenglich.';

create index if not exists idx_push_subscriptions_member on push_subscriptions (member_id);

alter table push_subscriptions enable row level security;

grant select, insert, update, delete on push_subscriptions to service_role;

create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  ref_id uuid not null,
  sent_at timestamptz not null default now(),
  unique (kind, ref_id)
);

comment on table notification_log is
  'Idempotenz-Log fuer zeitgesteuerte Push-Erinnerungen (z.B. kind=training_24h). Nur ueber Service-Role-Client zugaenglich.';

alter table notification_log enable row level security;

grant select, insert, update, delete on notification_log to service_role;
