"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/image-compress";
import type { BoardMemberFormState } from "@/app/admin/board/actions";

interface BoardMemberInitialValues {
  display_name: string | null;
  position: string;
  responsibilities: string | null;
}

export function BoardMemberForm({
  action,
  initialValues,
  currentPhotoUrl,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<BoardMemberFormState>;
  initialValues?: BoardMemberInitialValues;
  currentPhotoUrl?: string | null;
  submitLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const fileInput = form.elements.namedItem("photo") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    formData.delete("photo");
    if (file) {
      try {
        const compressed = await compressImage(file);
        formData.append("photo", compressed, "photo.jpg");
      } catch {
        setError("Bildkomprimierung fehlgeschlagen.");
        setBusy(false);
        return;
      }
    }

    const result = await action(formData);
    if (result?.error) {
      setError(result.error);
      setBusy(false);
      return;
    }

    router.push("/admin/board");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="display_name" className="text-sm font-medium text-text">
          Name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          defaultValue={initialValues?.display_name ?? ""}
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="position" className="text-sm font-medium text-text">
          Position
        </label>
        <input
          id="position"
          name="position"
          type="text"
          required
          defaultValue={initialValues?.position}
          placeholder="z.B. 1. Vorsitzender"
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="responsibilities" className="text-sm font-medium text-text">
          Zuständigkeiten (optional)
        </label>
        <textarea
          id="responsibilities"
          name="responsibilities"
          rows={3}
          defaultValue={initialValues?.responsibilities ?? ""}
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="photo" className="text-sm font-medium text-text">
          Foto {currentPhotoUrl ? "(ersetzen, optional)" : "(optional)"}
        </label>
        {currentPhotoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentPhotoUrl} alt="Aktuelles Foto" className="h-20 w-20 rounded-full object-cover" />
        )}
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          className="text-sm text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-text"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-gradient-to-r from-primary-hover to-primary font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)] px-4 py-2.5 text-sm disabled:opacity-60 disabled:shadow-none"
      >
        {busy ? "Speichern..." : submitLabel}
      </button>
    </form>
  );
}
