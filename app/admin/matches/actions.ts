"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseLocalInputAsUtc } from "@/lib/timezone";
import type { Team } from "@/types/database";

export interface MatchFormState {
  error?: string;
}

const VALID_TEAMS: Team[] = ["herren", "u16"];

function parseMatchForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const location_name = String(formData.get("location_name") ?? "").trim();
  const location_address = String(formData.get("location_address") ?? "").trim();
  const startsAtLocal = String(formData.get("starts_at") ?? "").trim();
  const result = String(formData.get("result") ?? "").trim();
  const team = String(formData.get("team") ?? "").trim();

  if (!title || !location_name || !location_address || !startsAtLocal) {
    return { error: "Titel, Ort, Adresse und Datum/Uhrzeit sind Pflichtfelder." } as const;
  }
  if (!VALID_TEAMS.includes(team as Team)) {
    return { error: "Bitte ein Team (Herren/U16) auswählen." } as const;
  }

  // startsAtLocal ist eine Ortszeit ohne Zeitzoneninfo (Browser-Feld) und
  // wird bewusst als Europe/Berlin interpretiert, nicht mit dem naiven
  // `new Date(...)`, das von der Server-Zeitzone abhaengen wuerde.
  const startsAtDate = parseLocalInputAsUtc(startsAtLocal);
  if (Number.isNaN(startsAtDate.getTime())) {
    return { error: "Ungueltiges Datum/Uhrzeit." } as const;
  }

  // Ergebnis darf nur fuer bereits stattgefundene Spiele gespeichert werden.
  // Wird trotz deaktiviertem/ausgeblendetem Formularfeld dennoch ein Wert
  // uebermittelt (z.B. durch clientseitiges Umgehen), wird er hier verworfen.
  const isPast = startsAtDate.getTime() < Date.now();

  return {
    data: {
      title,
      location_name,
      location_address,
      starts_at: startsAtDate.toISOString(),
      result: isPast ? result || null : null,
      team: team as Team,
    },
  } as const;
}

export async function createMatch(
  _prevState: MatchFormState,
  formData: FormData
): Promise<MatchFormState> {
  const session = await requireRole(["admin", "vorstand"]);

  const parsed = parseMatchForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("matches").insert({
    ...parsed.data,
    created_by: session.memberId,
  });

  if (error) {
    return { error: "Speichern fehlgeschlagen: " + error.message };
  }

  redirect("/admin/matches");
}

export async function updateMatch(
  id: string,
  _prevState: MatchFormState,
  formData: FormData
): Promise<MatchFormState> {
  await requireRole(["admin", "vorstand"]);

  const parsed = parseMatchForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("matches").update(parsed.data).eq("id", id);

  if (error) {
    return { error: "Speichern fehlgeschlagen: " + error.message };
  }

  redirect("/admin/matches");
}

export async function deleteMatch(id: string): Promise<void> {
  await requireRole(["admin", "vorstand"]);
  const supabase = await createServerSupabaseClient();
  await supabase.from("matches").delete().eq("id", id);

  // Diese Action redirected nicht (bleibt auf /admin/matches) -- ohne
  // revalidatePath wuerde Next.js sonst die gecachten Daten von vor dem
  // Loeschen weiterzeigen.
  revalidatePath("/admin/matches");
  revalidatePath("/dashboard/matches");
}
