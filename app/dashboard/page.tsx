import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { getTimeOfDayGreeting } from "@/lib/greeting";
import { isPast } from "@/lib/schedule";
import { setRsvp } from "@/app/dashboard/trainings/actions";
import { setMatchRsvp } from "@/app/dashboard/matches/actions";
import { dismissPinHint } from "@/app/dashboard/account/actions";
import { isSameLocalDay } from "@/lib/timezone";
import { getMemberTeamMap } from "@/lib/teams";
import { NextUpCard } from "@/components/NextUpCard";
import { RsvpSection } from "@/components/RsvpSection";
import { RsvpCount } from "@/components/RsvpCount";
import type { Database, RsvpStatus } from "@/types/database";

type Carpool = Database["public"]["Tables"]["carpools"]["Row"];

// Deckt realistisch jeden Fall ab, in dem mehrere Spiele/Trainings (z.B.
// Herren + U16) auf denselben Tag fallen, ohne unbegrenzt viele Zeilen zu
// laden -- die Liste wird direkt danach auf den gemeinsamen Kalendertag
// des jeweils naechsten Termins gefiltert.
const SAME_DAY_FETCH_LIMIT = 10;

export default async function DashboardHomePage() {
  const session = await requireSession();
  const supabase = await createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  // Team-Filterung (Herren sehen nur Herren, U16 nur U16) passiert bereits
  // ueber RLS fuer role "member" -- admin/vorstand/coach sehen dort immer
  // beide Teams, daher hier keine zusaetzliche App-seitige Einschraenkung.
  //
  // Alle unabhaengigen "naechste Termine"-Abfragen (inkl. der beiden
  // Carpool-Teilabfragen: als Fahrer und ueber eigene Buchungen) parallel
  // statt sequenziell -- nur die finale Carpool-Detailabfrage haengt vom
  // Ergebnis der Buchungs-IDs ab und folgt danach in einem zweiten Schritt.
  const [
    matchesRes,
    trainingsRes,
    eventRes,
    myTrainingRsvpsRes,
    myMatchRsvpsRes,
    driverCarpoolRes,
    bookingIdsRes,
    meRes,
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("*")
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(SAME_DAY_FETCH_LIMIT),
    supabase
      .from("trainings")
      .select("*")
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(SAME_DAY_FETCH_LIMIT),
    supabase
      .from("events")
      .select("*")
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from("training_rsvps").select("training_id, status").eq("member_id", session.memberId),
    supabase.from("match_rsvps").select("match_id, status").eq("member_id", session.memberId),
    supabase
      .from("carpools")
      .select("*")
      .eq("driver_id", session.memberId)
      .gte("departure_time", nowIso)
      .order("departure_time", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from("carpool_bookings").select("carpool_id").eq("member_id", session.memberId),
    supabase
      .from("members")
      .select("must_change_pin, team, onboarding_completed_at")
      .eq("id", session.memberId)
      .maybeSingle(),
  ]);

  // Erste-Schritte-Seite: nur hier auf der Startseite umgeleitet (nicht in
  // Middleware/Layout), damit /dashboard/start selbst und alle anderen
  // Seiten jederzeit direkt erreichbar bleiben.
  if (meRes.data && !meRes.data.onboarding_completed_at) {
    redirect("/dashboard/start");
  }

  const myTeam = meRes.data?.team ?? null;

  const bookedCarpoolIds = (bookingIdsRes.data ?? []).map((b) => b.carpool_id);
  const bookedCarpoolRes = bookedCarpoolIds.length
    ? await supabase
        .from("carpools")
        .select("*")
        .in("id", bookedCarpoolIds)
        .gte("departure_time", nowIso)
        .order("departure_time", { ascending: true })
        .limit(1)
        .maybeSingle()
    : { data: null };

  // Faellt der jeweils naechste Termin mit weiteren auf denselben Kalendertag
  // (z.B. Herren- und U16-Spiel am selben Tag), werden alle davon gezeigt,
  // nicht nur der zeitlich erste.
  const allMatches = matchesRes.data ?? [];
  const nextMatches = allMatches.length
    ? allMatches.filter((m) => isSameLocalDay(m.starts_at, allMatches[0].starts_at))
    : [];

  const allTrainings = trainingsRes.data ?? [];
  const nextTrainings = allTrainings.length
    ? allTrainings.filter((t) => isSameLocalDay(t.starts_at, allTrainings[0].starts_at))
    : [];

  const nextEvent = eventRes.data;

  // Naechste relevante Fahrt: falls das Mitglied sowohl eine eigene Fahrt
  // anbietet als auch bei einer anderen Fahrt mitfaehrt, gewinnt die
  // chronologisch naehere der beiden.
  const driverCandidate = driverCarpoolRes.data as Carpool | null;
  const bookedCandidate = bookedCarpoolRes.data as Carpool | null;
  let nextCarpool: (Carpool & { isDriving: boolean }) | null = null;
  if (driverCandidate && bookedCandidate) {
    nextCarpool =
      new Date(driverCandidate.departure_time).getTime() <=
      new Date(bookedCandidate.departure_time).getTime()
        ? { ...driverCandidate, isDriving: true }
        : { ...bookedCandidate, isDriving: false };
  } else if (driverCandidate) {
    nextCarpool = { ...driverCandidate, isDriving: true };
  } else if (bookedCandidate) {
    nextCarpool = { ...bookedCandidate, isDriving: false };
  }

  const myRsvpByTrainingId = new Map(
    (myTrainingRsvpsRes.data ?? []).map((r) => [r.training_id, r.status])
  );
  const myRsvpByMatchId = new Map((myMatchRsvpsRes.data ?? []).map((r) => [r.match_id, r.status]));

  // Zusagen-Anzahl fuer die Karten auf der Startseite -- nur fuer die
  // tatsaechlich angezeigten (naechsten) Termine abgefragt, nicht fuer alle
  // geladenen. Zaehlung beruecksichtigt nur Abstimmungen, deren
  // Mitglieds-Team (noch) zum Termin-Team passt (siehe checkRsvpEligibility()
  // in lib/rsvp.ts).
  const nextMatchIds = nextMatches.map((m) => m.id);
  const nextTrainingIds = nextTrainings.map((t) => t.id);
  const [matchRsvpsForCountRes, trainingRsvpsForCountRes] = await Promise.all([
    nextMatchIds.length
      ? supabase.from("match_rsvps").select("match_id, member_id, status").in("match_id", nextMatchIds)
      : Promise.resolve({ data: [] as { match_id: string; member_id: string; status: RsvpStatus }[] }),
    nextTrainingIds.length
      ? supabase
          .from("training_rsvps")
          .select("training_id, member_id, status")
          .in("training_id", nextTrainingIds)
      : Promise.resolve({ data: [] as { training_id: string; member_id: string; status: RsvpStatus | null }[] }),
  ]);

  const matchRsvpsForCount = matchRsvpsForCountRes.data ?? [];
  const trainingRsvpsForCount = trainingRsvpsForCountRes.data ?? [];
  const teamByMemberForCount = await getMemberTeamMap(
    supabase,
    Array.from(
      new Set([
        ...matchRsvpsForCount.map((r) => r.member_id),
        ...trainingRsvpsForCount.map((r) => r.member_id),
      ])
    )
  );

  const matchTeamById = new Map(nextMatches.map((m) => [m.id, m.team]));
  const trainingTeamById = new Map(nextTrainings.map((t) => [t.id, t.team]));

  const yesCountByMatch = new Map<string, number>();
  for (const rsvp of matchRsvpsForCount) {
    if (rsvp.status === "yes" && teamByMemberForCount.get(rsvp.member_id) === matchTeamById.get(rsvp.match_id)) {
      yesCountByMatch.set(rsvp.match_id, (yesCountByMatch.get(rsvp.match_id) ?? 0) + 1);
    }
  }
  const yesCountByTraining = new Map<string, number>();
  for (const rsvp of trainingRsvpsForCount) {
    if (
      rsvp.status === "yes" &&
      teamByMemberForCount.get(rsvp.member_id) === trainingTeamById.get(rsvp.training_id)
    ) {
      yesCountByTraining.set(rsvp.training_id, (yesCountByTraining.get(rsvp.training_id) ?? 0) + 1);
    }
  }

  const canSeeMin =
    session.role === "admin" || session.role === "vorstand" || session.role === "coach";

  const hasAnyNextUp = Boolean(
    nextMatches.length || nextTrainings.length || nextEvent || nextCarpool
  );
  const mustChangePin = meRes.data?.must_change_pin ?? false;

  return (
    <div className="flex flex-col gap-8">
      {mustChangePin && (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-gradient-to-br from-primary/15 to-transparent p-4 shadow-[0_0_32px_-10px_var(--color-primary)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text">
            Deine PIN wurde von einem Admin vergeben. Möchtest du jetzt eine eigene PIN wählen?
          </p>
          <div className="flex shrink-0 items-center gap-4">
            <Link href="/dashboard/account" className="text-sm font-bold text-primary hover:underline">
              Jetzt ändern
            </Link>
            <form action={dismissPinHint}>
              <button type="submit" className="text-sm text-text-muted hover:underline">
                Später
              </button>
            </form>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-3xl text-text">
          {getTimeOfDayGreeting()}, {session.name}!
        </h1>
        <p className="mt-1 text-sm text-text-muted">Willkommen zurück bei Lions Adenau.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-text-muted">
          Als Nächstes
        </h2>

        {!hasAnyNextUp && (
          <p className="text-sm text-text-muted">Aktuell stehen keine Termine an.</p>
        )}

        {nextMatches.map((match) => (
          <NextUpCard
            key={match.id}
            href={`/dashboard/matches/${match.id}`}
            kicker="Nächstes Spiel"
            title={match.title}
            dateTime={formatDateTime(match.starts_at)}
            location={match.location_name}
            team={match.team}
          >
            <div className="mt-1">
              <RsvpCount
                count={yesCountByMatch.get(match.id) ?? 0}
                min={match.min_participants}
                canSeeMin={canSeeMin}
                isFuture={!isPast(match.starts_at)}
              />
            </div>
            <div className="mt-3">
              <RsvpSection
                myTeam={myTeam}
                eventTeam={match.team}
                started={isPast(match.starts_at)}
                myStatus={myRsvpByMatchId.get(match.id) ?? null}
                yesAction={setMatchRsvp.bind(null, match.id, "yes")}
                noAction={setMatchRsvp.bind(null, match.id, "no")}
              />
            </div>
          </NextUpCard>
        ))}

        {nextTrainings.map((training) => (
          <NextUpCard
            key={training.id}
            href={`/dashboard/trainings/${training.id}`}
            kicker="Nächstes Training"
            title={training.title}
            dateTime={formatDateTime(training.starts_at)}
            location={training.location}
            team={training.team}
          >
            <div className="mt-1">
              <RsvpCount
                count={yesCountByTraining.get(training.id) ?? 0}
                min={training.min_participants}
                canSeeMin={canSeeMin}
                isFuture={!isPast(training.starts_at)}
              />
            </div>
            <div className="mt-3">
              <RsvpSection
                myTeam={myTeam}
                eventTeam={training.team}
                started={isPast(training.starts_at)}
                myStatus={myRsvpByTrainingId.get(training.id) ?? null}
                yesAction={setRsvp.bind(null, training.id, "yes")}
                noAction={setRsvp.bind(null, training.id, "no")}
              />
            </div>
          </NextUpCard>
        ))}

        {nextEvent && (
          <NextUpCard
            href={`/dashboard/events/${nextEvent.id}`}
            kicker="Nächstes Event"
            title={nextEvent.title}
            dateTime={formatDateTime(nextEvent.starts_at)}
            location={nextEvent.location}
          />
        )}

        {nextCarpool && (
          <NextUpCard
            href={
              nextCarpool.match_id
                ? `/dashboard/carpools?match_id=${nextCarpool.match_id}`
                : "/dashboard/carpools"
            }
            kicker="Nächste Fahrt"
            title={nextCarpool.isDriving ? "Deine Fahrt" : "Deine Mitfahrt"}
            dateTime={formatDateTime(nextCarpool.departure_time)}
            location={nextCarpool.departure_point}
          />
        )}
      </section>
    </div>
  );
}
