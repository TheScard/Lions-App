import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateTime, mapsUrl } from "@/lib/format";
import { isPast } from "@/lib/schedule";
import { TeamBadge } from "@/components/TeamBadge";
import { AttendanceCheckbox } from "@/components/AttendanceCheckbox";
import { setMatchAttendance } from "@/app/dashboard/matches/actions";

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

  const canManage =
    session.role === "admin" || session.role === "vorstand" || session.role === "coach";

  let teamAttendance: { memberId: string; name: string; attended: boolean }[] = [];
  let myAttended = false;

  if (canManage) {
    const [{ data: teamMembers }, { data: attendance }] = await Promise.all([
      supabase.from("members").select("id, name").eq("team", match.team),
      supabase.from("match_attendance").select("member_id").eq("match_id", params.id),
    ]);

    const attendedMemberIds = new Set((attendance ?? []).map((a) => a.member_id));
    teamAttendance = (teamMembers ?? [])
      .map((m) => ({ memberId: m.id, name: m.name, attended: attendedMemberIds.has(m.id) }))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  } else {
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

      {canManage && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Teilnahme erfassen</p>
          {teamAttendance.length === 0 ? (
            <p className="mt-2 text-sm text-text-muted">Diesem Team sind noch keine Mitglieder zugewiesen.</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {teamAttendance.map((row) => (
                <div key={row.memberId} className="flex items-center justify-between gap-2">
                  <p className="text-sm text-text">{row.name}</p>
                  <AttendanceCheckbox
                    checked={row.attended}
                    onToggle={setMatchAttendance.bind(null, match.id, row.memberId)}
                    label="hat teilgenommen"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
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
