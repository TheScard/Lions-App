"use client";

import { useFormState, useFormStatus } from "react-dom";
import { resetPin, type ResetPinState } from "@/app/admin/members/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm font-medium text-primary hover:underline disabled:opacity-60"
    >
      {pending ? "..." : "PIN zurücksetzen"}
    </button>
  );
}

export function ResetPinButton({ memberId }: { memberId: string }) {
  const action = resetPin.bind(null, memberId);
  const [state, formAction] = useFormState(action, {} as ResetPinState);

  if (state.pin) {
    return (
      <div className="rounded-md border border-primary/40 bg-gradient-to-br from-primary/15 to-transparent px-3 py-2 text-sm shadow-[0_0_20px_-8px_var(--color-primary)]">
        <p>
          Neuer PIN: <span className="font-bold tracking-widest text-primary">{state.pin}</span>
        </p>
        <p className="mt-1 text-xs text-danger">Jetzt notieren – wird nicht erneut angezeigt.</p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!confirm("PIN wirklich zurücksetzen? Der alte PIN wird ungültig.")) {
          event.preventDefault();
        }
      }}
    >
      <SubmitButton />
      {state.error && <p className="mt-1 text-xs text-danger">{state.error}</p>}
    </form>
  );
}
