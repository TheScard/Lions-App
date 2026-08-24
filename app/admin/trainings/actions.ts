"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { addWeeksToLocalInputValue, parseLocalInputAsUtc } from "@/lib/timezone";
import type { Team } from "@/types/database";

export interface TrainingFormState {
  error?: string;
}

const VALID_TEAMS: Team[] = ["herren", "u16"];

// Sicherheitsgrenze gegen ein versehentlich sehr weit in der Zukunft
// liegendes "Wiederholen bis"-Datum (~2 Jahre bei woechentlicher Serie).
const MAX_SERIES_OCCURRENCES = 104;

function parseTrainingBaseForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const startsAtLocal = String(formData.get("starts_at") ?? "").trim();
  const team = String(formData.get("team") ?? "").trim();

  if (!title || !startsAtLocal) {
    return { error: "Titel und Datum/Uhrzeit sind Pflichtfelder." } as const;
  }
  if (!VALID_TEAMS.includes(team as Team)) {
    return { error: "Bitte ein Team (Herren/U16) auswählen." } as const;
  }

  const startsAtDate = parseLocalInputAsUtc(startsAtLocal);
  if (Number.isNaN(startsAtDate.getTime())) {
    return { error: "Ungueltiges Datum/Uhrzeit." } as const;
  }

  return {
    data: {
      title,
      location: location || null,
      team: team as Team,
      startsAtLocal,
      startsAtDate,
    },
  } as const;
}

export async function createTraining(
  _prevState: TrainingFormState,
  formData: FormData
): Promise<TrainingFormState> {
  await requireRole(["admin", "vorstand"]);

  const parsed = parseTrainingBaseForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { title, location, team, startsAtLocal } = parsed.data;

  // Neu angelegte Trainings wiederholen sich automatisch woechentlich bis
  // zum optionalen "Wiederholen bis"-Datum. Jede Instanz ist danach eine
  // eigenstaendige Zeile ohne Verknuepfung zu den anderen -- Loeschen einer
  // einzelnen Instanz loescht bewusst nicht die restliche Serie.
  const repeatUntil = String(formData.get("repeat_until") ?? "").trim();
  const occurrenceLocals: string[] = [startsAtLocal];

  if (repeatUntil) {
    const startsAtDatePart = startsAtLocal.split("T")[0];
    if (repeatUntil < startsAtDatePart) {
      return { error: "„Wiederholen bis“ muss nach dem Trainingstermin liegen." };
    }

    let current = startsAtLocal;
    while (occurrenceLocals.length < MAX_SERIES_OCCURRENCES) {
      const next = addWeeksToLocalInputValue(current, 1);
      if (next.split("T")[0] > repeatUntil) break;
      occurrenceLocals.push(next);
      current = next;
    }
  }

  // Eine series_id wird nur vergeben, wenn tatsaechlich eine Serie entsteht
  // (mehr als ein Termin) -- Einzeltrainings bleiben ohne Serienbezug.
  const seriesId = occurrenceLocals.length > 1 ? randomUUID() : null;

  const rows = occurrenceLocals.map((local) => ({
    title,
    location,
    team,
    series_id: seriesId,
    starts_at: parseLocalInputAsUtc(local).toISOString(),
  }));

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("trainings").insert(rows);

  if (error) {
    return { error: "Speichern fehlgeschlagen: " + error.message };
  }

  redirect("/admin/trainings");
}

export async function updateTraining(
  id: string,
  _prevState: TrainingFormState,
  formData: FormData
): Promise<TrainingFormState> {
  await requireRole(["admin", "vorstand"]);

  const parsed = parseTrainingBaseForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { title, location, team, startsAtDate } = parsed.data;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("trainings")
    .update({ title, location, team, starts_at: startsAtDate.toISOString() })
    .eq("id", id);

  if (error) {
    return { error: "Speichern fehlgeschlagen: " + error.message };
  }

  redirect("/admin/trainings");
}

export async function deleteTraining(id: string): Promise<void> {
  await requireRole(["admin", "vorstand"]);
  const supabase = await createServerSupabaseClient();
  await supabase.from("trainings").delete().eq("id", id);

  // Loescht ausschliesslich die einzelne Instanz -- Trainings aus einer
  // automatisch generierten Serie sind unabhaengige Zeilen ohne Bezug
  // zueinander, daher betrifft dies nie eine ganze Serie.
  revalidatePath("/admin/trainings");
  revalidatePath("/dashboard/trainings");
}

export async function deleteTrainingSeries(seriesId: string): Promise<void> {
  await requireRole(["admin", "vorstand"]);
  const supabase = await createServerSupabaseClient();
  await supabase.from("trainings").delete().eq("series_id", seriesId);

  revalidatePath("/admin/trainings");
  revalidatePath("/dashboard/trainings");
}
