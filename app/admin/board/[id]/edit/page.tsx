import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BoardMemberForm } from "@/components/admin/BoardMemberForm";
import { updateBoardMember } from "@/app/admin/board/actions";

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

export default async function EditBoardMemberPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();

  const { data: boardMember } = await supabase
    .from("board_members")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!boardMember) {
    notFound();
  }

  let photoUrl: string | null = null;
  if (boardMember.photo_url) {
    const { data: signed } = await supabase.storage
      .from("board-photos")
      .createSignedUrl(boardMember.photo_url, SIGNED_URL_EXPIRY_SECONDS);
    photoUrl = signed?.signedUrl ?? null;
  }

  const action = updateBoardMember.bind(null, boardMember.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl text-text">Vorstandsmitglied bearbeiten</h1>
      <BoardMemberForm
        action={action}
        submitLabel="Speichern"
        initialValues={boardMember}
        currentPhotoUrl={photoUrl}
      />
    </div>
  );
}
