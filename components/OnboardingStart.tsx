"use client";

import { useEffect, useState } from "react";
import { NotificationSettings } from "@/components/NotificationSettings";
import { completeOnboarding } from "@/app/dashboard/start/actions";

type DeviceKind = "ios" | "android" | "desktop";

function detectDevice(): DeviceKind {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true);
}

const INSTRUCTIONS: Record<DeviceKind, { label: string; steps: string[] }> = {
  ios: {
    label: "iPhone/iPad (Safari)",
    steps: [
      "Tippe unten in Safari auf das Teilen-Symbol.",
      "Wähle „Zum Home-Bildschirm“.",
      "Tippe auf „Hinzufügen“.",
    ],
  },
  android: {
    label: "Android (Chrome)",
    steps: [
      "Tippe oben rechts auf das Menü (drei Punkte).",
      "Wähle „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.",
    ],
  },
  desktop: {
    label: "Desktop",
    steps: ["Am Desktop ist die Installation optional, die App laeuft auch einfach im Browser."],
  },
};

const PRIMARY_BUTTON =
  "self-start rounded-md bg-gradient-to-r from-primary-hover to-primary px-4 py-2.5 text-sm font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)]";

function DoneBadge() {
  return (
    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-300">
      Erledigt
    </span>
  );
}

export function OnboardingStart() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [device, setDevice] = useState<DeviceKind>("desktop");

  useEffect(() => {
    setIsStandalone(detectStandalone());
    setDevice(detectDevice());
  }, []);

  const step1Done = isStandalone;
  const otherDevices = (Object.keys(INSTRUCTIONS) as DeviceKind[]).filter((kind) => kind !== device);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-base italic font-bold uppercase tracking-wide text-text">
            1. App auf den Home-Bildschirm
          </h2>
          {step1Done && <DoneBadge />}
        </div>

        {step1Done ? (
          <p className="mt-2 text-sm text-text-muted">Die App läuft bereits als installierte App.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <ol className="list-inside list-decimal text-sm text-text">
              {INSTRUCTIONS[device].steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
            <p className="text-xs text-text-muted">
              Öffne die App danach über das Icon auf dem Home-Bildschirm, nicht über den Browser.
            </p>

            {otherDevices.map((kind) => (
              <details key={kind} className="rounded-lg border border-border bg-surface-2 p-3">
                <summary className="cursor-pointer text-sm font-medium text-text">
                  {INSTRUCTIONS[kind].label}
                </summary>
                <ol className="mt-2 list-inside list-decimal text-sm text-text-muted">
                  {INSTRUCTIONS[kind].steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="font-heading text-base italic font-bold uppercase tracking-wide text-text">
          2. Benachrichtigungen einschalten
        </h2>
        <div className="mt-3">
          <NotificationSettings
            disableEnable={device === "ios" && !isStandalone}
            disableReason="Erst Schritt 1 erledigen"
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="font-heading text-base italic font-bold uppercase tracking-wide text-text">
          3. Los geht&apos;s
        </h2>
        <form action={completeOnboarding} className="mt-3">
          <button type="submit" className={PRIMARY_BUTTON}>
            Los geht&apos;s
          </button>
        </form>
        <form action={completeOnboarding} className="mt-2">
          <button type="submit" className="text-xs text-text-muted hover:underline">
            Später erledigen
          </button>
        </form>
      </section>
    </div>
  );
}
