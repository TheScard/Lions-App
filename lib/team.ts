import "server-only";
import type { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SessionPayload } from "@/types/session";
import type { Team } from "@/types/database";

type Supabase = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/**
 * Admins verwalten im /admin-Bereich weiterhin beide Teams, sollen in den
 * normalen Mitglieder-Ansichten (Kalender, Trainings, "Als Naechstes") aber
 * -- wie normale Mitglieder -- nur ihr eigenes Team sehen. RLS filtert fuer
 * admin/vorstand bewusst nicht (is_admin_or_vorstand()-Bypass), daher wird
 * hier zusaetzlich clientseitig gefiltert. Hat der Admin selbst kein Team
 * zugewiesen, gibt es (bewusst, als Fallback) keine Einschraenkung.
 * Vorstand ist von dieser Einschraenkung explizit ausgenommen.
 */
export async function getAdminOwnTeam(
  session: SessionPayload,
  supabase: Supabase
): Promise<Team | null> {
  if (session.role !== "admin") return null;

  const { data } = await supabase
    .from("members")
    .select("team")
    .eq("id", session.memberId)
    .maybeSingle();

  return data?.team ?? null;
}
