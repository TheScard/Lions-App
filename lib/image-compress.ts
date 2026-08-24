export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
}

/**
 * Verkleinert/komprimiert ein Bild client-seitig vor dem Upload (Canvas
 * API, keine zusaetzliche Library). Reduziert Speicherverbrauch im
 * Supabase-Storage (Free-Plan: 1 GB insgesamt).
 */
export async function compressImage(
  file: File,
  { maxDimension = 1600, quality = 0.8 }: CompressOptions = {}
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas-Kontext nicht verfügbar.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Bildkomprimierung fehlgeschlagen."));
      },
      "image/jpeg",
      quality
    );
  });
}
