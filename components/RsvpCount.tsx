/**
 * Zeigt die Zusagen-Anzahl an -- fuer admin/vorstand/coach zusaetzlich mit
 * Mindestanzeige + schmalem Fortschrittsbalken, wenn ein Minimum gesetzt
 * ist und der Termin noch in der Zukunft liegt. Normale Mitglieder sehen
 * immer nur die reine Anzahl.
 */
export function RsvpCount({
  count,
  min,
  canSeeMin,
  isFuture,
}: {
  count: number;
  min: number | null;
  canSeeMin: boolean;
  isFuture: boolean;
}) {
  if (!canSeeMin || !isFuture || !min) {
    return <p className="text-sm text-text-muted">{count} Zusagen</p>;
  }

  const reached = count >= min;
  const percent = Math.min(100, Math.round((count / min) * 100));

  return (
    <div>
      <p className="text-sm text-text-muted">
        {count} von mindestens {min} Zusagen
      </p>
      <div className="mt-1 h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full ${reached ? "bg-emerald-500" : "bg-primary"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
