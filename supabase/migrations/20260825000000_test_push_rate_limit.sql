-- Rate-Limit fuer den "Test-Benachrichtigung senden"-Button: hoechstens
-- einmal pro Mitglied alle 30 Sekunden. Als Spalte statt In-Memory-Zaehler,
-- da Vercel-Funktionen keinen gemeinsamen Speicher zwischen Aufrufen haben.

alter table members add column if not exists last_test_push_at timestamptz;

comment on column members.last_test_push_at is
  'Zeitpunkt der letzten Test-Push-Anfrage dieses Mitglieds. Dient als Rate-Limit (siehe sendTestPush()), nicht als Nutzungsstatistik.';
