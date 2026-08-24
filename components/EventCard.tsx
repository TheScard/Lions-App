import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import type { Database } from "@/types/database";

type Event = Database["public"]["Tables"]["events"]["Row"];

export function EventCard({ event }: { event: Event }) {
  return (
    <Link
      href={`/dashboard/events/${event.id}`}
      className="group relative block overflow-hidden rounded-lg border border-border bg-surface py-4 pl-5 pr-4 shadow-lg shadow-black/30 transition hover:border-primary/50"
    >
      <span
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-primary-active"
        aria-hidden="true"
      />
      <p className="font-heading text-base italic font-bold uppercase tracking-wide text-text">
        {event.title}
      </p>
      <p className="mt-1 text-sm text-text-muted">{formatDateTime(event.starts_at)}</p>
      {event.location && <p className="mt-1 text-sm text-text-muted">{event.location}</p>}
      {event.description && (
        <p className="mt-2 line-clamp-2 text-sm text-text-muted">{event.description}</p>
      )}
    </Link>
  );
}
