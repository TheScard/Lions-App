import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getInitials } from "@/lib/initials";

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 Stunde

export default async function BoardPage() {
  const supabase = await createServerSupabaseClient();

  const { data: boardMembersData } = await supabase
    .from("board_members")
    .select("*")
    .order("sort_order", { ascending: true });
  const boardMembers = boardMembersData ?? [];

  const memberIds = boardMembers
    .map((bm) => bm.member_id)
    .filter((id): id is string => Boolean(id));

  const { data: membersData } = memberIds.length
    ? await supabase.from("members").select("id, name").in("id", memberIds)
    : { data: [] as { id: string; name: string }[] };
  const nameById = new Map((membersData ?? []).map((m) => [m.id, m.name]));

  const entries = await Promise.all(
    boardMembers.map(async (bm) => {
      let photoUrl: string | null = null;
      if (bm.photo_url) {
        const { data: signed } = await supabase.storage
          .from("board-photos")
          .createSignedUrl(bm.photo_url, SIGNED_URL_EXPIRY_SECONDS);
        photoUrl = signed?.signedUrl ?? null;
      }
      const name = bm.member_id
        ? nameById.get(bm.member_id) ?? "Unbekannt"
        : bm.display_name ?? "Unbekannt";
      return { ...bm, name, photoUrl };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl text-text">Vorstand</h1>

      <div className="flex flex-col gap-4">
        {entries.length === 0 && (
          <p className="text-sm text-text-muted">Noch keine Vorstandsmitglieder hinterlegt.</p>
        )}
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="relative flex gap-4 overflow-hidden rounded-lg border border-border bg-surface py-4 pl-5 pr-4 shadow-lg shadow-black/30"
          >
            <span
              className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-primary-active"
              aria-hidden="true"
            />
            {entry.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.photoUrl}
                alt={entry.name}
                className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-primary/40"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-gradient-to-br from-primary/30 to-primary/5 font-heading text-lg italic font-bold text-primary">
                {getInitials(entry.name)}
              </div>
            )}
            <div>
              <p className="font-heading text-base italic font-bold uppercase tracking-wide text-text">
                {entry.name}
              </p>
              <p className="text-sm text-text-muted">{entry.position}</p>
              {entry.responsibilities && (
                <p className="mt-1 text-sm text-text-muted">{entry.responsibilities}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
