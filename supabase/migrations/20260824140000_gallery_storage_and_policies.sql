-- Bildergalerie: Storage-Bucket + Policies (Storage + gallery_photos-Tabelle).
--
-- Zugriffsmodell:
--   - Lesen (Ansehen/Download): alle eingeloggten Mitglieder (authenticated).
--     Der Bucket ist NICHT public -- Zugriff laeuft ausschliesslich ueber
--     signierte URLs, die serverseitig mit dem Session-JWT des Mitglieds
--     erzeugt werden (siehe app/dashboard/gallery/page.tsx). Kein anonymer
--     Zugriff moeglich, da RLS ohne passende anon-Policy per Default
--     verweigert.
--   - Hochladen/Loeschen: ausschliesslich admin/vorstand, sowohl auf
--     Storage-Ebene (storage.objects) als auch auf der gallery_photos-
--     Tabelle. Beide Ebenen sind unabhaengig voneinander abgesichert
--     (defense in depth): selbst mit direktem Storage-API-Zugriff koennte
--     ein normales Mitglied weder eine Datei hochladen noch loeschen.

-- ---------------------------------------------------------------------------
-- Storage-Bucket "gallery" anlegen (idempotent).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Storage-Policies auf storage.objects, gefiltert auf bucket_id = 'gallery'.
-- RLS ist auf storage.objects in jedem Supabase-Projekt bereits aktiviert.
-- ---------------------------------------------------------------------------
create policy "gallery_storage_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'gallery');

create policy "gallery_storage_insert_admin_vorstand"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gallery' and public.is_admin_or_vorstand());

create policy "gallery_storage_delete_admin_vorstand"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'gallery' and public.is_admin_or_vorstand());

-- ---------------------------------------------------------------------------
-- gallery_photos: bisherige Policies ("jeder darf eigene Fotos hochladen")
-- durch admin/vorstand-only ersetzen (Anforderung hat sich geaendert,
-- siehe urspruengliche RLS-Migration 20260824120100 fuer den Vorzustand).
-- ---------------------------------------------------------------------------
drop policy if exists "gallery_photos_insert_own" on gallery_photos;
drop policy if exists "gallery_photos_delete_own_or_admin" on gallery_photos;

-- Hochladen nur admin/vorstand; uploaded_by muss trotzdem die eigene id
-- sein (kein Vortaeuschen eines anderen Uploaders).
create policy "gallery_photos_insert_admin_vorstand"
  on gallery_photos for insert
  to authenticated
  with check (is_admin_or_vorstand() and uploaded_by = auth.uid());

-- Loeschen nur admin/vorstand (keine "eigene Uploads"-Sonderregel mehr,
-- da normale Mitglieder ohnehin nicht mehr hochladen duerfen).
create policy "gallery_photos_delete_admin_vorstand"
  on gallery_photos for delete
  to authenticated
  using (is_admin_or_vorstand());
