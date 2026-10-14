"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseLocalInputAsUtc } from "@/lib/timezone";
import { formatPushDateTime } from "@/lib/format";
import { sendPush, getTeamMemberIds } from "@/lib/push";
import { parseMinParticipants } from "@/lib/config";
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

  const minParticipantsRaw = String(formData.get("min_participants") ?? "");
  const minParticipantsParsed = parseMinParticipants(minParticipantsRaw);
  if ("error" in minParticipantsParsed) {
    return { error: minParticipantsParsed.error } as const;
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
      min_participants: minParticipantsParsed.value,
    },
  } as const;
}

export async function createMatch(
  _prevState: MatchFormState,
  formData: FormData
): Promise<MatchFormState> {
  const session = await requireRole(["admin", "vorstand", "coach"]);

  const parsed = parseMatchForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from("matches")
    .insert({ ...parsed.data, created_by: session.memberId })
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: "Speichern fehlgeschlagen: " + (error?.message ?? "unbekannter Fehler") };
  }

  if (new Date(parsed.data.starts_at).getTime() > Date.now()) {
    const recipientIds = await getTeamMemberIds(parsed.data.team, session.memberId);
    await sendPush({
      memberIds: recipientIds,
      title: `Neues Spiel: ${parsed.data.title}`,
      body: `${formatPushDateTime(parsed.data.starts_at)} · ${parsed.data.location_name}`,
      path: `/dashboard/matches/${inserted.id}`,
    });
  }

  redirect("/admin/matches");
}

export async function updateMatch(
  id: string,
  _prevState: MatchFormState,
  formData: FormData
): Promise<MatchFormState> {
  const session = await requireRole(["admin", "vorstand", "coach"]);

  const parsed = parseMatchForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("matches")
    .select("title, location_name, location_address, starts_at, team")
    .eq("id", id)
    .maybeSingle();

  const { error } = await admin.from("matches").update(parsed.data).eq("id", id);

  if (error) {
    return { error: "Speichern fehlgeschlagen: " + error.message };
  }

  if (before) {
    const timeChanged = before.starts_at !== parsed.data.starts_at;
    const detailsChanged =
      before.title !== parsed.data.title ||
      before.location_name !== parsed.data.location_name ||
      before.location_address !== parsed.data.location_address ||
      before.team !== parsed.data.team;
    const willBeFuture = new Date(parsed.data.starts_at).getTime() > Date.now();

    // Verschiebt sich der Termin, verfaellt die 96h-Vorab-Erinnerung fuer
    // den alten Zeitpunkt -- sie wird beim naechsten Cron-Lauf fuer den
    // neuen Zeitpunkt neu eingeplant (siehe app/api/cron/reminders).
    if (timeChanged) {
      await admin.from("notification_log").delete().eq("kind", "match_96h").eq("ref_id", id);
    }

    if (willBeFuture && (timeChanged || detailsChanged)) {
      const recipientIds = await getTeamMemberIds(parsed.data.team, session.memberId);
      if (timeChanged) {
        await sendPush({
          memberIds: recipientIds,
          title: `Spiel verschoben: ${parsed.data.title}`,
          body: `Neuer Termin: ${formatPushDateTime(parsed.data.starts_at)} (vorher: ${formatPushDateTime(before.starts_at)})`,
          path: `/dashboard/matches/${id}`,
        });
      } else {
        await sendPush({
          memberIds: recipientIds,
          title: `Spiel geändert: ${parsed.data.title}`,
          body: "Bitte Details prüfen.",
          path: `/dashboard/matches/${id}`,
        });
      }
    }
  }

  redirect("/admin/matches");
}

export async function deleteMatch(id: string): Promise<void> {
  await requireRole(["admin", "vorstand", "coach"]);
  const admin = createAdminClient();
  await admin.from("matches").delete().eq("id", id);

  // Diese Action redirected nicht (bleibt auf /admin/matches) -- ohne
  // revalidatePath wuerde Next.js sonst die gecachten Daten von vor dem
  // Loeschen weiterzeigen.
  revalidatePath("/admin/matches");
  revalidatePath("/dashboard/matches");
}

export interface NudgeResult {
  error?: string;
  message?: string;
}

const NUDGE_COOLDOWN_MS = 3 * 60 * 60 * 1000;

/**
 * "Nachhaken": sendet eine Push an alle Mitglieder des Spiel-Teams, die
 * noch NICHT abgestimmt haben (kein match_rsvps-Eintrag mit status, egal
 * ob yes oder no), nie an die auslösende Person. Prueft Rolle, Zukunft des
 * Termins, gesetztes und noch nicht erreichtes Minimum, sowie ein
 * Rate-Limit von 3h ueber matches.last_nudge_at selbst -- nicht nur die UI
 * blendet den Button aus.
 */
export async function nudgeMatch(matchId: string): Promise<NudgeResult> {
  const session = await requireRole(["admin", "vorstand", "coach"]);
  const admin = createAdminClient();

  const { data: match } = await admin
    .from("matches")
    .select("title, starts_at, team, min_participants, last_nudge_at")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) {
    return { error: "Spiel nicht gefunden." };
  }
  if (new Date(match.starts_at).getTime() < Date.now()) {
    return { error: "Der Termin liegt in der Vergangenheit." };
  }
  if (!match.min_participants) {
    return { error: "Für dieses Spiel ist kein Minimum gesetzt." };
  }
  if (match.last_nudge_at) {
    const elapsedMs = Date.now() - new Date(match.last_nudge_at).getTime();
    if (elapsedMs < NUDGE_COOLDOWN_MS) {
      return { error: "Es wurde erst vor kurzem nachgehakt, bitte später erneut." };
    }
  }

  const [{ data: rsvps }, { data: teamMembers }] = await Promise.all([
    admin.from("match_rsvps").select("member_id, status").eq("match_id", matchId),
    admin.from("members").select("id").eq("team", match.team),
  ]);

  const teamMemberIds = new Set((teamMembers ?? []).map((m) => m.id));
  const yesCount = (rsvps ?? []).filter(
    (r) => r.status === "yes" && teamMemberIds.has(r.member_id)
  ).length;

  if (yesCount >= match.min_participants) {
    return { error: "Die Mindestanzahl wurde bereits erreicht." };
  }

  const votedIds = new Set(
    (rsvps ?? []).filter((r) => teamMemberIds.has(r.member_id)).map((r) => r.member_id)
  );
  const recipientIds = Array.from(teamMemberIds).filter(
    (id) => !votedIds.has(id) && id !== session.memberId
  );

  await admin.from("matches").update({ last_nudge_at: new Date().toISOString() }).eq("id", matchId);

  revalidatePath(`/dashboard/matches/${matchId}`);

  if (recipientIds.length === 0) {
    return { message: "Alle haben schon abgestimmt." };
  }

  await sendPush({
    memberIds: recipientIds,
    title: `Wir brauchen dich: ${match.title}`,
    body: `Bisher ${yesCount} von mindestens ${match.min_participants} Zusagen. Bist du dabei? ${formatPushDateTime(match.starts_at)}`,
    path: `/dashboard/matches/${matchId}`,
  });

  return { message: `Erinnerung an ${recipientIds.length} Mitglieder gesendet` };
}
