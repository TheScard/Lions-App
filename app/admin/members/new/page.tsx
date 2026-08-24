import { NewMemberForm } from "@/components/admin/NewMemberForm";

export default function NewMemberPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl text-text">Neues Mitglied</h1>
      <NewMemberForm />
    </div>
  );
}
