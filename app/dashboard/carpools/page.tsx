import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CarpoolCard } from "@/components/CarpoolCard";
import type { Database } from "@/types/database";

type Carpool = Database["public"]["Tables"]["carpools"]["Row"];

export default async function CarpoolsPage({
  searchParams,
}: {
  searchParams: { match_id?: string; bookingError?: string };
}) {
  const session = await requireSession();
  const supabase = await createServerSupabaseClient();
  const matchId = searchParams.match_id ?? null;

  let carpoolsQuery = supabase
    .from("carpools")
    .select("*")
    .gte("departure_time", new Date().toISOString())
    .order("departure_time", { ascending: true });
  if (matchId) {
    carpoolsQuery = carpoolsQuery.eq("match_id", matchId);
  }
  const { data: carpoolsData } = await carpoolsQuery;
  const carpools: Carpool[] = carpoolsData ?? [];

  const carpoolIds = carpools.map((c) => c.id);
  const driverIds = Array.from(new Set(carpools.map((c) => c.driver_id)));
  const matchIdsOnCards = Array.from(
    new Set(carpools.map((c) => c.match_id).filter((id): id is string => Boolean(id)))
  );

  const [{ data: bookingsData }, { data: contextMatch }] = await Promise.all([
    carpoolIds.length
      ? supabase.from("carpool_bookings").select("carpool_id, member_id").in("carpool_id", carpoolIds)
      : Promise.resolve({ data: [] as { carpool_id: string; member_id: string }[] }),
    matchId
      ? supabase.from("matches").select("id, title").eq("id", matchId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const bookings = bookingsData ?? [];
  const bookingMemberIds = bookings.map((b) => b.member_id);
  const allMemberIds = Array.from(new Set([...driverIds, ...bookingMemberIds]));

  const [{ data: membersData }, { data: cardMatchesData }] = await Promise.all([
    allMemberIds.length
      ? supabase.from("members").select("id, name").in("id", allMemberIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    matchIdsOnCards.length
      ? supabase.from("matches").select("id, title").in("id", matchIdsOnCards)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  const nameById = new Map((membersData ?? []).map((m) => [m.id, m.name]));
  const matchTitleById = new Map((cardMatchesData ?? []).map((m) => [m.id, m.title]));

  const bookingsByCarpool = new Map<string, string[]>();
  for (const booking of bookings) {
    const list = bookingsByCarpool.get(booking.carpool_id) ?? [];
    list.push(booking.member_id);
    bookingsByCarpool.set(booking.carpool_id, list);
  }

  function renderCard(carpool: Carpool) {
    const bookedMemberIds = bookingsByCarpool.get(carpool.id) ?? [];
    const currentUserIsDriver = carpool.driver_id === session.memberId;
    const currentUserHasBooked = bookedMemberIds.includes(session.memberId);
    const bookingMemberNames = bookedMemberIds
      .filter((id) => id !== session.memberId)
      .map((id) => nameById.get(id) ?? "Unbekannt");

    return (
      <CarpoolCard
        key={carpool.id}
        carpool={carpool}
        driverName={nameById.get(carpool.driver_id) ?? "Unbekannt"}
        matchTitle={carpool.match_id ? matchTitleById.get(carpool.match_id) ?? null : null}
        bookedCount={bookedMemberIds.length}
        bookingMemberNames={bookingMemberNames}
        currentUserIsDriver={currentUserIsDriver}
        currentUserHasBooked={currentUserHasBooked}
        redirectMatchId={matchId}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl text-text">Fahrgemeinschaften</h1>
          {contextMatch && (
            <p className="mt-1 text-sm text-text-muted">Für: {contextMatch.title}</p>
          )}
        </div>
        <Link
          href={matchId ? `/dashboard/carpools/new?match_id=${matchId}` : "/dashboard/carpools/new"}
          className="shrink-0 rounded-md bg-gradient-to-r from-primary-hover to-primary font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)] px-3 py-1.5 text-sm"
        >
          Neue Fahrt anbieten
        </Link>
      </div>

      {searchParams.bookingError && (
        <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          Leider ist gerade kein Platz mehr frei.
        </p>
      )}

      <section className="flex flex-col gap-3">
        {carpools.length === 0 ? (
          <p className="text-sm text-text-muted">Keine anstehenden Fahrten.</p>
        ) : (
          carpools.map(renderCard)
        )}
      </section>
    </div>
  );
}
