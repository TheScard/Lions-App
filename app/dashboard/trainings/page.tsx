import { requireSession } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TrainingCard } from "@/components/TrainingCard";
import { splitUpcomingPast } from "@/lib/schedule";
import { getAdminOwnTeam } from "@/lib/team";
import type { Database, RsvpStatus } from "@/types/database";
import { SectionKicker } from "@/components/SectionKicker";

type Training = Database["public"]["Tables"]["trainings"]["Row"];

export default async function TrainingsPage() {
  const session = await requireSession();
  const supabase = await createServerSupabaseClient();

  // Reine Mitglieder ohne zugewiesenes Team wuerden sonst nur eine leere
  // Liste sehen (RLS liefert fuer team = NULL keine Zeilen) -- stattdessen
  // ein klarer Hinweis. admin/vorstand sehen ohnehin immer beide Teams.
  if (session.role === "member") {
    const { data: me } = await supabase
      .from("members")
      .select("team")
      .eq("id", session.memberId)
      .maybeSingle();

    if (!me?.team) {
      return (
        <div className="flex flex-col gap-6">
          <h1 className="text-3xl text-text">Training</h1>
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
            Dir wurde noch kein Team zugewiesen, bitte wende dich an den Vorstand.
          </p>
        </div>
      );
    }
  }

  const { data: trainingsData } = await supabase
    .from("trainings")
    .select("*")
    .order("starts_at", { ascending: true });

  // Admins verwalten im Admin-Bereich weiterhin beide Teams, sehen hier
  // aber -- wie normale Mitglieder -- nur ihr eigenes Team (falls zugewiesen).
  const adminOwnTeam = await getAdminOwnTeam(session, supabase);
  const trainings: Training[] = adminOwnTeam
    ? (trainingsData ?? []).filter((t) => t.team === adminOwnTeam)
    : trainingsData ?? [];

  const trainingIds = trainings.map((t) => t.id);
  const { data: rsvpsData } = trainingIds.length
    ? await supabase
        .from("training_rsvps")
        .select("training_id, member_id, status")
        .in("training_id", trainingIds)
    : { data: [] as { training_id: string; member_id: string; status: RsvpStatus }[] };

  const rsvps = rsvpsData ?? [];
  const yesCountByTraining = new Map<string, number>();
  const myStatusByTraining = new Map<string, RsvpStatus>();
  for (const rsvp of rsvps) {
    if (rsvp.status === "yes") {
      yesCountByTraining.set(rsvp.training_id, (yesCountByTraining.get(rsvp.training_id) ?? 0) + 1);
    }
    if (rsvp.member_id === session.memberId) {
      myStatusByTraining.set(rsvp.training_id, rsvp.status);
    }
  }

  const { upcoming, past } = splitUpcomingPast(trainings, "starts_at");
  const canViewRsvps = session.role === "admin" || session.role === "vorstand";

  function renderCard(training: Training) {
    return (
      <TrainingCard
        key={training.id}
        training={training}
        yesCount={yesCountByTraining.get(training.id) ?? 0}
        myStatus={myStatusByTraining.get(training.id) ?? null}
        canViewRsvps={canViewRsvps}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl text-text">Training</h1>

      <section className="flex flex-col gap-3">
        <SectionKicker label="Anstehend" accent />
        {upcoming.length === 0 ? (
          <p className="text-sm text-text-muted">Keine anstehenden Trainings.</p>
        ) : (
          upcoming.map(renderCard)
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionKicker label="Vergangen" />
        {past.length === 0 ? (
          <p className="text-sm text-text-muted">Noch keine vergangenen Trainings.</p>
        ) : (
          past.map(renderCard)
        )}
      </section>
    </div>
  );
}
