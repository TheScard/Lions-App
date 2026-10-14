import type { createAdminClient } from "@/lib/supabase/admin";
import type { Team } from "@/types/database";

export interface RsvpResult {
  error?: string;
}

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Serverseitige Abstimmungsregeln, die fuer Trainings und Spiele identisch
 * gelten (siehe setRsvp()/setMatchRsvp()):
 * - Termin muss existieren und in der Zukunft liegen.
 * - Das Mitglied muss einem Team zugewiesen sein -- Mitglieder ohne Team
 *   (members.team = NULL, z.B. reine Admin-Accounts) duerfen nie
 *   abstimmen, unabhaengig von ihrer Rolle.
 * - Abgestimmt wird nur fuer Termine des EIGENEN Teams. Das gilt
 *   bewusst auch fuer admin/vorstand/coach -- die Rolle spielt fuer die
 *   Abstimmung selbst keine Rolle, nur members.team.
 *
 * Gibt bei Verstoss einen fuer die UI geeigneten Fehlertext zurueck, sonst
 * null.
 */
export async function checkRsvpEligibility(
  admin: AdminClient,
  memberId: string,
  event: { starts_at: string; team: Team } | null
): Promise<string | null> {
  if (!event) {
    return "Termin nicht gefunden.";
  }
  if (new Date(event.starts_at).getTime() < Date.now()) {
    return "Abstimmung ist für vergangene Termine nicht mehr möglich.";
  }

  const { data: member } = await admin.from("members").select("team").eq("id", memberId).maybeSingle();
  if (!member?.team) {
    return "Du bist keinem Team zugewiesen und kannst daher nicht abstimmen.";
  }
  if (member.team !== event.team) {
    return "Abstimmung ist nur für Termine des eigenen Teams möglich.";
  }

  return null;
}
