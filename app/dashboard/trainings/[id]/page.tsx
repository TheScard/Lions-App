import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { isPast } from "@/lib/schedule";
import { sortAttendanceRows, type AttendanceRow } from "@/lib/attendance";
import { TeamBadge } from "@/components/TeamBadge";
import { AttendanceEditor } from "@/components/AttendanceEditor";
import { RsvpSection } from "@/components/RsvpSection";
import { saveTrainingAttendance, setRsvp } from "@/app/dashboard/trainings/actions";
import type { RsvpStatus } from "@/types/database";

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

  const { data: me } = await supabase
    .from("members")
    .select("team")
    .eq("id", session.memberId)
    .maybeSingle();
  const myTeam = me?.team ?? null;

  const { data: rsvps } = await supabase
    .from("training_rsvps")
    .select("member_id, status, attended")
    .eq("training_id", params.id);

  // Zusagen-Liste zaehlt nur Mitglieder, deren Team (noch) zum
  // Trainings-Team passt -- siehe checkRsvpEligibility() in lib/rsvp.ts.
  const yesMemberIdsRaw = (rsvps ?? []).filter((r) => r.status === "yes").map((r) => r.member_id);
  const { data: yesMembersRaw } = yesMemberIdsRaw.length
    ? await supabase.from("members").select("id, name, team").in("id", yesMemberIdsRaw)
    : { data: [] as { id: string; name: string; team: string | null }[] };
  const yesNames = (yesMembersRaw ?? [])
    .filter((m) => m.team === training.team)
    .map((m) => m.name)
    .sort((a, b) => a.localeCompare(b, "de"));

  const myStatus = (rsvps ?? []).find((r) => r.member_id === session.memberId)?.status as
    | RsvpStatus
    | undefined;
  const trainingStarted = isPast(training.starts_at);
  const canManage =
    session.role === "admin" || session.role === "vorstand" || session.role === "coach";

  let teamRows: AttendanceRow[] = [];
  let otherRows: AttendanceRow[] = [];
  let myAttended = false;

  if (canManage && trainingStarted) {
    const statusByMember = new Map(
      (rsvps ?? []).map((r) => [r.member_id, r.status as RsvpStatus | null])
    );
    const attendedByMember = new Map((rsvps ?? []).map((r) => [r.member_id, r.attended]));
    const { data: allMembers } = await supabase.from("members").select("id, name, team");

    const toRow = (m: { id: string; name: string }): AttendanceRow => ({
      memberId: m.id,
      name: m.name,
      rsvpStatus: statusByMember.get(m.id) ?? null,
      attended: attendedByMember.get(m.id) ?? statusByMember.get(m.id) === "yes",
    });

    teamRows = sortAttendanceRows(
      (allMembers ?? []).filter((m) => m.team === training.team).map(toRow)
    );
    otherRows = sortAttendanceRows(
      (allMembers ?? []).filter((m) => m.team !== training.team).map(toRow)
    );
  } else if (!canManage) {
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
        <div className="mt-3">
          <RsvpSection
            myTeam={myTeam}
            eventTeam={training.team}
            started={trainingStarted}
            myStatus={myStatus ?? null}
            yesAction={setRsvp.bind(null, training.id, "yes")}
            noAction={setRsvp.bind(null, training.id, "no")}
          />
        </div>
      </div>

      {canManage && trainingStarted && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-text-muted">Teilnahme erfassen</p>
          <AttendanceEditor
            rows={teamRows}
            extraRows={otherRows}
            saveAction={saveTrainingAttendance.bind(null, training.id)}
          />
        </div>
      )}

      {canManage && !trainingStarted && (
        <p className="rounded-xl border border-dashed border-border bg-surface p-4 text-sm text-text-muted">
          Die Teilnahme kann erst nach Trainingsbeginn erfasst werden.
        </p>
      )}
    </div>
  );
}
