import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Team } from "@/types/database";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Kleine Batches statt alles auf einmal, damit ein einzelner Lauf nicht zu
// viele parallele Verbindungen gleichzeitig offen haelt.
const BATCH_SIZE = 20;
const TTL_SECONDS = 24 * 60 * 60;

/**
 * Liefert alle Mitglieds-IDs eines Teams, optional ohne die aufloesende
 * Person selbst (z.B. der Ersteller eines Spiels soll keine Push ueber die
 * eigene Aktion erhalten).
 */
export async function getTeamMemberIds(team: Team, excludeMemberId?: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("members").select("id").eq("team", team);
  return (data ?? []).map((m) => m.id).filter((id) => id !== excludeMemberId);
}

/**
 * Sendet eine Push-Benachrichtigung an alle Geraete der angegebenen
 * Mitglieder. Darf die aufrufende Server Action NIE zum Scheitern bringen
 * (daher der grosse try/catch aussen) -- Fehler werden nur geloggt.
 * Abgelaufene Subscriptions (HTTP 404/410) werden automatisch entfernt.
 */
export async function sendPush({
  memberIds,
  title,
  body,
  path,
}: {
  memberIds: string[];
  title: string;
  body: string;
  path: string;
}): Promise<void> {
  if (memberIds.length === 0) return;

  // Sicherheitsschalter fuer die lokale Entwicklung: .env.local zeigt auf
  // die LIVE-Datenbank mit echten Mitgliedern und echten Push-Abos. Mit
  // PUSH_DRY_RUN=true wird nichts tatsaechlich versendet, nur geloggt --
  // darf NIE in Vercel/Production gesetzt sein.
  if (process.env.PUSH_DRY_RUN === "true") {
    console.log("[PUSH_DRY_RUN] Kein echter Versand.", { memberIds, title, body, path });
    return;
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    console.error("Push nicht gesendet: VAPID-Env-Variablen fehlen.");
    return;
  }

  try {
    const admin = createAdminClient();
    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("member_id", memberIds);

    const rows = subscriptions ?? [];
    if (rows.length === 0) return;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const payload = JSON.stringify({ title, body, url: `${appUrl}${path}` });
    const staleIds: string[] = [];

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((row) =>
          webpush.sendNotification(
            { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
            payload,
            { TTL: TTL_SECONDS }
          )
        )
      );

      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const statusCode = (result.reason as { statusCode?: number } | undefined)?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            staleIds.push(batch[index].id);
          } else {
            console.error("Push-Versand fehlgeschlagen:", result.reason);
          }
        }
      });
    }

    if (staleIds.length > 0) {
      await admin.from("push_subscriptions").delete().in("id", staleIds);
    }
  } catch (error) {
    console.error("Push-Versand fehlgeschlagen:", error);
  }
}
