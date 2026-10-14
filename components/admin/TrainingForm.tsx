"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { TrainingFormState } from "@/app/admin/trainings/actions";
import { toLocalInputValue } from "@/lib/timezone";
import { DEFAULT_MIN_TRAINING } from "@/lib/config";
import type { Team } from "@/types/database";

interface TrainingFormValues {
  title: string;
  location: string | null;
  starts_at: string; // ISO
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

export function TrainingForm({
  action,
  initialValues,
  submitLabel,
}: {
  action: (prevState: TrainingFormState, formData: FormData) => Promise<TrainingFormState>;
  initialValues?: TrainingFormValues;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, {});

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
        <label htmlFor="location" className="text-sm font-medium text-text">
          Ort (optional)
        </label>
        <input
          id="location"
          name="location"
          type="text"
          defaultValue={initialValues?.location ?? ""}
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
          defaultValue={toLocalInputValue(initialValues?.starts_at)}
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
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
            initialValues
              ? initialValues.min_participants ?? ""
              : DEFAULT_MIN_TRAINING
          }
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {!initialValues && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="repeat_until" className="text-sm font-medium text-text">
            Wiederholen bis (optional)
          </label>
          <input
            id="repeat_until"
            name="repeat_until"
            type="date"
            className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <p className="text-xs text-text-muted">
            Legt bis zu diesem Datum automatisch woechentlich ein Training zum selben Wochentag/Uhrzeit an. Jedes
            Training ist danach einzeln bearbeit- und loeschbar.
          </p>
        </div>
      )}

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton label={submitLabel} />
    </form>
  );
}
