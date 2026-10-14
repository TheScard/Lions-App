// Schmaler Fortschrittsbalken fuer die Anwesenheits-Statistik
// (/admin/statistik) -- reine Anzeige, keine Interaktion.
export function StatBar({ percent }: { percent: number }) {
  return (
    <div className="mt-1 h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}
