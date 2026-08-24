-- Vorstand: display_name fuer Personen ohne eigenes Mitglieder-Konto +
-- eigener Storage-Bucket fuer Vorstandsfotos.
--
-- board_members.member_id war bisher die einzige Quelle fuer den Namen
-- (ueber einen Join auf members.name). Vorstandsmitglieder ohne eigenen
-- Login (member_id = NULL) brauchten aber trotzdem einen Namen -> neues
-- Feld display_name als Fallback.

alter table board_members add column if not exists display_name text;

comment on column board_members.display_name is
  'Anzeigename fuer Vorstandsmitglieder ohne eigenes Mitglieder-Konto (member_id ist dann NULL). Bei gesetztem member_id wird stattdessen members.name verwendet.';

-- Es muss immer mindestens eine Namensquelle existieren.
alter table board_members drop constraint if exists board_members_name_source_check;
alter table board_members add constraint board_members_name_source_check
  check (member_id is not null or display_name is not null);

-- ---------------------------------------------------------------------------
-- Storage-Bucket "board-photos" (analog zu "gallery": nicht public, Zugriff
-- nur ueber signierte URLs fuer eingeloggte Mitglieder).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('board-photos', 'board-photos', false)
on conflict (id) do nothing;

create policy "board_photos_storage_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'board-photos');

create policy "board_photos_storage_insert_admin_vorstand"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'board-photos' and public.is_admin_or_vorstand());

create policy "board_photos_storage_delete_admin_vorstand"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'board-photos' and public.is_admin_or_vorstand());
