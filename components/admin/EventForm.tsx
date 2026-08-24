"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { EventFormState } from "@/app/admin/events/actions";
import { toLocalInputValue } from "@/lib/timezone";

interface EventFormValues {
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string; // ISO
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

export function EventForm({
  action,
  initialValues,
  submitLabel,
}: {
  action: (prevState: EventFormState, formData: FormData) => Promise<EventFormState>;
  initialValues?: EventFormValues;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
        <label htmlFor="description" className="text-sm font-medium text-text">
          Beschreibung (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={initialValues?.description ?? ""}
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton label={submitLabel} />
    </form>
  );
}
