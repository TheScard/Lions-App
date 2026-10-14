import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push";
import { formatPushDateTime } from "@/lib/format";
import type { Team } from "@/types/database";

// Vercel Cron ruft diesen Endpoint alle 15 Minuten auf (siehe vercel.json)
// und schickt dabei automatisch "Authorization: Bearer <CRON_SECRET>" mit,
// sobald die Env-Variable CRON_SECRET im Projekt gesetzt ist. Laeuft nur
// auf dem Production-Deployment, nicht auf Preview-Deployments.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type AdminClient = ReturnType<typeof createAdminClient>;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * "Reserviert" eine Erinnerung ueber den Unique-Constraint (kind, ref_id)
 * in notification_log: ignoreDuplicates sorgt dafuer, dass bei bereits
 * vorhandenem Eintrag nichts passiert und `data` leer bleibt. Nur wenn
 * diese Funktion true liefert, darf tatsaechlich gesendet werden -- das
 * macht den Cron-Lauf idempotent, auch bei ueberlappenden Aufrufen.
 */
async function claimNotification(admin: AdminClient, kind: string, refId: string): Promise<boolean> {
  const { data } = await admin
    .from("notification_log")
    .upsert({ kind, ref_id: refId }, { onConflict: "kind,ref_id", ignoreDuplicates: true })
    .select("id");
  return (data ?? []).length > 0;
}

async function remindTrainings(admin: AdminClient, now: number): Promise<number> {
  const nowIso = new Date(now).toISOString();
  const windowEndIso = new Date(now + 24 * 60 * 60 * 1000).toISOString();

  const { data: trainings } = await admin
    .from("trainings")
    .select("id, title, starts_at, team")
    .gt("starts_at", nowIso)
    .lte("starts_at", windowEndIso);

  let sent = 0;
  for (const training of trainings ?? []) {
    const claimed = await claimNotification(admin, "training_24h", training.id);
    if (!claimed) continue;

    const [{ data: rsvps }, { data: teamMembers }] = await Promise.all([
      admin.from("training_rsvps").select("member_id, status").eq("training_id", training.id),
      // Mitglieder ohne Team (team is null) tauchen hier nie auf --
      // .eq() liefert fuer NULL-Spalten nie einen Treffer.
      admin.from("members").select("id").eq("team", training.team as Team),
    ]);

    // Nur Mitglieder, die aktuell dem Team des Trainings angehoeren,
    // zaehlen als "schon abgestimmt" -- eine Zusage/Absage aus einer Zeit
    // vor einem Teamwechsel wird ignoriert (siehe checkRsvpEligibility()).
    const teamMemberIds = new Set((teamMembers ?? []).map((m) => m.id));
    const votedIds = new Set(
      (rsvps ?? [])
        .filter((r) => r.status !== null && teamMemberIds.has(r.member_id))
        .map((r) => r.member_id)
    );
    const recipientIds = (teamMembers ?? []).map((m) => m.id).filter((id) => !votedIds.has(id));

    await sendPush({
      memberIds: recipientIds,
      title: "Training: Stimme jetzt ab",
      body: `${training.title}, ${formatPushDateTime(training.starts_at)} -- bist du dabei?`,
      path: `/dashboard/trainings/${training.id}`,
    });
    sent++;
  }
  return sent;
}

async function remindMatches(admin: AdminClient, now: number): Promise<number> {
  const nowIso = new Date(now).toISOString();
  const windowEndIso = new Date(now + 96 * 60 * 60 * 1000).toISOString();

  const { data: matches } = await admin
    .from("matches")
    .select("id, title, starts_at, team, location_name")
    .gt("starts_at", nowIso)
    .lte("starts_at", windowEndIso);

  let sent = 0;
  for (const match of matches ?? []) {
    const claimed = await claimNotification(admin, "match_96h", match.id);
    if (!claimed) continue;

    const [{ data: rsvps }, { data: teamMembers }] = await Promise.all([
      admin.from("match_rsvps").select("member_id").eq("match_id", match.id),
      // Mitglieder ohne Team (team is null) tauchen hier nie auf --
      // .eq() liefert fuer NULL-Spalten nie einen Treffer.
      admin.from("members").select("id").eq("team", match.team as Team),
    ]);

    // Nur Mitglieder, die aktuell dem Team des Spiels angehoeren, zaehlen
    // als "schon abgestimmt" -- eine Zusage/Absage aus einer Zeit vor
    // einem Teamwechsel wird ignoriert (siehe checkRsvpEligibility()).
    const teamMemberIds = new Set((teamMembers ?? []).map((m) => m.id));
    const votedIds = new Set(
      (rsvps ?? []).filter((r) => teamMemberIds.has(r.member_id)).map((r) => r.member_id)
    );
    const recipientIds = (teamMembers ?? []).map((m) => m.id).filter((id) => !votedIds.has(id));

    await sendPush({
      memberIds: recipientIds,
      title: "Spiel: Stimme jetzt ab",
      body: `${match.title}, ${formatPushDateTime(match.starts_at)} in ${match.location_name} -- bist du dabei?`,
      path: `/dashboard/matches/${match.id}`,
    });
    sent++;
  }
  return sent;
}

async function handleReminders(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();

  const [trainingReminders, matchReminders] = await Promise.all([
    remindTrainings(admin, now),
    remindMatches(admin, now),
  ]);

  return NextResponse.json({ trainingReminders, matchReminders });
}

export async function GET(request: NextRequest) {
  return handleReminders(request);
}

export async function POST(request: NextRequest) {
  return handleReminders(request);
}
