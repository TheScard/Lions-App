"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Matches haben (anders als Trainings) kein RSVP-System -- attended wird
 * daher rein ueber Vorhandensein einer Zeile in match_attendance
 * ausgedrueckt: checked = Zeile anlegen, unchecked = Zeile loeschen.
 */
export async function setMatchAttendance(
  matchId: string,
  memberId: string,
  attended: boolean
): Promise<void> {
  await requireRole(["admin", "vorstand", "coach"]);
  const supabase = await createServerSupabaseClient();

  if (attended) {
    await supabase
      .from("match_attendance")
      .upsert({ match_id: matchId, member_id: memberId, attended: true }, { onConflict: "match_id,member_id" });
  } else {
    await supabase
      .from("match_attendance")
      .delete()
      .eq("match_id", matchId)
      .eq("member_id", memberId);
  }

  revalidatePath(`/dashboard/matches/${matchId}`);
}
