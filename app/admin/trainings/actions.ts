"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { addWeeksToLocalInputValue, parseLocalInputAsUtc } from "@/lib/timezone";
import { formatPushDateTime } from "@/lib/format";
import { sendPush } from "@/lib/push";
import { parseMinParticipants } from "@/lib/config";
import type { Team } from "@/types/database";

export interface TrainingFormState {
  error?: string;
}

export interface NudgeResult {
  error?: string;
  message?: string;
}

const VALID_TEAMS: Team[] = ["herren", "u16"];
const NUDGE_COOLDOWN_MS = 3 * 60 * 60 * 1000;

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

  const minParticipantsRaw = String(formData.get("min_participants") ?? "");
  const minParticipantsParsed = parseMinParticipants(minParticipantsRaw);
  if ("error" in minParticipantsParsed) {
    return { error: minParticipantsParsed.error } as const;
  }

  return {
    data: {
      title,
      location: location || null,
      team: team as Team,
      min_participants: minParticipantsParsed.value,
      startsAtLocal,
      startsAtDate,
    },
  } as const;
}

export async function createTraining(
  _prevState: TrainingFormState,
  formData: FormData
): Promise<TrainingFormState> {
  await requireRole(["admin", "vorstand", "coach"]);

  const parsed = parseTrainingBaseForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { title, location, team, min_participants, startsAtLocal } = parsed.data;

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
    min_participants,
    series_id: seriesId,
    starts_at: parseLocalInputAsUtc(local).toISOString(),
  }));

  const admin = createAdminClient();
  const { error } = await admin.from("trainings").insert(rows);

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
  await requireRole(["admin", "vorstand", "coach"]);

  const parsed = parseTrainingBaseForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { title, location, team, min_participants, startsAtDate } = parsed.data;
  const startsAtIso = startsAtDate.toISOString();

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("trainings")
    .select("starts_at")
    .eq("id", id)
    .maybeSingle();

  const { error } = await admin
    .from("trainings")
    .update({ title, location, team, min_participants, starts_at: startsAtIso })
    .eq("id", id);

  if (error) {
    return { error: "Speichern fehlgeschlagen: " + error.message };
  }

  // Verschiebt sich der Termin, verfaellt die 24h-Vorab-Erinnerung fuer den
  // alten Zeitpunkt -- sie wird beim naechsten Cron-Lauf fuer den neuen
  // Zeitpunkt neu eingeplant (siehe app/api/cron/reminders).
  if (before && before.starts_at !== startsAtIso) {
    await admin.from("notification_log").delete().eq("kind", "training_24h").eq("ref_id", id);
  }

  redirect("/admin/trainings");
}

export async function deleteTraining(id: string): Promise<void> {
  await requireRole(["admin", "vorstand", "coach"]);
  const admin = createAdminClient();
  await admin.from("trainings").delete().eq("id", id);

  // Loescht ausschliesslich die einzelne Instanz -- Trainings aus einer
  // automatisch generierten Serie sind unabhaengige Zeilen ohne Bezug
  // zueinander, daher betrifft dies nie eine ganze Serie.
  revalidatePath("/admin/trainings");
  revalidatePath("/dashboard/trainings");
}

export async function deleteTrainingSeries(seriesId: string): Promise<void> {
  await requireRole(["admin", "vorstand", "coach"]);
  const admin = createAdminClient();
  await admin.from("trainings").delete().eq("series_id", seriesId);

  revalidatePath("/admin/trainings");
  revalidatePath("/dashboard/trainings");
}

/**
 * "Nachhaken": sendet eine Push an alle Mitglieder des Trainings-Teams,
 * die noch NICHT abgestimmt haben (kein training_rsvps-Eintrag mit
 * status, egal ob yes oder no), nie an die auslösende Person. Prueft
 * Rolle, Zukunft des Termins, gesetztes und noch nicht erreichtes Minimum,
 * sowie ein Rate-Limit von 3h ueber trainings.last_nudge_at selbst --
 * nicht nur die UI blendet den Button aus.
 */
export async function nudgeTraining(trainingId: string): Promise<NudgeResult> {
  const session = await requireRole(["admin", "vorstand", "coach"]);
  const admin = createAdminClient();

  const { data: training } = await admin
    .from("trainings")
    .select("title, starts_at, team, min_participants, last_nudge_at")
    .eq("id", trainingId)
    .maybeSingle();

  if (!training) {
    return { error: "Training nicht gefunden." };
  }
  if (new Date(training.starts_at).getTime() < Date.now()) {
    return { error: "Der Termin liegt in der Vergangenheit." };
  }
  if (!training.min_participants) {
    return { error: "Für dieses Training ist kein Minimum gesetzt." };
  }
  if (training.last_nudge_at) {
    const elapsedMs = Date.now() - new Date(training.last_nudge_at).getTime();
    if (elapsedMs < NUDGE_COOLDOWN_MS) {
      return { error: "Es wurde erst vor kurzem nachgehakt, bitte später erneut." };
    }
  }

  const [{ data: rsvps }, { data: teamMembers }] = await Promise.all([
    admin.from("training_rsvps").select("member_id, status").eq("training_id", trainingId),
    admin.from("members").select("id").eq("team", training.team),
  ]);

  const teamMemberIds = new Set((teamMembers ?? []).map((m) => m.id));
  const yesCount = (rsvps ?? []).filter(
    (r) => r.status === "yes" && teamMemberIds.has(r.member_id)
  ).length;

  if (yesCount >= training.min_participants) {
    return { error: "Die Mindestanzahl wurde bereits erreicht." };
  }

  const votedIds = new Set(
    (rsvps ?? [])
      .filter((r) => r.status !== null && teamMemberIds.has(r.member_id))
      .map((r) => r.member_id)
  );
  const recipientIds = Array.from(teamMemberIds).filter(
    (id) => !votedIds.has(id) && id !== session.memberId
  );

  await admin
    .from("trainings")
    .update({ last_nudge_at: new Date().toISOString() })
    .eq("id", trainingId);

  revalidatePath(`/dashboard/trainings/${trainingId}`);

  if (recipientIds.length === 0) {
    return { message: "Alle haben schon abgestimmt." };
  }

  await sendPush({
    memberIds: recipientIds,
    title: `Wir brauchen dich: ${training.title}`,
    body: `Bisher ${yesCount} von mindestens ${training.min_participants} Zusagen. Bist du dabei? ${formatPushDateTime(training.starts_at)}`,
    path: `/dashboard/trainings/${trainingId}`,
  });

  return { message: `Erinnerung an ${recipientIds.length} Mitglieder gesendet` };
}
