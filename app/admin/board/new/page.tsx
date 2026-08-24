import { BoardMemberForm } from "@/components/admin/BoardMemberForm";
import { createBoardMember } from "@/app/admin/board/actions";

export default function NewBoardMemberPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl text-text">Neues Vorstandsmitglied</h1>
      <BoardMemberForm action={createBoardMember} submitLabel="Anlegen" />
    </div>
  );
}
