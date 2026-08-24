"use client";

import { useState, useTransition } from "react";

export function AddAttendanceMember({
  options,
  onAdd,
}: {
  options: { id: string; name: string }[];
  onAdd: (memberId: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState(options[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  if (options.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        className="appearance-none rounded-lg border border-border bg-surface-2 px-2 py-1 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={isPending || !selected}
        onClick={() => startTransition(() => onAdd(selected))}
        className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
      >
        Hinzufügen
      </button>
    </div>
  );
}
