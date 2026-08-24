import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { TeamBadge } from "@/components/TeamBadge";
import { AttendanceCheckbox } from "@/components/AttendanceCheckbox";
import { AddAttendanceMember } from "@/components/AddAttendanceMember";
import { setTrainingAttendance, addTrainingAttendance } from "@/app/dashboard/trainings/actions";
import type { RsvpStatus } from "@/types/database";

const STATUS_LABELS: Record<RsvpStatus, string> = { yes: "Zugesagt", no: "Abgesagt" };

export default async function TrainingDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
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
    .select("member_id, status, attended")
    .eq("training_id", params.id);

  const yesMemberIds = (rsvps ?? []).filter((r) => r.status === "yes").map((r) => r.member_id);
  const { data: yesMembers } = yesMemberIds.length
    ? await supabase.from("members").select("id, name").in("id", yesMemberIds)
    : { data: [] as { id: string; name: string }[] };
  const yesNames = (yesMembers ?? []).map((m) => m.name).sort((a, b) => a.localeCompare(b, "de"));

  const canManage =
    session.role === "admin" || session.role === "vorstand" || session.role === "coach";

  let attendanceRows: { memberId: string; name: string; status: RsvpStatus; attended: boolean }[] =
    [];
  let addableMembers: { id: string; name: string }[] = [];
  let myAttended = false;

  if (canManage) {
    const rsvpMemberIds = (rsvps ?? []).map((r) => r.member_id);
    const [{ data: rsvpMembers }, { data: teamMembers }] = await Promise.all([
      rsvpMemberIds.length
        ? supabase.from("members").select("id, name").in("id", rsvpMemberIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      supabase.from("members").select("id, name").eq("team", training.team),
    ]);

    const nameById = new Map((rsvpMembers ?? []).map((m) => [m.id, m.name]));
    attendanceRows = (rsvps ?? [])
      .map((r) => ({
        memberId: r.member_id,
        name: nameById.get(r.member_id) ?? "Unbekannt",
        status: r.status,
        attended: r.attended ?? false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));

    const rsvpMemberIdSet = new Set(rsvpMemberIds);
    addableMembers = (teamMembers ?? [])
      .filter((m) => !rsvpMemberIdSet.has(m.id))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  } else {
    myAttended = (rsvps ?? []).find((r) => r.member_id === session.memberId)?.attended === true;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl text-text">{training.title}</h1>
          <TeamBadge team={training.team} />
        </div>
        <p className="mt-1 text-sm text-text-muted">{formatDateTime(training.starts_at)}</p>
        {training.location && <p className="mt-1 text-sm text-text-muted">{training.location}</p>}
        {!canManage && myAttended && (
          <span className="mt-2 inline-block rounded-full border border-primary/40 bg-gradient-to-r from-primary/25 to-primary/5 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-primary">
            Teilgenommen
          </span>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-text-muted">
          Zusagen ({yesNames.length})
        </p>
        {yesNames.length === 0 ? (
          <p className="mt-1 text-sm text-text-muted">Noch keine Zusagen.</p>
        ) : (
          <ul className="mt-2 list-inside list-disc text-sm text-text">
            {yesNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        )}
      </div>

      {canManage && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Anwesenheit erfassen</p>

          {attendanceRows.length === 0 ? (
            <p className="mt-2 text-sm text-text-muted">Noch keine Zu-/Absagen.</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {attendanceRows.map((row) => (
                <div key={row.memberId} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-text">{row.name}</p>
                    <p className="text-xs text-text-muted">{STATUS_LABELS[row.status]}</p>
                  </div>
                  <AttendanceCheckbox
                    checked={row.attended}
                    onToggle={setTrainingAttendance.bind(null, training.id, row.memberId)}
                    label="war anwesend"
                  />
                </div>
              ))}
            </div>
          )}

          {addableMembers.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="mb-2 text-xs text-text-muted">Mitglied ohne Zusage hinzufügen</p>
              <AddAttendanceMember
                options={addableMembers}
                onAdd={addTrainingAttendance.bind(null, training.id)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
