"use client";

import { useState } from "react";
import { X, Download, Trash2 } from "lucide-react";
import { deleteGalleryPhoto } from "@/app/dashboard/gallery/actions";

export interface GalleryPhotoItem {
  id: string;
  url: string;
  caption: string | null;
}

// Der Bucket ist nicht public, die URLs zeigen also auf eine andere Origin
// (Supabase Storage). Das <a download>-Attribut wird von Browsern bei
// Cross-Origin-Links ignoriert (nur same-origin bzw. blob:-URLs erzwingen
// einen echten Download) -- daher hier Blob holen und darüber downloaden,
// damit ein normaler Linksklick genuegt (kein Rechtsklick-Workaround).
async function downloadImage(url: string, filename: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

export function GalleryGrid({
  photos,
  canManage,
}: {
  photos: GalleryPhotoItem[];
  canManage: boolean;
}) {
  const [selected, setSelected] = useState<GalleryPhotoItem | null>(null);

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setSelected(photo)}
            className="aspect-square overflow-hidden rounded-lg border border-border bg-surface-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.caption ?? ""}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/80 p-4"
          onClick={() => setSelected(null)}
        >
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="absolute right-4 top-4 text-white"
            aria-label="Schließen"
          >
            <X size={28} />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selected.url}
            alt={selected.caption ?? ""}
            className="max-h-[70vh] max-w-full rounded-lg object-contain"
            onClick={(event) => event.stopPropagation()}
          />

          <div
            className="flex flex-wrap items-center justify-center gap-3"
            onClick={(event) => event.stopPropagation()}
          >
            {selected.caption && (
              <p className="w-full text-center text-sm text-text">{selected.caption}</p>
            )}
            <button
              type="button"
              onClick={() => downloadImage(selected.url, `${selected.id}.jpg`)}
              className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-primary-hover to-primary font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)] px-3 py-1.5 text-sm"
            >
              <Download size={16} />
              Download
            </button>
            {canManage && (
              <form
                action={deleteGalleryPhoto.bind(null, selected.id)}
                onSubmit={(event) => {
                  if (!confirm("Bild wirklich löschen?")) {
                    event.preventDefault();
                  } else {
                    setSelected(null);
                  }
                }}
              >
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger-bg px-3 py-1.5 text-sm font-medium text-danger"
                >
                  <Trash2 size={16} />
                  Löschen
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
