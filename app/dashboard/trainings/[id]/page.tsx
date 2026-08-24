import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { TeamBadge } from "@/components/TeamBadge";

export default async function TrainingDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: training } = await supabase
    .from("trainings")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!training) {
    notFound();
  }

  const { data: rsvps } = await supabase
    .from("training_rsvps")
    .select("member_id")
    .eq("training_id", params.id)
    .eq("status", "yes");

  const memberIds = (rsvps ?? []).map((r) => r.member_id);
  const { data: members } = memberIds.length
    ? await supabase.from("members").select("id, name").in("id", memberIds)
    : { data: [] as { id: string; name: string }[] };

  const names = (members ?? []).map((m) => m.name).sort((a, b) => a.localeCompare(b, "de"));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl text-text">{training.title}</h1>
          <TeamBadge team={training.team} />
        </div>
        <p className="mt-1 text-sm text-text-muted">{formatDateTime(training.starts_at)}</p>
        {training.location && <p className="mt-1 text-sm text-text-muted">{training.location}</p>}
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-text-muted">
          Zusagen ({names.length})
        </p>
        {names.length === 0 ? (
          <p className="mt-1 text-sm text-text-muted">Noch keine Zusagen.</p>
        ) : (
          <ul className="mt-2 list-inside list-disc text-sm text-text">
            {names.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
