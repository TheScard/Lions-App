import { MatchForm } from "@/components/admin/MatchForm";
import { createMatch } from "@/app/admin/matches/actions";

export default function NewMatchPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl text-text">Neues Spiel</h1>
      <MatchForm action={createMatch} submitLabel="Anlegen" />
    </div>
  );
}
