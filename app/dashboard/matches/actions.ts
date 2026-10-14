"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireSession } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRsvpEligibility, type RsvpResult } from "@/lib/rsvp";
import type { RsvpStatus } from "@/types/database";

/**
 * Setzt die eigene Zu-/Absage fuer ein Spiel per Upsert, analog zu
 * setRsvp() bei Trainings. Serverseitig abgesichert ueber
 * checkRsvpEligibility() -- siehe dort fuer die (fuer Trainings und Spiele
 * identischen) Regeln: eigenes Team gesetzt, Spiel in der Zukunft,
 * Spiel-Team == eigenes Team. Die Rolle spielt dabei keine Rolle, auch
 * admin/vorstand/coach stimmen nur fuer ihr eigenes Team ab.
 *
 * Schreibt ueber den Service-Role-Client, da Rolle/Team hier bereits
 * serverseitig geprueft wurden.
 */
export async function setMatchRsvp(matchId: string, status: RsvpStatus): Promise<RsvpResult> {
  const session = await requireSession();
  const admin = createAdminClient();

  const { data: match } = await admin
    .from("matches")
    .select("starts_at, team")
    .eq("id", matchId)
    .maybeSingle();

  const error = await checkRsvpEligibility(admin, session.memberId, match);
  if (error) return { error };

  await admin
    .from("match_rsvps")
    .upsert(
      { match_id: matchId, member_id: session.memberId, status, updated_at: new Date().toISOString() },
      { onConflict: "match_id,member_id" }
    );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/matches");
  revalidatePath(`/dashboard/matches/${matchId}`);
  return {};
}

/**
 * Speichert die tatsaechliche Teilnahme an einem Spiel in einem Request
 * fuer die ganze (im Formular gerenderte) Mitgliederliste, analog zu
 * saveTrainingAttendance(). Erfassen ist erst ab Spielbeginn moeglich
 * (serverseitig geprueft), danach jederzeit nachtraeglich aenderbar.
 */
export async function saveMatchAttendance(matchId: string, formData: FormData): Promise<void> {
  await requireRole(["admin", "vorstand", "coach"]);
  const admin = createAdminClient();

  const { data: match } = await admin
    .from("matches")
    .select("starts_at")
    .eq("id", matchId)
    .maybeSingle();
  if (!match || new Date(match.starts_at).getTime() > Date.now()) {
    return;
  }

  const memberIds = formData.getAll("member_ids").map(String);
  const rows = memberIds.map((memberId) => ({
    match_id: matchId,
    member_id: memberId,
    attended: formData.get(`attended_${memberId}`) === "on",
  }));

  if (rows.length > 0) {
    await admin.from("match_attendance").upsert(rows, { onConflict: "match_id,member_id" });
  }

  revalidatePath(`/dashboard/matches/${matchId}`);
}
