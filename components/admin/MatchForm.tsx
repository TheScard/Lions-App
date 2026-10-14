"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { MatchFormState } from "@/app/admin/matches/actions";
import { parseLocalInputAsUtc, toLocalInputValue } from "@/lib/timezone";
import { DEFAULT_MIN_MATCH } from "@/lib/config";
import type { Team } from "@/types/database";

interface MatchFormValues {
  title: string;
  location_name: string;
  location_address: string;
  starts_at: string; // ISO
  result: string | null;
  team: Team;
  min_participants?: number | null;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-gradient-to-r from-primary-hover to-primary font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)] px-4 py-2.5 text-sm disabled:opacity-60 disabled:shadow-none"
    >
      {pending ? "Speichern..." : label}
    </button>
  );
}

export function MatchForm({
  action,
  initialValues,
  submitLabel,
}: {
  action: (prevState: MatchFormState, formData: FormData) => Promise<MatchFormState>;
  initialValues?: MatchFormValues;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, {});
  const [startsAtValue, setStartsAtValue] = useState(toLocalInputValue(initialValues?.starts_at));

  // Ergebnis darf erst nach dem Spieltermin eingetragen werden -- reagiert
  // live auf Aenderungen am Datum/Uhrzeit-Feld, nicht nur auf den initialen Wert.
  const isPast = startsAtValue !== "" && parseLocalInputAsUtc(startsAtValue).getTime() < Date.now();

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="team" className="text-sm font-medium text-text">
          Team
        </label>
        <select
          id="team"
          name="team"
          required
          defaultValue={initialValues?.team ?? "herren"}
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="herren">Herren</option>
          <option value="u16">U16</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium text-text">
          Titel
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initialValues?.title}
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="location_name" className="text-sm font-medium text-text">
          Ort (Name)
        </label>
        <input
          id="location_name"
          name="location_name"
          type="text"
          required
          defaultValue={initialValues?.location_name}
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="location_address" className="text-sm font-medium text-text">
          Adresse
        </label>
        <input
          id="location_address"
          name="location_address"
          type="text"
          required
          defaultValue={initialValues?.location_address}
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="starts_at" className="text-sm font-medium text-text">
          Datum &amp; Uhrzeit
        </label>
        <input
          id="starts_at"
          name="starts_at"
          type="datetime-local"
          required
          value={startsAtValue}
          onChange={(event) => setStartsAtValue(event.target.value)}
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="result" className="text-sm font-medium text-text">
          Ergebnis (optional)
        </label>
        <input
          id="result"
          name="result"
          type="text"
          disabled={!isPast}
          defaultValue={initialValues?.result ?? ""}
          placeholder="z.B. 78:65"
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        />
        {!isPast && (
          <p className="text-xs text-text-muted">
            Ergebnis kann erst nach dem Spieltermin eingetragen werden.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="min_participants" className="text-sm font-medium text-text">
          Mindestanzahl Zusagen (optional)
        </label>
        <input
          id="min_participants"
          name="min_participants"
          type="number"
          min={1}
          max={30}
          step={1}
          defaultValue={
            initialValues ? initialValues.min_participants ?? "" : DEFAULT_MIN_MATCH
          }
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton label={submitLabel} />
    </form>
  );
}
