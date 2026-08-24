import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export default async function TrainingRsvpsPage({ params }: { params: { id: string } }) {
  await requireRole(["admin", "vorstand"]);

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
    .select("member_id, status")
    .eq("training_id", params.id);

  const memberIds = (rsvps ?? []).map((r) => r.member_id);
  const { data: members } = memberIds.length
    ? await supabase.from("members").select("id, name").in("id", memberIds)
    : { data: [] as { id: string; name: string }[] };

  const nameById = new Map((members ?? []).map((m) => [m.id, m.name]));
  const byStatus = (status: "yes" | "no") =>
    (rsvps ?? [])
      .filter((r) => r.status === status)
      .map((r) => nameById.get(r.member_id) ?? "Unbekannt")
      .sort((a, b) => a.localeCompare(b, "de"));

  const confirmed = byStatus("yes");
  const declined = byStatus("no");

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/trainings" className="text-sm font-medium text-primary hover:underline">
        ← Zurück zu Trainings
      </Link>

      <div>
        <h1 className="text-xl text-text">{training.title}</h1>
        <p className="mt-1 text-sm text-text-muted">{formatDateTime(training.starts_at)}</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-text-muted">Zugesagt ({confirmed.length})</p>
        {confirmed.length === 0 ? (
          <p className="mt-1 text-sm text-text-muted">Noch keine Zusagen.</p>
        ) : (
          <ul className="mt-2 list-inside list-disc text-sm text-text">
            {confirmed.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-text-muted">Abgesagt ({declined.length})</p>
        {declined.length === 0 ? (
          <p className="mt-1 text-sm text-text-muted">Noch keine Absagen.</p>
        ) : (
          <ul className="mt-2 list-inside list-disc text-sm text-text">
            {declined.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
