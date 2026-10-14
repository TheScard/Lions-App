import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Team } from "@/types/database";

/**
 * Liefert eine Map memberId -> team fuer die angegebenen Mitglieder. Dient
 * dazu, Zusagen/Absagen auf Mitglieder zu filtern, deren Team zum Termin
 * passt (siehe checkRsvpEligibility() in lib/rsvp.ts fuer die Schreibseite
 * derselben Regel) -- Abstimmungen von Mitgliedern, deren Team sich
 * nachtraeglich geaendert hat, sollen in Zaehlung/Liste ignoriert, aber
 * nicht geloescht werden.
 */
export async function getMemberTeamMap(
  supabase: SupabaseClient<Database>,
  memberIds: string[]
): Promise<Map<string, Team | null>> {
  if (memberIds.length === 0) return new Map();
  const { data } = await supabase.from("members").select("id, team").in("id", memberIds);
  return new Map((data ?? []).map((m) => [m.id, m.team]));
}
