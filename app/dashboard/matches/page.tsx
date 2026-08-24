import { requireSession } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MatchCard } from "@/components/MatchCard";
import { splitUpcomingPast } from "@/lib/schedule";
import { SectionKicker } from "@/components/SectionKicker";

export default async function MatchesPage() {
  const session = await requireSession();
  const supabase = await createServerSupabaseClient();

  // Reine Mitglieder ohne zugewiesenes Team wuerden sonst nur eine leere
  // Liste sehen (RLS liefert fuer team = NULL keine Zeilen) -- stattdessen
  // ein klarer Hinweis. admin/vorstand sehen ohnehin immer beide Teams,
  // fuer sie ist ein fehlendes eigenes team irrelevant.
  if (session.role === "member") {
    const { data: me } = await supabase
      .from("members")
      .select("team")
      .eq("id", session.memberId)
      .maybeSingle();

    if (!me?.team) {
      return (
        <div className="flex flex-col gap-6">
          <h1 className="text-3xl text-text">Kalender</h1>
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
            Dir wurde noch kein Team zugewiesen, bitte wende dich an den Vorstand.
          </p>
        </div>
      );
    }
  }

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("starts_at", { ascending: true });

  const { upcoming, past } = splitUpcomingPast(matches ?? [], "starts_at");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl text-text">Kalender</h1>

      <section className="flex flex-col gap-3">
        <SectionKicker label="Anstehend" accent />
        {upcoming.length === 0 ? (
          <p className="text-sm text-text-muted">Keine anstehenden Spiele.</p>
        ) : (
          upcoming.map((match) => <MatchCard key={match.id} match={match} />)
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionKicker label="Vergangen" />
        {past.length === 0 ? (
          <p className="text-sm text-text-muted">Noch keine vergangenen Spiele.</p>
        ) : (
          past.map((match) => <MatchCard key={match.id} match={match} />)
        )}
      </section>
    </div>
  );
}
