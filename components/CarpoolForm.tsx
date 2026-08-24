"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createCarpool, type CarpoolFormState } from "@/app/dashboard/carpools/actions";

interface MatchOption {
  id: string;
  title: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-gradient-to-r from-primary-hover to-primary font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)] px-4 py-2.5 text-sm disabled:opacity-60 disabled:shadow-none"
    >
      {pending ? "Speichern..." : "Anbieten"}
    </button>
  );
}

export function CarpoolForm({
  matches,
  initialMatchId,
}: {
  matches: MatchOption[];
  initialMatchId?: string;
}) {
  const [state, formAction] = useFormState(createCarpool, {} as CarpoolFormState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="match_id" className="text-sm font-medium text-text">
          Spiel (optional)
        </label>
        <select
          id="match_id"
          name="match_id"
          defaultValue={initialMatchId ?? ""}
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="">Kein bestimmtes Spiel</option>
          {matches.map((match) => (
            <option key={match.id} value={match.id}>
              {match.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="total_seats" className="text-sm font-medium text-text">
          Freie Plätze
        </label>
        <input
          id="total_seats"
          name="total_seats"
          type="number"
          min={1}
          max={8}
          defaultValue={4}
          required
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="departure_point" className="text-sm font-medium text-text">
          Abfahrtsort
        </label>
        <input
          id="departure_point"
          name="departure_point"
          type="text"
          required
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="departure_time" className="text-sm font-medium text-text">
          Abfahrtszeit
        </label>
        <input
          id="departure_time"
          name="departure_time"
          type="datetime-local"
          required
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
