-- Erlaubt training_rsvps-Zeilen ohne Zu-/Absage (status = NULL), damit
-- admin/vorstand/coach ein Mitglied als anwesend markieren koennen, das nie
-- abgestimmt hat, ohne ihm dabei faelschlich eine Zusage unterzuschieben.
-- Der CHECK-Constraint bleibt unveraendert: CHECK (status in ('yes','no'))
-- erlaubt NULL bereits (ein CHECK wird fuer NULL-Werte als erfuellt
-- gewertet), nur die NOT-NULL-Bedingung stand dem bisher im Weg.

alter table training_rsvps alter column status drop not null;

comment on column training_rsvps.status is
  'Zu-/Absage des Mitglieds. NULL = keine Abstimmung, aber ggf. trotzdem erfasste Anwesenheit (siehe attended).';
