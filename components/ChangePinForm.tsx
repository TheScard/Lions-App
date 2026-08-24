"use client";

import { useFormState, useFormStatus } from "react-dom";
import { changeOwnPin, type ChangePinState } from "@/app/dashboard/account/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-gradient-to-r from-primary-hover to-primary font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)] px-4 py-2.5 text-sm disabled:opacity-60 disabled:shadow-none"
    >
      {pending ? "Speichern..." : "PIN ändern"}
    </button>
  );
}

export function ChangePinForm() {
  const [state, formAction] = useFormState(changeOwnPin, {} as ChangePinState);

  if (state.success) {
    return (
      <div className="rounded-lg border border-primary/40 bg-gradient-to-br from-primary/15 to-transparent p-4 text-sm font-medium text-text shadow-[0_0_32px_-10px_var(--color-primary)]">
        Deine PIN wurde erfolgreich geändert.
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="current_pin" className="text-sm font-medium text-text">
          Aktuelle PIN
        </label>
        <input
          id="current_pin"
          name="current_pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          required
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="new_pin" className="text-sm font-medium text-text">
          Neue PIN (4–6 Ziffern)
        </label>
        <input
          id="new_pin"
          name="new_pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          required
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="new_pin_confirm" className="text-sm font-medium text-text">
          Neue PIN bestätigen
        </label>
        <input
          id="new_pin_confirm"
          name="new_pin_confirm"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          required
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
