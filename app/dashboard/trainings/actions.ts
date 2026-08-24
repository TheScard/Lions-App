"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireSession } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RsvpStatus } from "@/types/database";

/**
 * Setzt die eigene Zu-/Absage per Upsert (unique(training_id, member_id)):
 * ein erneuter Klick aktualisiert den bestehenden Eintrag statt einen
 * zweiten anzulegen.
 *
 * Anders als die uebrigen Actions in dieser App redirected diese Action
 * NICHT (bleibt auf derselben Liste) -- braucht daher explizit
 * revalidatePath, damit Next.js die Server-Component-Daten der Seite nach
 * der Mutation neu laedt statt eine gecachte Fassung weiterzuzeigen.
 */
export async function setRsvp(trainingId: string, status: RsvpStatus): Promise<void> {
  const session = await requireSession();
  const supabase = await createServerSupabaseClient();

  await supabase
    .from("training_rsvps")
    .upsert(
      { training_id: trainingId, member_id: session.memberId, status },
      { onConflict: "training_id,member_id" }
    );

  revalidatePath("/dashboard/trainings");
  revalidatePath(`/dashboard/trainings/${trainingId}`);
}

/**
 * Setzt die tatsaechliche Anwesenheit fuer eine BESTEHENDE Zu-/Absage.
 * Aendert bewusst nur attended, nicht status -- eine Absage bleibt eine
 * Absage, auch wenn (z.B. spontan) doch teilgenommen wurde.
 */
export async function setTrainingAttendance(
  trainingId: string,
  memberId: string,
  attended: boolean
): Promise<void> {
  await requireRole(["admin", "vorstand", "coach"]);
  const supabase = await createServerSupabaseClient();

  await supabase
    .from("training_rsvps")
    .update({ attended })
    .eq("training_id", trainingId)
    .eq("member_id", memberId);

  revalidatePath(`/dashboard/trainings/${trainingId}`);
}

/**
 * Legt fuer ein Mitglied OHNE vorherige Zu-/Absage nachtraeglich einen
 * training_rsvps-Eintrag an (status "yes" als sinnvoller Default, da als
 * anwesend markiert) und setzt attended direkt auf true.
 */
export async function addTrainingAttendance(trainingId: string, memberId: string): Promise<void> {
  await requireRole(["admin", "vorstand", "coach"]);
  const supabase = await createServerSupabaseClient();

  await supabase
    .from("training_rsvps")
    .upsert(
      { training_id: trainingId, member_id: memberId, status: "yes", attended: true },
      { onConflict: "training_id,member_id" }
    );

  revalidatePath(`/dashboard/trainings/${trainingId}`);
}
