"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Markiert die Erste-Schritte-Seite als abgeschlossen (sowohl fuer den
 * "Los geht's"-Button als auch fuer den "Später erledigen"-Link -- beide
 * rufen dieselbe Action auf, damit es keine Endlosschleife zurueck auf
 * /dashboard/start gibt). member_id kommt ausschliesslich aus der Session.
 */
export async function completeOnboarding(): Promise<void> {
  const session = await requireSession();
  const admin = createAdminClient();
  await admin
    .from("members")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", session.memberId);

  redirect("/dashboard");
}
