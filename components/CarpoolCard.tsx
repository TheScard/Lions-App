import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { bookSeat, cancelBooking, deleteCarpool } from "@/app/dashboard/carpools/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import type { Database } from "@/types/database";

type Carpool = Database["public"]["Tables"]["carpools"]["Row"];

export function CarpoolCard({
  carpool,
  driverName,
  matchTitle,
  bookedCount,
  bookingMemberNames,
  currentUserIsDriver,
  currentUserHasBooked,
  redirectMatchId,
}: {
  carpool: Carpool;
  driverName: string;
  matchTitle: string | null;
  bookedCount: number;
  bookingMemberNames: string[];
  currentUserIsDriver: boolean;
  currentUserHasBooked: boolean;
  redirectMatchId: string | null;
}) {
  const freeSeats = carpool.total_seats - bookedCount;

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface py-4 pl-5 pr-4 shadow-lg shadow-black/30">
      <span
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-primary-active"
        aria-hidden="true"
      />
      <p className="font-heading text-base italic font-bold uppercase tracking-wide text-text">
        {driverName}
      </p>
      <p className="mt-1 text-sm text-text-muted">{formatDateTime(carpool.departure_time)}</p>
      <p className="mt-1 text-sm text-text-muted">{carpool.departure_point}</p>
      <p className="mt-1 text-sm text-text-muted">
        {freeSeats} von {carpool.total_seats} Plätzen frei
      </p>
      {carpool.match_id && matchTitle && (
        <Link
          href={`/dashboard/matches/${carpool.match_id}`}
          className="mt-1 inline-block text-sm text-primary underline underline-offset-2"
        >
          {matchTitle}
        </Link>
      )}

      <div className="mt-3">
        {currentUserIsDriver ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-primary">Deine Fahrt</p>
            {bookingMemberNames.length > 0 && (
              <ul className="list-inside list-disc text-sm text-text-muted">
                {bookingMemberNames.map((name, index) => (
                  <li key={`${name}-${index}`}>{name}</li>
                ))}
              </ul>
            )}
            <ConfirmSubmitButton
              action={deleteCarpool.bind(null, carpool.id, redirectMatchId)}
              label="Fahrt löschen"
              confirmMessage="Fahrt wirklich löschen? Alle Buchungen dazu werden ebenfalls entfernt."
            />
          </div>
        ) : currentUserHasBooked ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-primary">Du bist dabei</p>
            <ConfirmSubmitButton
              action={cancelBooking.bind(null, carpool.id, redirectMatchId)}
              label="Buchung stornieren"
              confirmMessage="Buchung wirklich stornieren?"
            />
          </div>
        ) : freeSeats > 0 ? (
          <form action={bookSeat.bind(null, carpool.id, redirectMatchId)}>
            <button
              type="submit"
              className="rounded-md bg-gradient-to-r from-primary-hover to-primary font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)] px-3 py-1.5 text-sm"
            >
              Platz reservieren
            </button>
          </form>
        ) : (
          <p className="text-sm text-text-muted">Keine Plätze mehr frei</p>
        )}
      </div>
    </div>
  );
}
