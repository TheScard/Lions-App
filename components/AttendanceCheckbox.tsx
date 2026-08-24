"use client";

import { useTransition } from "react";

export function AttendanceCheckbox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: (attended: boolean) => Promise<void>;
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-text">
      <input
        type="checkbox"
        defaultChecked={checked}
        disabled={isPending}
        onChange={(event) => {
          const attended = event.target.checked;
          startTransition(() => {
            onToggle(attended);
          });
        }}
        className="h-4 w-4 accent-primary disabled:opacity-50"
      />
      {label}
    </label>
  );
}
