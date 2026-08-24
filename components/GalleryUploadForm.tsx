"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { uploadGalleryPhoto } from "@/app/dashboard/gallery/actions";
import { compressImage } from "@/lib/image-compress";

export function GalleryUploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleUpload() {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) return;

    setBusy(true);
    setErrors([]);
    const collectedErrors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setStatus(`Lade Bild ${i + 1} von ${files.length} hoch: ${file.name}`);
      try {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append("file", compressed, "photo.jpg");
        formData.append("caption", caption);
        const result = await uploadGalleryPhoto(formData);
        if (result?.error) {
          collectedErrors.push(`${file.name}: ${result.error}`);
        }
      } catch {
        collectedErrors.push(`${file.name}: Komprimierung/Upload fehlgeschlagen.`);
      }
    }

    setStatus(`Fertig: ${files.length - collectedErrors.length} von ${files.length} Bildern hochgeladen.`);
    setErrors(collectedErrors);
    setBusy(false);
    setCaption("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-md bg-gradient-to-r from-primary-hover to-primary font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)] px-3 py-1.5 text-sm"
      >
        <Upload size={16} />
        Bilder hochladen
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-col gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={busy}
          className="text-sm text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-text"
        />
        <input
          type="text"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Beschreibung (optional, für alle ausgewählten Bilder)"
          disabled={busy}
          className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={busy}
            className="rounded-md bg-gradient-to-r from-primary-hover to-primary font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)] px-3 py-1.5 text-sm disabled:opacity-60 disabled:shadow-none"
          >
            {busy ? "Lädt hoch..." : "Hochladen"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={busy}
            className="text-sm text-text-muted hover:underline"
          >
            Abbrechen
          </button>
        </div>
        {status && <p className="text-sm text-text-muted">{status}</p>}
        {errors.length > 0 && (
          <ul className="list-inside list-disc text-sm text-danger">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
