"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireSession } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRsvpEligibility, type RsvpResult } from "@/lib/rsvp";
import type { RsvpStatus } from "@/types/database";

/**
 * Setzt die eigene Zu-/Absage per Upsert (unique(training_id, member_id)):
 * ein erneuter Klick aktualisiert den bestehenden Eintrag statt einen
 * zweiten anzulegen. member_id kommt ausschliesslich aus der Session, nie
 * aus dem Aufruf -- ein Mitglied kann also nie fuer jemand anderen
 * abstimmen.
 *
 * Serverseitig abgesichert wie setMatchRsvp() -- siehe checkRsvpEligibility()
 * fuer die (fuer Trainings und Spiele identischen) Regeln: eigenes Team
 * gesetzt, Training in der Zukunft, Training-Team == eigenes Team. Die
 * Rolle spielt dabei keine Rolle, auch admin/vorstand/coach stimmen nur
 * fuer ihr eigenes Team ab.
 *
 * Schreibt ueber den Service-Role-Client, da Rolle/Team/Zeitpunkt hier
 * bereits serverseitig geprueft wurden.
 *
 * Anders als die uebrigen Actions in dieser App redirected diese Action
 * NICHT (bleibt auf derselben Liste) -- braucht daher explizit
 * revalidatePath, damit Next.js die Server-Component-Daten der Seite nach
 * der Mutation neu laedt statt eine gecachte Fassung weiterzuzeigen.
 */
export async function setRsvp(trainingId: string, status: RsvpStatus): Promise<RsvpResult> {
  const session = await requireSession();
  const admin = createAdminClient();

  const { data: training } = await admin
    .from("trainings")
    .select("starts_at, team")
    .eq("id", trainingId)
    .maybeSingle();

  const error = await checkRsvpEligibility(admin, session.memberId, training);
  if (error) return { error };

  await admin
    .from("training_rsvps")
    .upsert(
      { training_id: trainingId, member_id: session.memberId, status },
      { onConflict: "training_id,member_id" }
    );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/trainings");
  revalidatePath(`/dashboard/trainings/${trainingId}`);
  return {};
}

/**
 * Speichert die tatsaechliche Anwesenheit fuer ein Training in einem
 * Request fuer die ganze (im Formular gerenderte) Mitgliederliste --
 * aendert bewusst nur attended, nie status (eine Absage bleibt eine
 * Absage, auch wenn jemand spontan doch teilgenommen hat). Fuer Mitglieder
 * ohne vorherige Zu-/Absage wird bei Bedarf eine neue Zeile ohne status
 * (NULL) angelegt -- der Upsert liefert nur die Spalten training_id,
 * member_id, attended, daher bleibt ein bereits vorhandener status beim
 * Update unberuehrt.
 *
 * Erfassen ist erst ab Trainingsbeginn moeglich (serverseitig geprueft),
 * danach jederzeit nachtraeglich aenderbar. Schreibt ueber den
 * Service-Role-Client, da Rolle und Zeitpunkt hier bereits geprueft sind.
 */
export async function saveTrainingAttendance(trainingId: string, formData: FormData): Promise<void> {
  await requireRole(["admin", "vorstand", "coach"]);
  const admin = createAdminClient();

  const { data: training } = await admin
    .from("trainings")
    .select("starts_at")
    .eq("id", trainingId)
    .maybeSingle();
  if (!training || new Date(training.starts_at).getTime() > Date.now()) {
    return;
  }

  const memberIds = formData.getAll("member_ids").map(String);
  const rows = memberIds.map((memberId) => ({
    training_id: trainingId,
    member_id: memberId,
    attended: formData.get(`attended_${memberId}`) === "on",
  }));

  if (rows.length > 0) {
    await admin.from("training_rsvps").upsert(rows, { onConflict: "training_id,member_id" });
  }

  revalidatePath(`/dashboard/trainings/${trainingId}`);
  revalidatePath("/dashboard/trainings");
}
