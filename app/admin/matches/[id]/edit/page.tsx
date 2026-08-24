import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MatchForm } from "@/components/admin/MatchForm";
import { updateMatch } from "@/app/admin/matches/actions";

export default async function EditMatchPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!match) {
    notFound();
  }

  const action = updateMatch.bind(null, match.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl text-text">Spiel bearbeiten</h1>
      <MatchForm action={action} submitLabel="Speichern" initialValues={match} />
    </div>
  );
}
