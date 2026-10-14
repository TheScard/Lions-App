"use server";

import { requireSession } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push";

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Speichert/aktualisiert eine Push-Subscription fuer das eingeloggte
 * Mitglied (Upsert ueber endpoint -- ein Geraet kann sich erneut
 * registrieren, ohne doppelte Zeilen anzulegen). Ein Mitglied kann mehrere
 * Geraete haben.
 */
export async function savePushSubscription(
  subscription: PushSubscriptionInput,
  userAgent: string
): Promise<void> {
  const session = await requireSession();
  const admin = createAdminClient();

  await admin.from("push_subscriptions").upsert(
    {
      member_id: session.memberId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent,
    },
    { onConflict: "endpoint" }
  );
}

/**
 * Loescht ausschliesslich die eigene Subscription (gefiltert auf
 * member_id), unabhaengig davon welcher endpoint uebergeben wird.
 */
export async function deletePushSubscription(endpoint: string): Promise<void> {
  const session = await requireSession();
  const admin = createAdminClient();
  await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("member_id", session.memberId);
}

export interface TestPushResult {
  error?: string;
}

// Mindestabstand zwischen zwei Test-Pushes desselben Mitglieds. Als
// Datenbank-Spalte (members.last_test_push_at) statt In-Memory-Zaehler
// umgesetzt, da Vercel-Funktionen keinen gemeinsamen Speicher zwischen
// Aufrufen haben.
const TEST_PUSH_COOLDOWN_MS = 30 * 1000;

/**
 * Sendet eine Test-Benachrichtigung ausschliesslich an die eigenen Geraete
 * der Session -- Empfaenger, Titel, Text und Link sind fest vorgegeben und
 * kommen nie aus einem Request-Parameter.
 */
export async function sendTestPush(): Promise<TestPushResult> {
  const session = await requireSession();
  const admin = createAdminClient();

  const { data: member } = await admin
    .from("members")
    .select("last_test_push_at")
    .eq("id", session.memberId)
    .maybeSingle();

  if (member?.last_test_push_at) {
    const elapsedMs = Date.now() - new Date(member.last_test_push_at).getTime();
    if (elapsedMs < TEST_PUSH_COOLDOWN_MS) {
      return { error: "Bitte kurz warten." };
    }
  }

  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id")
    .eq("member_id", session.memberId)
    .limit(1);

  if (!subscriptions || subscriptions.length === 0) {
    return { error: "Push ist auf diesem Gerät nicht aktiviert." };
  }

  await admin
    .from("members")
    .update({ last_test_push_at: new Date().toISOString() })
    .eq("id", session.memberId);

  await sendPush({
    memberIds: [session.memberId],
    title: "Test-Benachrichtigung",
    body: "Push-Benachrichtigungen sind bei dir aktiv.",
    path: "/dashboard/benachrichtigungen",
  });

  return {};
}
