-- Wird von `supabase db reset` / `supabase start` (lokale Entwicklung)
-- automatisch ausgefuehrt. Läuft NICHT gegen die Cloud (supabase db push
-- fuehrt seed.sql nicht aus) – dort per SQL-Editor manuell ausfuehren.
--
-- Legt ein erstes Admin-Mitglied an, damit ueberhaupt ein Login moeglich
-- ist (das Admin-Panel zum Anlegen weiterer Mitglieder kommt in einem
-- spaeteren Schritt). PIN im Beispiel: 1234 – bitte nach dem ersten Login
-- bzw. vor Produktivbetrieb aendern/entfernen.
--
-- pgcrypto's crypt(..., gen_salt('bf')) erzeugt einen bcrypt-Hash
-- ($2a$-Format), der von bcryptjs (siehe lib/auth/pin.ts) problemlos
-- verifiziert werden kann.

insert into members (name, pin_hash, role)
values ('Admin', crypt('1234', gen_salt('bf')), 'admin')
on conflict (name) do nothing;
