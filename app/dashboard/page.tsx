import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { getTimeOfDayGreeting } from "@/lib/greeting";
import { setRsvp } from "@/app/dashboard/trainings/actions";
import { dismissPinHint } from "@/app/dashboard/account/actions";
import { getAdminOwnTeam } from "@/lib/team";
import { NextUpCard } from "@/components/NextUpCard";
import type { Database } from "@/types/database";

type Carpool = Database["public"]["Tables"]["carpools"]["Row"];

export default async function DashboardHomePage() {
  const session = await requireSession();
  const supabase = await createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  // Admins verwalten im Admin-Bereich weiterhin beide Teams, sehen "Als
  // Naechstes" aber -- wie normale Mitglieder -- nur ihr eigenes Team
  // (falls zugewiesen). Muss vor den naechsten Termin-Abfragen bekannt
  // sein, da .limit(1) sonst faelschlicherweise das global naechste statt
  // das naechste eigene Spiel/Training liefern wuerde.
  const adminOwnTeam = await getAdminOwnTeam(session, supabase);

  // Alle unabhaengigen "naechster Termin"-Abfragen (inkl. der beiden
  // Carpool-Teilabfragen: als Fahrer und ueber eigene Buchungen) parallel
  // statt sequenziell -- nur die finale Carpool-Detailabfrage haengt vom
  // Ergebnis der Buchungs-IDs ab und folgt danach in einem zweiten Schritt.
  const [matchRes, trainingRes, eventRes, myRsvpsRes, driverCarpoolRes, bookingIdsRes, meRes] =
    await Promise.all([
      (() => {
        let query = supabase.from("matches").select("*").gte("starts_at", nowIso);
        if (adminOwnTeam) query = query.eq("team", adminOwnTeam);
        return query.order("starts_at", { ascending: true }).limit(1).maybeSingle();
      })(),
      (() => {
        let query = supabase.from("trainings").select("*").gte("starts_at", nowIso);
        if (adminOwnTeam) query = query.eq("team", adminOwnTeam);
        return query.order("starts_at", { ascending: true }).limit(1).maybeSingle();
      })(),
      supabase
        .from("events")
        .select("*")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase.from("training_rsvps").select("training_id, status").eq("member_id", session.memberId),
      supabase
        .from("carpools")
        .select("*")
        .eq("driver_id", session.memberId)
        .gte("departure_time", nowIso)
        .order("departure_time", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase.from("carpool_bookings").select("carpool_id").eq("member_id", session.memberId),
      supabase.from("members").select("must_change_pin").eq("id", session.memberId).maybeSingle(),
    ]);

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

  const nextMatch = matchRes.data;
  const nextTraining = trainingRes.data;
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

  const myTrainingRsvp = nextTraining
    ? (myRsvpsRes.data ?? []).find((r) => r.training_id === nextTraining.id)
    : undefined;

  const hasAnyNextUp = Boolean(nextMatch || nextTraining || nextEvent || nextCarpool);
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

        {nextMatch && (
          <NextUpCard
            href={`/dashboard/matches/${nextMatch.id}`}
            kicker="Nächstes Spiel"
            title={nextMatch.title}
            dateTime={formatDateTime(nextMatch.starts_at)}
            location={nextMatch.location_name}
          />
        )}

        {nextTraining && (
          <NextUpCard
            href={`/dashboard/trainings/${nextTraining.id}`}
            kicker="Nächstes Training"
            title={nextTraining.title}
            dateTime={formatDateTime(nextTraining.starts_at)}
            location={nextTraining.location}
          >
            <div className="mt-3">
              {myTrainingRsvp?.status === "yes" ? (
                <p className="text-sm font-medium text-primary">Du hast zugesagt</p>
              ) : myTrainingRsvp?.status === "no" ? (
                <p className="text-sm font-medium text-text-muted">Du hast abgesagt</p>
              ) : (
                <form action={setRsvp.bind(null, nextTraining.id, "yes")}>
                  <button
                    type="submit"
                    className="rounded-md bg-gradient-to-r from-primary-hover to-primary px-3 py-1.5 font-heading text-sm italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_14px_-4px_var(--color-primary)] transition hover:brightness-105"
                  >
                    Zusagen
                  </button>
                </form>
              )}
            </div>
          </NextUpCard>
        )}

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
