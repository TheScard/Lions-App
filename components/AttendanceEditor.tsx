"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { AttendanceRow } from "@/lib/attendance";
import type { RsvpStatus } from "@/types/database";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  yes: {
    label: "Zusage",
    className: "border-primary/40 bg-gradient-to-r from-primary/25 to-primary/5 text-primary",
  },
  no: {
    label: "Absage",
    className: "border-danger/40 bg-danger-bg text-danger",
  },
  none: {
    label: "Keine Antwort",
    className: "border-border text-text-muted",
  },
};

function StatusBadge({ status }: { status: RsvpStatus | null }) {
  const info = STATUS_BADGE[status ?? "none"];
  return (
    <span
      className={`inline-block shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${info.className}`}
    >
      {info.label}
    </span>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-md bg-gradient-to-r from-primary-hover to-primary px-4 py-2 text-sm font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)] disabled:opacity-60 disabled:shadow-none"
    >
      {pending ? "Speichern..." : "Teilnahme speichern"}
    </button>
  );
}

/**
 * Teilnahme-Erfassung fuer Trainings UND Spiele (gleiche Komponente, damit
 * sich das Verhalten identisch anfuehlt). Zeigt ALLE Mitglieder des Teams
 * (rows), optional zusaetzlich Mitglieder anderer Teams (extraRows) ueber
 * den Schalter "Alle Mitglieder anzeigen". Gespeichert wird erst per Klick
 * auf "Teilnahme speichern" -- ein Request fuer die ganze Liste.
 */
export function AttendanceEditor({
  rows,
  extraRows,
  saveAction,
}: {
  rows: AttendanceRow[];
  extraRows: AttendanceRow[];
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleRows = showAll ? [...rows, ...extraRows] : rows;

  return (
    <form action={saveAction} className="flex flex-col gap-3">
      {visibleRows.length === 0 ? (
        <p className="text-sm text-text-muted">Diesem Team sind noch keine Mitglieder zugewiesen.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleRows.map((row) => (
            <div key={row.memberId} className="flex items-center justify-between gap-2">
              <input type="hidden" name="member_ids" value={row.memberId} />
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm text-text">{row.name}</p>
                <StatusBadge status={row.rsvpStatus} />
              </div>
              <label className="flex shrink-0 items-center gap-2 text-sm text-text-muted">
                <input
                  type="checkbox"
                  name={`attended_${row.memberId}`}
                  defaultChecked={row.attended}
                  className="h-4 w-4 accent-primary"
                />
                war anwesend
              </label>
            </div>
          ))}
        </div>
      )}

      {extraRows.length > 0 && (
        <label className="flex items-center gap-2 text-xs text-text-muted">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(event) => setShowAll(event.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          Alle Mitglieder anzeigen
        </label>
      )}

      <SaveButton />
    </form>
  );
}
