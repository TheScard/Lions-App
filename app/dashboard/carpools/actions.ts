"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseLocalInputAsUtc } from "@/lib/timezone";
import { formatPushDateTime } from "@/lib/format";
import { sendPush, getTeamMemberIds } from "@/lib/push";

export interface CarpoolFormState {
  error?: string;
}

const MAX_SEATS = 8;

function redirectTargetFor(matchId: string | null) {
  return matchId ? `/dashboard/carpools?match_id=${matchId}` : "/dashboard/carpools";
}

export async function createCarpool(
  _prevState: CarpoolFormState,
  formData: FormData
): Promise<CarpoolFormState> {
  const session = await requireSession();

  const matchId = String(formData.get("match_id") ?? "").trim();
  const totalSeatsRaw = String(formData.get("total_seats") ?? "").trim();
  const departurePoint = String(formData.get("departure_point") ?? "").trim();
  const departureTimeLocal = String(formData.get("departure_time") ?? "").trim();

  if (!departurePoint || !departureTimeLocal) {
    return { error: "Abfahrtsort und Abfahrtszeit sind Pflichtfelder." };
  }

  const totalSeats = Number(totalSeatsRaw);
  if (!Number.isInteger(totalSeats) || totalSeats < 1 || totalSeats > MAX_SEATS) {
    return { error: `Bitte eine Sitzplatzanzahl zwischen 1 und ${MAX_SEATS} angeben.` };
  }

  // departureTimeLocal ist eine Ortszeit ohne Zeitzoneninfo (Browser-Feld)
  // und wird bewusst als Europe/Berlin interpretiert, wie bei Matches/Events.
  const departureTime = parseLocalInputAsUtc(departureTimeLocal);
  if (Number.isNaN(departureTime.getTime())) {
    return { error: "Ungueltiges Datum/Uhrzeit." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("carpools").insert({
    match_id: matchId || null,
    driver_id: session.memberId,
    total_seats: totalSeats,
    departure_point: departurePoint,
    departure_time: departureTime.toISOString(),
  });

  if (error) {
    return { error: "Speichern fehlgeschlagen: " + error.message };
  }

  // Nur Fahrten zu einem Spiel lösen eine Push aus -- Fahrten ohne Bezug
  // (match_id leer) haben kein Team, an das sich sinnvoll benachrichtigen
  // liesse.
  if (matchId) {
    const { data: match } = await admin
      .from("matches")
      .select("title, team")
      .eq("id", matchId)
      .maybeSingle();

    if (match) {
      const recipientIds = await getTeamMemberIds(match.team, session.memberId);
      await sendPush({
        memberIds: recipientIds,
        title: `Neue Fahrgemeinschaft: ${match.title}`,
        body: `${session.name} fährt ${formatPushDateTime(departureTime.toISOString())} ab ${departurePoint}, ${totalSeats} Plätze. Trag dich jetzt ein!`,
        path: `/dashboard/carpools?match_id=${matchId}`,
      });
    }
  }

  redirect(redirectTargetFor(matchId || null));
}

/**
 * Bucht einen Sitzplatz ueber die DB-Funktion book_carpool_seat (siehe
 * Migration 20260824130000), die die Kapazitaetspruefung + das Einfuegen
 * atomar in einer Transaktion mit Zeilensperre ausfuehrt (Race-Condition-
 * Schutz, siehe Kommentar dort). Bei ausgebuchter Fahrt wird mit einer
 * Fehlermeldung per Query-Param zurueckgeleitet.
 *
 * Die RPC laeuft bewusst ueber den RLS-Client (nicht den Service-Role-
 * Client), weil book_carpool_seat() intern auth.uid() auswertet -- der
 * Service-Role-Client hat keinen Auth-Kontext. Die anschliessende
 * Push-Benachrichtigung an den Fahrer braucht dagegen keinen Auth-Kontext
 * und laeuft ueber den Service-Role-Client.
 */
export async function bookSeat(carpoolId: string, redirectMatchId: string | null): Promise<void> {
  const session = await requireSession();
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("book_carpool_seat", { p_carpool_id: carpoolId });

  const target = redirectTargetFor(redirectMatchId);
  if (error) {
    const separator = target.includes("?") ? "&" : "?";
    redirect(`${target}${separator}bookingError=1`);
  }

  const admin = createAdminClient();
  const { data: carpool } = await admin
    .from("carpools")
    .select("driver_id, total_seats, match_id")
    .eq("id", carpoolId)
    .maybeSingle();

  if (carpool && carpool.driver_id !== session.memberId) {
    const { count } = await admin
      .from("carpool_bookings")
      .select("*", { count: "exact", head: true })
      .eq("carpool_id", carpoolId);
    const freeSeats = carpool.total_seats - (count ?? 0);
    await sendPush({
      memberIds: [carpool.driver_id],
      title: "Neue Buchung in deiner Fahrt",
      body: `${session.name} fährt mit. Noch ${freeSeats} von ${carpool.total_seats} Plätzen frei.`,
      path: redirectTargetFor(carpool.match_id),
    });
  }

  redirect(target);
}

/**
 * Storniert ausschliesslich die eigene Buchung: gefiltert auf member_id =
 * session.memberId, unabhaengig davon welche carpoolId uebergeben wird --
 * member_id kommt also nie aus dem Request. Schreibt ueber den
 * Service-Role-Client, da die Einschraenkung bereits in der WHERE-Klausel
 * aus der Session kommt.
 */
export async function cancelBooking(carpoolId: string, redirectMatchId: string | null): Promise<void> {
  const session = await requireSession();
  const admin = createAdminClient();

  const { count } = await admin
    .from("carpool_bookings")
    .delete({ count: "exact" })
    .eq("carpool_id", carpoolId)
    .eq("member_id", session.memberId);

  // Nur pushen, wenn tatsaechlich eine Buchung geloescht wurde, und nie an
  // die stornierende Person selbst (die ist nie der Fahrer der eigenen
  // Buchung, die Pruefung ist dennoch defensiv vorhanden).
  if (count && count > 0) {
    const { data: carpool } = await admin
      .from("carpools")
      .select("driver_id, total_seats, match_id")
      .eq("id", carpoolId)
      .maybeSingle();

    if (carpool && carpool.driver_id !== session.memberId) {
      const { count: bookedCount } = await admin
        .from("carpool_bookings")
        .select("*", { count: "exact", head: true })
        .eq("carpool_id", carpoolId);
      const freeSeats = carpool.total_seats - (bookedCount ?? 0);
      await sendPush({
        memberIds: [carpool.driver_id],
        title: "Stornierung in deiner Fahrt",
        body: `${session.name} hat storniert. Jetzt ${freeSeats} von ${carpool.total_seats} Plätzen frei.`,
        path: redirectTargetFor(carpool.match_id),
      });
    }
  }

  redirect(redirectTargetFor(redirectMatchId));
}

/**
 * Loescht eine Fahrt nur, wenn der Aufrufer der Fahrer ist oder
 * admin/vorstand/coach -- serverseitig geprueft (nicht nur UI-Ausblenden).
 * Die Mitfahrer werden VOR dem Loeschen geladen (carpool_bookings wird per
 * on-delete-cascade mitgeloescht), damit ihnen danach noch eine Push ueber
 * die Absage zugestellt werden kann -- nie an die loeschende Person.
 */
export async function deleteCarpool(carpoolId: string, redirectMatchId: string | null): Promise<void> {
  const session = await requireSession();
  const admin = createAdminClient();

  const { data: carpool } = await admin
    .from("carpools")
    .select("driver_id, departure_point, departure_time")
    .eq("id", carpoolId)
    .maybeSingle();

  const isOwner = carpool?.driver_id === session.memberId;
  const isPrivileged =
    session.role === "admin" || session.role === "vorstand" || session.role === "coach";

  if (carpool && (isOwner || isPrivileged)) {
    const { data: bookings } = await admin
      .from("carpool_bookings")
      .select("member_id")
      .eq("carpool_id", carpoolId);
    const passengerIds = (bookings ?? [])
      .map((b) => b.member_id)
      .filter((memberId) => memberId !== session.memberId);

    await admin.from("carpools").delete().eq("id", carpoolId);

    if (passengerIds.length > 0) {
      await sendPush({
        memberIds: passengerIds,
        title: "Fahrt abgesagt",
        body: `Die Fahrt am ${formatPushDateTime(carpool.departure_time)} ab ${carpool.departure_point} wurde gelöscht. Bitte such dir eine andere Mitfahrgelegenheit.`,
        path: "/dashboard/carpools",
      });
    }
  }

  redirect(redirectTargetFor(redirectMatchId));
}
