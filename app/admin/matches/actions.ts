"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseLocalInputAsUtc } from "@/lib/timezone";
import { formatPushDateTime } from "@/lib/format";
import { sendPush, getTeamMemberIds } from "@/lib/push";
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
