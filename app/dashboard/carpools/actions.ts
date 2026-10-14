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
 */
export async function bookSeat(carpoolId: string, redirectMatchId: string | null): Promise<void> {
  await requireSession();
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("book_carpool_seat", { p_carpool_id: carpoolId });

  const target = redirectTargetFor(redirectMatchId);
  if (error) {
    const separator = target.includes("?") ? "&" : "?";
    redirect(`${target}${separator}bookingError=1`);
  }

  redirect(target);
}

/**
 * Storniert ausschliesslich die eigene Buchung: gefiltert auf member_id =
 * session.memberId, unabhaengig davon welche carpoolId uebergeben wird.
 * RLS (carpool_bookings_delete_own_or_driver_or_admin) blockt ohnehin
 * fremde Buchungen serverseitig zusaetzlich ab.
 */
export async function cancelBooking(carpoolId: string, redirectMatchId: string | null): Promise<void> {
  const session = await requireSession();
  const supabase = await createServerSupabaseClient();

  await supabase
    .from("carpool_bookings")
    .delete()
    .eq("carpool_id", carpoolId)
    .eq("member_id", session.memberId);

  redirect(redirectTargetFor(redirectMatchId));
}

/**
 * Loescht eine Fahrt nur, wenn der Aufrufer der Fahrer ist oder
 * admin/vorstand -- serverseitig geprueft (nicht nur UI-Ausblenden).
 * RLS (carpools_delete_own_or_admin) verweigert einen unautorisierten
 * Loeschversuch zusaetzlich auf DB-Ebene.
 */
export async function deleteCarpool(carpoolId: string, redirectMatchId: string | null): Promise<void> {
  const session = await requireSession();
  const supabase = await createServerSupabaseClient();

  const { data: carpool } = await supabase
    .from("carpools")
    .select("driver_id")
    .eq("id", carpoolId)
    .maybeSingle();

  const isOwner = carpool?.driver_id === session.memberId;
  const isPrivileged =
    session.role === "admin" || session.role === "vorstand" || session.role === "coach";

  if (carpool && (isOwner || isPrivileged)) {
    await supabase.from("carpools").delete().eq("id", carpoolId);
  }

  redirect(redirectTargetFor(redirectMatchId));
}
