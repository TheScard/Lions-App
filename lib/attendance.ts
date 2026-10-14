import type { RsvpStatus } from "@/types/database";

export interface AttendanceRow {
  memberId: string;
  name: string;
  rsvpStatus: RsvpStatus | null;
  attended: boolean;
}

// Sortierung: Zusagen, dann keine Antwort, dann Absagen -- jeweils
// alphabetisch nach Namen.
const STATUS_RANK: Record<string, number> = { yes: 0, none: 1, no: 2 };

export function sortAttendanceRows(rows: AttendanceRow[]): AttendanceRow[] {
  return [...rows].sort((a, b) => {
    const rankA = STATUS_RANK[a.rsvpStatus ?? "none"];
    const rankB = STATUS_RANK[b.rsvpStatus ?? "none"];
    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name, "de");
  });
}
