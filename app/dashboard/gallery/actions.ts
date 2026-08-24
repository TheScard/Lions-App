"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface UploadResult {
  error?: string;
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB Sicherheitsnetz (nach Client-Kompression i.d.R. weit kleiner)

/**
 * Laedt EIN (bereits client-seitig komprimiertes) Bild hoch. Rolle wird
 * hier serverseitig geprueft -- unabhaengig davon, ob der Upload-Button im
 * Frontend ueberhaupt sichtbar war (requireRole leitet sonst um).
 */
export async function uploadGalleryPhoto(formData: FormData): Promise<UploadResult> {
  const session = await requireRole(["admin", "vorstand", "coach"]);

  const file = formData.get("file");
  const caption = String(formData.get("caption") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Keine Datei erhalten." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Datei zu groß (max. 5 MB)." };
  }

  const supabase = await createServerSupabaseClient();
  const path = `${randomUUID()}.jpg`;

  const { error: uploadError } = await supabase.storage.from("gallery").upload(path, file, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (uploadError) {
    return { error: "Upload fehlgeschlagen: " + uploadError.message };
  }

  const { error: insertError } = await supabase.from("gallery_photos").insert({
    storage_path: path,
    caption: caption || null,
    uploaded_by: session.memberId,
  });
  if (insertError) {
    // Datei liegt schon im Storage, aber ohne DB-Eintrag -- aufraeumen.
    await supabase.storage.from("gallery").remove([path]);
    return { error: "Speichern in der Datenbank fehlgeschlagen: " + insertError.message };
  }

  revalidatePath("/dashboard/gallery");
  return {};
}

export async function deleteGalleryPhoto(photoId: string): Promise<void> {
  await requireRole(["admin", "vorstand", "coach"]);
  const supabase = await createServerSupabaseClient();

  const { data: photo } = await supabase
    .from("gallery_photos")
    .select("storage_path")
    .eq("id", photoId)
    .maybeSingle();

  if (!photo) return;

  await supabase.storage.from("gallery").remove([photo.storage_path]);
  await supabase.from("gallery_photos").delete().eq("id", photoId);

  revalidatePath("/dashboard/gallery");
}
