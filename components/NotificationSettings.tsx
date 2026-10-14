"use client";

import { useEffect, useState, useTransition } from "react";
import {
  savePushSubscription,
  deletePushSubscription,
  sendTestPush,
} from "@/app/dashboard/benachrichtigungen/actions";

type Status = "checking" | "unsupported" | "denied" | "inactive" | "active";

const STATUS_LABEL: Record<Status, string> = {
  checking: "Wird geprüft...",
  unsupported: "Nicht unterstützt",
  denied: "Blockiert",
  inactive: "Nicht aktiv",
  active: "Aktiv",
};

const PRIMARY_BUTTON =
  "rounded-md bg-gradient-to-r from-primary-hover to-primary px-4 py-2 text-sm font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)] disabled:opacity-60 disabled:shadow-none";
const SECONDARY_BUTTON =
  "rounded-md border border-border px-4 py-2 text-sm font-bold uppercase tracking-wide text-text-muted transition hover:border-primary/50 hover:text-text disabled:opacity-60";

// Web Push erwartet den VAPID-Public-Key als Uint8Array (nicht als
// base64url-String) -- Standard-Konvertierungsroutine aus der Push-API-Doku.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export function NotificationSettings({
  disableEnable = false,
  disableReason,
}: {
  /** Deaktiviert den "Aktivieren"-Button zusaetzlich (z.B. auf dem iPhone
   * ohne Home-Bildschirm-Installation, siehe /dashboard/start). */
  disableEnable?: boolean;
  disableReason?: string;
} = {}) {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function refreshStatus() {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setStatus(subscription ? "active" : "inactive");
    } catch {
      setStatus("inactive");
    }
  }

  // Muss per Klick ausgeloest werden (iOS erlaubt requestPermission nur
  // innerhalb einer direkten Nutzerinteraktion).
  function enable() {
    setMessage(null);
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          await refreshStatus();
          return;
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          setMessage("Push ist serverseitig nicht konfiguriert.");
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });

        const json = subscription.toJSON() as {
          endpoint?: string;
          keys?: { p256dh?: string; auth?: string };
        };
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
          throw new Error("Unvollstaendige Subscription.");
        }

        await savePushSubscription(
          { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
          navigator.userAgent
        );
        await refreshStatus();
      } catch (error) {
        console.error("Aktivieren fehlgeschlagen:", error);
        setMessage("Aktivieren fehlgeschlagen. Bitte erneut versuchen.");
      }
    });
  }

  function disable() {
    setMessage(null);
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await deletePushSubscription(subscription.endpoint);
          await subscription.unsubscribe();
        }
        await refreshStatus();
      } catch (error) {
        console.error("Deaktivieren fehlgeschlagen:", error);
        setMessage("Deaktivieren fehlgeschlagen. Bitte erneut versuchen.");
      }
    });
  }

  function sendTest() {
    setMessage(null);
    startTransition(async () => {
      const result = await sendTestPush();
      setMessage(result.error ?? "Test-Benachrichtigung wurde gesendet.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-text-muted">Status</p>
        <p className="mt-1 text-sm font-medium text-text">{STATUS_LABEL[status]}</p>
      </div>

      {status === "unsupported" && (
        <p className="text-sm text-text-muted">
          Dieses Gerät oder dieser Browser unterstützt keine Push-Benachrichtigungen.
        </p>
      )}

      {status === "denied" && (
        <p className="text-sm text-text-muted">
          Benachrichtigungen wurden blockiert. Bitte in den Browser- bzw. System-Einstellungen für
          diese Seite erlauben.
        </p>
      )}

      {status === "inactive" && (
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            disabled={isPending || disableEnable}
            onClick={enable}
            className={PRIMARY_BUTTON}
          >
            Benachrichtigungen aktivieren
          </button>
          {disableEnable && disableReason && (
            <p className="text-xs text-text-muted">{disableReason}</p>
          )}
        </div>
      )}

      {status === "active" && (
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={isPending} onClick={sendTest} className={SECONDARY_BUTTON}>
            Test-Benachrichtigung senden
          </button>
          <button type="button" disabled={isPending} onClick={disable} className={SECONDARY_BUTTON}>
            Deaktivieren
          </button>
        </div>
      )}

      {message && <p className="text-sm text-text-muted">{message}</p>}

      <p className="rounded-lg border border-dashed border-border bg-surface p-3 text-xs text-text-muted">
        Hinweis für iPhone-Nutzer: Auf dem iPhone funktionieren Push-Nachrichten nur, wenn die App
        über „Teilen → Zum Home-Bildschirm“ installiert wurde (iOS 16.4 oder neuer).
      </p>
    </div>
  );
}
