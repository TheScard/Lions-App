"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { createMember, type CreateMemberState } from "@/app/admin/members/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-gradient-to-r from-primary-hover to-primary font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)] px-4 py-2.5 text-sm disabled:opacity-60 disabled:shadow-none"
    >
      {pending ? "Anlegen..." : "Anlegen"}
    </button>
  );
}

export function NewMemberForm() {
  const [state, formAction] = useFormState(createMember, {} as CreateMemberState);

  if (state.createdPin) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-primary/40 bg-gradient-to-br from-primary/15 to-transparent p-4 shadow-[0_0_32px_-10px_var(--color-primary)]">
        <p className="font-heading tracking-wide text-text">
          Mitglied „{state.createdName}&quot; wurde angelegt.
        </p>
        <div className="rounded-lg bg-surface p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-text-muted">PIN</p>
          <p className="mt-1 text-3xl font-bold tracking-widest text-primary">{state.createdPin}</p>
        </div>
        <p className="text-sm font-medium text-danger">
          Diesen PIN jetzt notieren/weitergeben – er wird nicht erneut angezeigt!
        </p>
        <Link
          href="/admin/members"
          className="rounded-md bg-gradient-to-r from-primary-hover to-primary font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)] px-4 py-2.5 text-center text-sm"
        >
          Zur Mitgliederliste
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-text">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="role" className="text-sm font-medium text-text">
          Rolle
        </label>
        <select
          id="role"
          name="role"
          defaultValue="member"
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="member">Mitglied</option>
          <option value="vorstand">Vorstand</option>
          <option value="coach">Coach</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="team" className="text-sm font-medium text-text">
          Team
        </label>
        <select
          id="team"
          name="team"
          defaultValue=""
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="">Kein Team</option>
          <option value="herren">Herren</option>
          <option value="u16">U16</option>
        </select>
      </div>

      <p className="text-xs text-text-muted">
        Der PIN wird automatisch generiert und nach dem Anlegen einmalig angezeigt.
      </p>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
