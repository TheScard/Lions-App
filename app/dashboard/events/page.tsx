import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EventCard } from "@/components/EventCard";
import { splitUpcomingPast } from "@/lib/schedule";
import { SectionKicker } from "@/components/SectionKicker";

export default async function EventsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: true });

  const { upcoming, past } = splitUpcomingPast(events ?? [], "starts_at");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl text-text">Events</h1>

      <section className="flex flex-col gap-3">
        <SectionKicker label="Anstehend" accent />
        {upcoming.length === 0 ? (
          <p className="text-sm text-text-muted">Keine anstehenden Events.</p>
        ) : (
          upcoming.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionKicker label="Vergangen" />
        {past.length === 0 ? (
          <p className="text-sm text-text-muted">Noch keine vergangenen Events.</p>
        ) : (
          past.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </section>
    </div>
  );
}
