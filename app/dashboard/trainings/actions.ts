"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/guards";
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
