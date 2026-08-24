import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CarpoolForm } from "@/components/CarpoolForm";

export default async function NewCarpoolPage({
  searchParams,
}: {
  searchParams: { match_id?: string };
}) {
  const supabase = await createServerSupabaseClient();
  const { data: matches } = await supabase
    .from("matches")
    .select("id, title")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl text-text">Neue Fahrt anbieten</h1>
      <CarpoolForm matches={matches ?? []} initialMatchId={searchParams.match_id} />
    </div>
  );
}
