import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TrainingCard } from "@/components/TrainingCard";
import { TeamBadge } from "@/components/TeamBadge";
import { SectionKicker } from "@/components/SectionKicker";
import { formatDateTime } from "@/lib/format";
import { getMemberTeamMap } from "@/lib/teams";
import type { Database, RsvpStatus } from "@/types/database";

type Training = Database["public"]["Tables"]["trainings"]["Row"];
const PAST_WINDOW_DAYS = 30;

export default async function TrainingsPage() {
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
  // ein klarer Hinweis. admin/vorstand sehen ohnehin immer beide Teams.
  if (session.role === "member" && !myTeam) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl text-text">Training</h1>
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
          Dir wurde noch kein Team zugewiesen, bitte wende dich an den Vorstand.
        </p>
      </div>
    );
  }

  const { data: trainingsData } = await supabase
    .from("trainings")
    .select("*")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });
  const trainings: Training[] = trainingsData ?? [];

  const trainingTeamById = new Map(trainings.map((t) => [t.id, t.team]));
  const trainingIds = trainings.map((t) => t.id);
  const { data: rsvpsData } = trainingIds.length
    ? await supabase
        .from("training_rsvps")
        .select("training_id, member_id, status")
        .in("training_id", trainingIds)
    : { data: [] as { training_id: string; member_id: string; status: RsvpStatus | null }[] };

  const rsvps = rsvpsData ?? [];
  // Zaehlung/eigener Status beruecksichtigen nur Abstimmungen, deren
  // Mitglieds-Team (noch) zum Termin-Team passt -- siehe
  // checkRsvpEligibility() fuer die Schreibseite derselben Regel.
  const teamByMember = await getMemberTeamMap(
    supabase,
    Array.from(new Set(rsvps.map((r) => r.member_id)))
  );

  const yesCountByTraining = new Map<string, number>();
  const myStatusByTraining = new Map<string, RsvpStatus>();
  for (const rsvp of rsvps) {
    if (teamByMember.get(rsvp.member_id) !== trainingTeamById.get(rsvp.training_id)) {
      continue;
    }
    if (rsvp.status === "yes") {
      yesCountByTraining.set(rsvp.training_id, (yesCountByTraining.get(rsvp.training_id) ?? 0) + 1);
    }
    if (rsvp.member_id === session.memberId && rsvp.status) {
      myStatusByTraining.set(rsvp.training_id, rsvp.status);
    }
  }

  const canManage =
    session.role === "admin" || session.role === "vorstand" || session.role === "coach";

  let pastTrainings: Training[] = [];
  if (canManage) {
    const windowStart = new Date(Date.now() - PAST_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: pastData } = await supabase
      .from("trainings")
      .select("*")
      .lt("starts_at", new Date().toISOString())
      .gte("starts_at", windowStart)
      .order("starts_at", { ascending: false });
    pastTrainings = pastData ?? [];
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl text-text">Training</h1>

      <section className="flex flex-col gap-3">
        {trainings.length === 0 ? (
          <p className="text-sm text-text-muted">Keine anstehenden Trainings.</p>
        ) : (
          trainings.map((training) => (
            <TrainingCard
              key={training.id}
              training={training}
              yesCount={yesCountByTraining.get(training.id) ?? 0}
              myStatus={myStatusByTraining.get(training.id) ?? null}
              myTeam={myTeam}
              canViewRsvps={canManage}
            />
          ))
        )}
      </section>

      {canManage && (
        <section className="flex flex-col gap-3">
          <SectionKicker label="Vergangen – Teilnahme erfassen" />
          {pastTrainings.length === 0 ? (
            <p className="text-sm text-text-muted">
              Keine Trainings der letzten {PAST_WINDOW_DAYS} Tage.
            </p>
          ) : (
            pastTrainings.map((training) => (
              <Link
                key={training.id}
                href={`/dashboard/trainings/${training.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3 text-sm transition hover:border-primary/50"
              >
                <div>
                  <p className="font-medium text-text">{training.title}</p>
                  <p className="mt-0.5 text-text-muted">{formatDateTime(training.starts_at)}</p>
                </div>
                <TeamBadge team={training.team} />
              </Link>
            ))
          )}
        </section>
      )}
    </div>
  );
}
