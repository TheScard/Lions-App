-- Ermoeglicht das Loeschen einer kompletten woechentlichen Trainingsserie
-- (siehe "Wiederholen bis" beim Anlegen, app/admin/trainings/actions.ts).
-- series_id ist NULL fuer Einzeltrainings sowie fuer bereits vor dieser
-- Migration angelegte Trainings -- fuer die gibt es weiterhin nur die
-- Einzel-Loeschfunktion.
alter table trainings add column if not exists series_id uuid;

comment on column trainings.series_id is
  'Gruppiert automatisch generierte woechentliche Serien-Trainings (gleiche series_id = gleicher Anlegevorgang). NULL = Einzeltraining oder Alt-Eintrag ohne Serie.';

create index if not exists trainings_series_id_idx on trainings (series_id) where series_id is not null;
