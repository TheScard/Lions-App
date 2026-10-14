import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentSeasonYear, seasonLabel, seasonRange, seasonYearOf } from "@/lib/season";
import { StatBar } from "@/components/admin/StatBar";
import type { Team } from "@/types/database";

const TEAMS: Team[] = ["herren", "u16"];
const TEAM_LABEL: Record<Team, string> = { herren: "Herren", u16: "U16" };

interface PlayerRow {
  id: string;
  name: string;
  trainingsAttended: number;
  trainingTotal: number;
  matchesAttended: number;
  matchTotal: number;
  missed: number;
}

export default async function StatistikPage({
  searchParams,
}: {
  searchParams: { season?: string; team?: string; sort?: string };
}) {
  // Nur lesend -- Rollenpruefung serverseitig, Aggregation ueber den
  // Service-Role-Client (die Rolle ist hier bereits geprueft).
  const session = await requireRole(["admin", "vorstand", "coach"]);
  const admin = createAdminClient();

  // Verfuegbare Saisons: alle Saisonjahre, in denen (bei irgendeinem Team)
  // Termine existieren, plus immer die aktuelle Saison (auch ohne
  // Termine), damit die Auswahl nie leer ist. Zwei leichte Spalten-only-
  // Abfragen statt einer Query je Saison/Team (keine N+1).
  const [{ data: trainingDates }, { data: matchDates }] = await Promise.all([
    admin.from("trainings").select("starts_at"),
    admin.from("matches").select("starts_at"),
  ]);
  const seasonYearsWithEvents = new Set(
    [...(trainingDates ?? []), ...(matchDates ?? [])].map((row) => seasonYearOf(row.starts_at))
  );
  const current = currentSeasonYear();
  seasonYearsWithEvents.add(current);
  const availableSeasons = Array.from(seasonYearsWithEvents).sort((a, b) => b - a);

  const requestedSeason = Number(searchParams.season);
  const season = availableSeasons.includes(requestedSeason) ? requestedSeason : current;

  const { data: me } = await admin
    .from("members")
    .select("team")
    .eq("id", session.memberId)
    .maybeSingle();
  const defaultTeam: Team = me?.team ?? "herren";
  const team: Team = TEAMS.includes(searchParams.team as Team)
    ? (searchParams.team as Team)
    : defaultTeam;

  const sortBy = searchParams.sort === "name" ? "name" : "quote";
  const { start, end } = seasonRange(season);
  const nowIso = new Date().toISOString();

  // Nur Termine, die schon begonnen haben -- kuenftige Termine koennen noch
  // keine Teilnahme erfasst haben und wuerden die Quote nur verwaessern.
  const [{ data: trainings }, { data: matches }, { data: teamMembers }] = await Promise.all([
    admin
      .from("trainings")
      .select("id")
      .eq("team", team)
      .gte("starts_at", start)
      .lt("starts_at", end)
      .lte("starts_at", nowIso),
    admin
      .from("matches")
      .select("id")
      .eq("team", team)
      .gte("starts_at", start)
      .lt("starts_at", end)
      .lte("starts_at", nowIso),
    admin.from("members").select("id, name").eq("team", team),
  ]);

  const trainingIds = (trainings ?? []).map((t) => t.id);
  const matchIds = (matches ?? []).map((m) => m.id);

  const [{ data: trainingRsvps }, { data: matchAttendance }, { data: matchRsvps }] = await Promise.all([
    trainingIds.length
      ? admin
          .from("training_rsvps")
          .select("member_id, status, attended, training_id")
          .in("training_id", trainingIds)
      : Promise.resolve({ data: [] as { member_id: string; status: string | null; attended: boolean | null; training_id: string }[] }),
    matchIds.length
      ? admin.from("match_attendance").select("member_id, attended, match_id").in("match_id", matchIds)
      : Promise.resolve({ data: [] as { member_id: string; attended: boolean; match_id: string }[] }),
    matchIds.length
      ? admin.from("match_rsvps").select("member_id, status, match_id").in("match_id", matchIds)
      : Promise.resolve({ data: [] as { member_id: string; status: string; match_id: string }[] }),
  ]);

  // "Erfasst" = mindestens ein Eintrag mit gesetzter Teilnahme. Nicht
  // erfasste Termine fliessen nicht in die Quote ein (siehe Hinweis unten).
  const recordedTrainingIds = new Set(
    (trainingRsvps ?? []).filter((r) => r.attended !== null).map((r) => r.training_id)
  );
  const recordedMatchIds = new Set((matchAttendance ?? []).map((a) => a.match_id));

  const trainingTotal = recordedTrainingIds.size;
  const matchTotal = recordedMatchIds.size;
  const unrecordedTrainings = trainingIds.length - trainingTotal;
  const unrecordedMatches = matchIds.length - matchTotal;

  const trainingsAttendedByMember = new Map<string, number>();
  let totalTrainingAttendance = 0;
  for (const r of trainingRsvps ?? []) {
    if (recordedTrainingIds.has(r.training_id) && r.attended === true) {
      trainingsAttendedByMember.set(r.member_id, (trainingsAttendedByMember.get(r.member_id) ?? 0) + 1);
      totalTrainingAttendance++;
    }
  }

  const matchesAttendedByMember = new Map<string, number>();
  let totalMatchAttendance = 0;
  const matchAttendedKey = new Set<string>();
  for (const a of matchAttendance ?? []) {
    matchAttendedKey.add(`${a.member_id}:${a.match_id}`);
    if (a.attended === true) {
      matchesAttendedByMember.set(a.member_id, (matchesAttendedByMember.get(a.member_id) ?? 0) + 1);
      totalMatchAttendance++;
    }
  }

  // "Zugesagt, aber nicht erschienen": Training direkt ueber attended=false
  // bei status=yes; Spiel ueber eine explizite match_attendance-Zeile mit
  // attended=false zu einer Zusage (keine Zeile = nicht erfasst, nicht
  // automatisch "nicht erschienen").
  const missedByMember = new Map<string, number>();
  for (const r of trainingRsvps ?? []) {
    if (r.status === "yes" && r.attended === false) {
      missedByMember.set(r.member_id, (missedByMember.get(r.member_id) ?? 0) + 1);
    }
  }
  const matchAttendedFalseKey = new Set(
    (matchAttendance ?? []).filter((a) => a.attended === false).map((a) => `${a.member_id}:${a.match_id}`)
  );
  for (const r of matchRsvps ?? []) {
    if (r.status === "yes" && matchAttendedFalseKey.has(`${r.member_id}:${r.match_id}`)) {
      missedByMember.set(r.member_id, (missedByMember.get(r.member_id) ?? 0) + 1);
    }
  }

  const players: PlayerRow[] = (teamMembers ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    trainingsAttended: trainingsAttendedByMember.get(m.id) ?? 0,
    trainingTotal,
    matchesAttended: matchesAttendedByMember.get(m.id) ?? 0,
    matchTotal,
    missed: missedByMember.get(m.id) ?? 0,
  }));

  const sortedPlayers = [...players].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name, "de");
    const quoteA = a.trainingTotal > 0 ? a.trainingsAttended / a.trainingTotal : -1;
    const quoteB = b.trainingTotal > 0 ? b.trainingsAttended / b.trainingTotal : -1;
    if (quoteB !== quoteA) return quoteB - quoteA;
    return a.name.localeCompare(b.name, "de");
  });

  const avgTrainingAttendance = trainingTotal > 0 ? totalTrainingAttendance / trainingTotal : 0;
  const avgMatchAttendance = matchTotal > 0 ? totalMatchAttendance / matchTotal : 0;

  const otherSort = sortBy === "quote" ? "name" : "quote";
  const baseQuery = `season=${season}&team=${team}`;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl text-text">Anwesenheits-Statistik</h1>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form method="GET" className="flex items-center gap-2">
          <input type="hidden" name="team" value={team} />
          <select
            name="season"
            defaultValue={season}
            className="appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {availableSeasons.map((year) => (
              <option key={year} value={year}>
                {seasonLabel(year)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-text-muted transition hover:border-primary/50 hover:text-text"
          >
            Anzeigen
          </button>
        </form>

        <div className="flex gap-2">
          {TEAMS.map((t) => (
            <Link
              key={t}
              href={`/admin/statistik?season=${season}&team=${t}`}
              className={`rounded-md px-3 py-2 text-sm font-bold uppercase tracking-wide transition ${
                t === team
                  ? "bg-gradient-to-r from-primary-hover to-primary text-bg"
                  : "border border-border text-text-muted hover:border-primary/50 hover:text-text"
              }`}
            >
              {TEAM_LABEL[t]}
            </Link>
          ))}
        </div>
      </div>

      <p className="text-sm text-text-muted">{seasonLabel(season)}</p>

      {(unrecordedTrainings > 0 || unrecordedMatches > 0) && (
        <p className="rounded-lg border border-dashed border-border bg-surface p-3 text-xs text-text-muted">
          {unrecordedTrainings > 0 &&
            `${unrecordedTrainings} Training${unrecordedTrainings === 1 ? "" : "s"} ohne Erfassung, nicht eingerechnet.`}
          {unrecordedTrainings > 0 && unrecordedMatches > 0 && " "}
          {unrecordedMatches > 0 &&
            `${unrecordedMatches} Spiel${unrecordedMatches === 1 ? "" : "e"} ohne Erfassung, nicht eingerechnet.`}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs uppercase tracking-wide text-text-muted">Erfasste Trainings</p>
          <p className="mt-1 text-xl font-bold text-text">{trainingTotal}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs uppercase tracking-wide text-text-muted">Ø Teilnehmer/Training</p>
          <p className="mt-1 text-xl font-bold text-text">{avgTrainingAttendance.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs uppercase tracking-wide text-text-muted">Erfasste Spiele</p>
          <p className="mt-1 text-xl font-bold text-text">{matchTotal}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs uppercase tracking-wide text-text-muted">Ø Teilnehmer/Spiel</p>
          <p className="mt-1 text-xl font-bold text-text">{avgMatchAttendance.toFixed(1)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-text-muted">
          Sortiert nach {sortBy === "name" ? "Name" : "Trainingsquote"}
        </p>
        <Link
          href={`/admin/statistik?${baseQuery}&sort=${otherSort}`}
          className="text-xs font-medium text-primary hover:underline"
        >
          Nach {otherSort === "name" ? "Name" : "Trainingsquote"} sortieren
        </Link>
      </div>

      {sortedPlayers.length === 0 ? (
        <p className="text-sm text-text-muted">Diesem Team sind keine Mitglieder zugewiesen.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-text-muted">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Training</th>
                <th className="px-3 py-2">Spiele</th>
                <th className="px-3 py-2">Zugesagt, nicht da</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player) => {
                const trainingPercent =
                  player.trainingTotal > 0
                    ? Math.round((player.trainingsAttended / player.trainingTotal) * 100)
                    : null;
                const matchPercent =
                  player.matchTotal > 0
                    ? Math.round((player.matchesAttended / player.matchTotal) * 100)
                    : null;
                return (
                  <tr key={player.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium text-text">{player.name}</td>
                    <td className="px-3 py-2 text-text-muted">
                      {trainingPercent === null ? (
                        "–"
                      ) : (
                        <>
                          {player.trainingsAttended} von {player.trainingTotal} ({trainingPercent}%)
                          <StatBar percent={trainingPercent} />
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2 text-text-muted">
                      {matchPercent === null ? (
                        "–"
                      ) : (
                        <>
                          {player.matchesAttended} von {player.matchTotal} ({matchPercent}%)
                          <StatBar percent={matchPercent} />
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2 text-text-muted">{player.missed}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
