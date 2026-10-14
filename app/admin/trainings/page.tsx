import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { deleteTraining, deleteTrainingSeries } from "@/app/admin/trainings/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TeamBadge } from "@/components/TeamBadge";

export default async function AdminTrainingsPage() {
  const supabase = await createServerSupabaseClient();
  // Bereits stattgefundene Trainings werden hier nicht mehr angezeigt --
  // Bearbeiten/Loeschen gilt nur fuer anstehende Trainings. Die
  // nachtraegliche Teilnahme-Erfassung vergangener Trainings laeuft
  // ausschliesslich ueber den Bereich "Vergangen -- Teilnahme erfassen" in
  // /dashboard/trainings.
  const { data: trainings } = await supabase
    .from("trainings")
    .select("*")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  const rows = trainings ?? [];

  const seriesCounts = new Map<string, number>();
  for (const training of rows) {
    if (training.series_id) {
      seriesCounts.set(training.series_id, (seriesCounts.get(training.series_id) ?? 0) + 1);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl text-text">Trainings verwalten</h1>
        <Link
          href="/admin/trainings/new"
          className="rounded-md bg-gradient-to-r from-primary-hover to-primary font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)] px-3 py-1.5 text-sm"
        >
          + Neu
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {rows.length === 0 && (
          <p className="text-sm text-text-muted">Noch keine Trainings angelegt.</p>
        )}
        {rows.map((training) => (
          <div key={training.id} className="rounded-lg border border-border border-l-4 border-l-primary bg-surface p-4 shadow-lg shadow-black/30">
            <div className="flex items-start justify-between gap-2">
              <p className="font-heading text-base italic font-bold uppercase tracking-wide text-text">
                {training.title}
              </p>
              <TeamBadge team={training.team} />
            </div>
            <p className="mt-1 text-sm text-text-muted">{formatDateTime(training.starts_at)}</p>
            {training.location && (
              <p className="mt-1 text-sm text-text-muted">{training.location}</p>
            )}
            <div className="mt-3 flex items-center gap-4">
              <Link
                href={`/admin/trainings/${training.id}/edit`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Bearbeiten
              </Link>
              <ConfirmSubmitButton
                action={deleteTraining.bind(null, training.id)}
                label="Löschen"
                confirmMessage="Training wirklich löschen?"
              />
              {training.series_id && (
                <ConfirmSubmitButton
                  action={deleteTrainingSeries.bind(null, training.series_id)}
                  label="Serie löschen"
                  confirmMessage={`Alle ${seriesCounts.get(training.series_id)} Trainings dieser Serie wirklich löschen?`}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
