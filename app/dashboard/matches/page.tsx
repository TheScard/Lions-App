import { requireSession } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MatchCard } from "@/components/MatchCard";
import { splitUpcomingPast } from "@/lib/schedule";
import { SectionKicker } from "@/components/SectionKicker";
import { getMemberTeamMap } from "@/lib/teams";
import type { RsvpStatus } from "@/types/database";

export default async function MatchesPage() {
  const session = await requireSession();
  const supabase = await createServerSupabaseClient();

  const { data: me } = await supabase
    .from("members")
    .select("team")
    .eq("id", session.memberId)
    .maybeSingle();
  const myTeam = me?.team ?? null;

  // Reine Mitglieder ohne zugewiesenes Team wuerden sonst nur eine leere
  // Liste sehen (RLS liefert fuer team = NULL keine Zeilen) -- stattdessen
  // ein klarer Hinweis. admin/vorstand sehen ohnehin immer beide Teams,
  // fuer sie ist ein fehlendes eigenes team irrelevant.
  if (session.role === "member" && !myTeam) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl text-text">Kalender</h1>
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
          Dir wurde noch kein Team zugewiesen, bitte wende dich an den Vorstand.
        </p>
      </div>
    );
  }

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("starts_at", { ascending: true });

  const { upcoming, past } = splitUpcomingPast(matches ?? [], "starts_at");

  const matchTeamById = new Map((matches ?? []).map((m) => [m.id, m.team]));
  const matchIds = (matches ?? []).map((m) => m.id);
  const { data: rsvpsData } = matchIds.length
    ? await supabase.from("match_rsvps").select("match_id, member_id, status").in("match_id", matchIds)
    : { data: [] as { match_id: string; member_id: string; status: RsvpStatus }[] };

  const rsvps = rsvpsData ?? [];
  // Zaehlung/eigener Status beruecksichtigen nur Abstimmungen, deren
  // Mitglieds-Team (noch) zum Termin-Team passt -- siehe
  // checkRsvpEligibility() fuer die Schreibseite derselben Regel.
  const teamByMember = await getMemberTeamMap(
    supabase,
    Array.from(new Set(rsvps.map((r) => r.member_id)))
  );

  const yesCountByMatch = new Map<string, number>();
  const myStatusByMatch = new Map<string, RsvpStatus>();
  for (const rsvp of rsvps) {
    if (teamByMember.get(rsvp.member_id) !== matchTeamById.get(rsvp.match_id)) {
      continue;
    }
    if (rsvp.status === "yes") {
      yesCountByMatch.set(rsvp.match_id, (yesCountByMatch.get(rsvp.match_id) ?? 0) + 1);
    }
    if (rsvp.member_id === session.memberId) {
      myStatusByMatch.set(rsvp.match_id, rsvp.status);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl text-text">Kalender</h1>

      <section className="flex flex-col gap-3">
        <SectionKicker label="Anstehend" accent />
        {upcoming.length === 0 ? (
          <p className="text-sm text-text-muted">Keine anstehenden Spiele.</p>
        ) : (
          upcoming.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              yesCount={yesCountByMatch.get(match.id) ?? 0}
              myStatus={myStatusByMatch.get(match.id) ?? null}
              myTeam={myTeam}
            />
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionKicker label="Vergangen" />
        {past.length === 0 ? (
          <p className="text-sm text-text-muted">Noch keine vergangenen Spiele.</p>
        ) : (
          past.map((match) => (
            <MatchCard key={match.id} match={match} yesCount={0} myStatus={null} myTeam={myTeam} />
          ))
        )}
      </section>
    </div>
  );
}
