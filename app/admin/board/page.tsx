import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { deleteBoardMember, moveBoardMemberUp, moveBoardMemberDown } from "@/app/admin/board/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export default async function AdminBoardPage() {
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl text-text">Vorstand verwalten</h1>
        <Link
          href="/admin/board/new"
          className="rounded-md bg-gradient-to-r from-primary-hover to-primary font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)] px-3 py-1.5 text-sm"
        >
          + Neu
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {boardMembers.length === 0 && (
          <p className="text-sm text-text-muted">Noch keine Vorstandsmitglieder angelegt.</p>
        )}
        {boardMembers.map((bm, index) => {
          const name = bm.member_id
            ? nameById.get(bm.member_id) ?? "Unbekannt"
            : bm.display_name ?? "Unbekannt";
          return (
            <div key={bm.id} className="rounded-lg border border-border border-l-4 border-l-primary bg-surface p-4 shadow-lg shadow-black/30">
              <p className="font-heading text-base italic font-bold uppercase tracking-wide text-text">{name}</p>
              <p className="mt-1 text-sm text-text-muted">{bm.position}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <form action={moveBoardMemberUp.bind(null, bm.id)}>
                  <button
                    type="submit"
                    disabled={index === 0}
                    className="text-sm font-medium text-primary hover:underline disabled:opacity-30"
                  >
                    ↑ Nach oben
                  </button>
                </form>
                <form action={moveBoardMemberDown.bind(null, bm.id)}>
                  <button
                    type="submit"
                    disabled={index === boardMembers.length - 1}
                    className="text-sm font-medium text-primary hover:underline disabled:opacity-30"
                  >
                    ↓ Nach unten
                  </button>
                </form>
                <Link
                  href={`/admin/board/${bm.id}/edit`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Bearbeiten
                </Link>
                <ConfirmSubmitButton
                  action={deleteBoardMember.bind(null, bm.id)}
                  label="Löschen"
                  confirmMessage="Vorstandsmitglied wirklich löschen?"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
