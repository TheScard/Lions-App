import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateTime, mapsUrl } from "@/lib/format";
import { isPast } from "@/lib/schedule";
import { sortAttendanceRows, type AttendanceRow } from "@/lib/attendance";
import { TeamBadge } from "@/components/TeamBadge";
import { AttendanceEditor } from "@/components/AttendanceEditor";
import { RsvpSection } from "@/components/RsvpSection";
import { RsvpCount } from "@/components/RsvpCount";
import { NudgeButton } from "@/components/NudgeButton";
import { setMatchRsvp, saveMatchAttendance } from "@/app/dashboard/matches/actions";
import { nudgeMatch } from "@/app/admin/matches/actions";
import type { RsvpStatus } from "@/types/database";

export default async function MatchDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const supabase = await createServerSupabaseClient();
  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!match) {
    notFound();
  }

  const { data: me } = await supabase
    .from("members")
    .select("team")
    .eq("id", session.memberId)
    .maybeSingle();
  const myTeam = me?.team ?? null;

  const { data: rsvps } = await supabase
    .from("match_rsvps")
    .select("member_id, status")
    .eq("match_id", params.id);

  // Zusagen-Liste zaehlt nur Mitglieder, deren Team (noch) zum Spiel-Team
  // passt -- Abstimmungen anderer Mitglieder werden ignoriert, aber nicht
  // geloescht (siehe checkRsvpEligibility() in lib/rsvp.ts).
  const yesMemberIdsRaw = (rsvps ?? []).filter((r) => r.status === "yes").map((r) => r.member_id);
  const { data: yesMembersRaw } = yesMemberIdsRaw.length
    ? await supabase.from("members").select("id, name, team").in("id", yesMemberIdsRaw)
    : { data: [] as { id: string; name: string; team: string | null }[] };
  const yesNames = (yesMembersRaw ?? [])
    .filter((m) => m.team === match.team)
    .map((m) => m.name)
    .sort((a, b) => a.localeCompare(b, "de"));

  const myStatus = (rsvps ?? []).find((r) => r.member_id === session.memberId)?.status as
    | RsvpStatus
    | undefined;
  const matchStarted = isPast(match.starts_at);

  const canManage =
    session.role === "admin" || session.role === "vorstand" || session.role === "coach";

  let teamRows: AttendanceRow[] = [];
  let otherRows: AttendanceRow[] = [];
  let myAttended = false;

  if (canManage && matchStarted) {
    const statusByMember = new Map((rsvps ?? []).map((r) => [r.member_id, r.status as RsvpStatus]));
    const [{ data: allMembers }, { data: attendance }] = await Promise.all([
      supabase.from("members").select("id, name, team"),
      supabase.from("match_attendance").select("member_id, attended").eq("match_id", params.id),
    ]);

    const attendedByMember = new Map((attendance ?? []).map((a) => [a.member_id, a.attended]));
    const toRow = (m: { id: string; name: string }): AttendanceRow => ({
      memberId: m.id,
      name: m.name,
      rsvpStatus: statusByMember.get(m.id) ?? null,
      attended: attendedByMember.get(m.id) ?? statusByMember.get(m.id) === "yes",
    });

    teamRows = sortAttendanceRows((allMembers ?? []).filter((m) => m.team === match.team).map(toRow));
    otherRows = sortAttendanceRows((allMembers ?? []).filter((m) => m.team !== match.team).map(toRow));
  } else if (!canManage) {
    const { data: myAttendance } = await supabase
      .from("match_attendance")
      .select("member_id")
      .eq("match_id", params.id)
      .eq("member_id", session.memberId)
      .maybeSingle();
    myAttended = Boolean(myAttendance);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl text-text">{match.title}</h1>
          <TeamBadge team={match.team} />
        </div>
        <p className="mt-1 text-sm text-text-muted">{formatDateTime(match.starts_at)}</p>
        {!canManage && myAttended && (
          <span className="mt-2 inline-block rounded-full border border-primary/40 bg-gradient-to-r from-primary/25 to-primary/5 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-primary">
            Teilgenommen
          </span>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-text-muted">Ort</p>
        <p className="mt-1 font-medium text-text">{match.location_name}</p>
        <a
          href={mapsUrl(match.location_address)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-sm text-primary underline underline-offset-2"
        >
          {match.location_address}
        </a>
      </div>

      {isPast(match.starts_at) && match.result && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Ergebnis</p>
          <p className="mt-1 font-medium text-text">{match.result}</p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-4">
        <RsvpCount
          count={yesNames.length}
          min={match.min_participants}
          canSeeMin={canManage}
          isFuture={!matchStarted}
        />
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
            eventTeam={match.team}
            started={matchStarted}
            myStatus={myStatus ?? null}
            yesAction={setMatchRsvp.bind(null, match.id, "yes")}
            noAction={setMatchRsvp.bind(null, match.id, "no")}
          />
        </div>

        {canManage &&
          !matchStarted &&
          match.min_participants !== null &&
          yesNames.length < match.min_participants && (
            <div className="mt-3 border-t border-border pt-3">
              <NudgeButton action={nudgeMatch.bind(null, match.id)} />
              {match.last_nudge_at && (
                <p className="mt-1 text-xs text-text-muted">
                  Zuletzt nachgehakt: {formatDateTime(match.last_nudge_at)}
                </p>
              )}
            </div>
          )}
      </div>

      {canManage && matchStarted && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-text-muted">Teilnahme erfassen</p>
          <AttendanceEditor
            rows={teamRows}
            extraRows={otherRows}
            saveAction={saveMatchAttendance.bind(null, match.id)}
          />
        </div>
      )}

      {canManage && !matchStarted && (
        <p className="rounded-xl border border-dashed border-border bg-surface p-4 text-sm text-text-muted">
          Die Teilnahme kann erst nach Spielbeginn erfasst werden.
        </p>
      )}

      <Link
        href={`/dashboard/carpools?match_id=${match.id}`}
        className="rounded-xl border border-dashed border-primary/40 bg-surface p-4 text-center text-sm font-medium text-primary"
      >
        Fahrgemeinschaften zu diesem Spiel ansehen
      </Link>
    </div>
  );
}
