"use client";

import { useState, useTransition } from "react";
import type { RsvpStatus } from "@/types/database";
import type { RsvpResult } from "@/lib/rsvp";

/**
 * Zusagen/Absagen-Buttons, gemeinsam von TrainingCard und MatchCard
 * verwendet -- das Verhalten soll sich bei Trainings und Spielen identisch
 * anfuehlen.
 *
 * Client Component mit direktem Aufruf der Server Actions (statt <form
 * action={...}>): yesAction/noAction sind bereits gebundene Server Actions
 * (z.B. setRsvp.bind(null, trainingId, "yes")) und duerfen als Prop an eine
 * Client Component uebergeben werden -- das ist der von Next.js
 * unterstuetzte Fall. NICHT in eine neue, nicht als Server Action markierte
 * Closure einwickeln (z.B. `async () => { await yesAction(); }` als
 * <form action>), das verursacht einen Runtime-Fehler ("Functions cannot be
 * passed directly to Client Components..."), weil die neue Closure keine
 * gueltige Server-Action-Referenz mehr ist.
 *
 * Direkter Aufruf statt <form> erlaubt zusaetzlich, die zurueckgegebene
 * Fehlermeldung (RsvpResult.error) anzuzeigen und die Buttons waehrend des
 * Speicherns zu deaktivieren.
 */
export function RsvpButtons({
  myStatus,
  yesAction,
  noAction,
}: {
  myStatus: RsvpStatus | null;
  yesAction: () => Promise<RsvpResult>;
  noAction: () => Promise<RsvpResult>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function vote(action: () => Promise<RsvpResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => vote(yesAction)}
          className={`rounded-md px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition disabled:opacity-60 ${
            myStatus === "yes"
              ? "bg-gradient-to-r from-primary-hover to-primary text-bg shadow-[0_4px_14px_-4px_var(--color-primary)]"
              : "border border-border text-text-muted hover:border-primary/50 hover:text-text"
          }`}
        >
          Zusagen
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => vote(noAction)}
          className={`rounded-md px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition disabled:opacity-60 ${
            myStatus === "no"
              ? "border border-danger/40 bg-danger-bg text-danger"
              : "border border-border text-text-muted hover:border-primary/50 hover:text-text"
          }`}
        >
          Absagen
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
