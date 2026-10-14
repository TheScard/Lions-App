"use client";

import { useState, useTransition } from "react";
import type { NudgeResult } from "@/app/admin/trainings/actions";

/**
 * "Nachhaken"-Button fuer Trainings- und Spiel-Detailseiten. Client
 * Component mit direktem Aufruf der Server Action (kein <form action>),
 * damit die zurueckgegebene Meldung (Erfolg oder Fehler/Sperre) direkt
 * angezeigt werden kann.
 */
export function NudgeButton({ action }: { action: () => Promise<NudgeResult> }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run() {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      setMessage(result.error ?? result.message ?? null);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={run}
        className="self-start rounded-md border border-primary/40 px-4 py-2 text-sm font-bold uppercase tracking-wide text-primary transition hover:bg-primary/10 disabled:opacity-60"
      >
        {isPending ? "Sende..." : "Nachhaken"}
      </button>
      {message && <p className="text-xs text-text-muted">{message}</p>}
    </div>
  );
}
