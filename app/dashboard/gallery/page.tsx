import { requireSession } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GalleryGrid, type GalleryPhotoItem } from "@/components/GalleryGrid";
import { GalleryUploadForm } from "@/components/GalleryUploadForm";

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 Stunde

export default async function GalleryPage() {
  const session = await requireSession();
  const supabase = await createServerSupabaseClient();
  const canManage = session.role === "admin" || session.role === "vorstand";

  const { data: photosData } = await supabase
    .from("gallery_photos")
    .select("id, storage_path, caption, created_at")
    .order("created_at", { ascending: false });

  const photos = photosData ?? [];

  const withUrls: GalleryPhotoItem[] = await Promise.all(
    photos.map(async (photo) => {
      const { data: signed } = await supabase.storage
        .from("gallery")
        .createSignedUrl(photo.storage_path, SIGNED_URL_EXPIRY_SECONDS);
      return {
        id: photo.id,
        url: signed?.signedUrl ?? "",
        caption: photo.caption,
      };
    })
  );

  const validPhotos = withUrls.filter((photo) => photo.url);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl text-text">Galerie</h1>
        {canManage && <GalleryUploadForm />}
      </div>

      {validPhotos.length === 0 ? (
        <p className="text-sm text-text-muted">Noch keine Fotos hochgeladen.</p>
      ) : (
        <GalleryGrid photos={validPhotos} canManage={canManage} />
      )}
    </div>
  );
}
