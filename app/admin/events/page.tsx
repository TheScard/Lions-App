import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { deleteEvent } from "@/app/admin/events/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export default async function AdminEventsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: true });

  const rows = events ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl text-text">Events verwalten</h1>
        <Link
          href="/admin/events/new"
          className="rounded-md bg-gradient-to-r from-primary-hover to-primary font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)] px-3 py-1.5 text-sm"
        >
          + Neu
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {rows.length === 0 && (
          <p className="text-sm text-text-muted">Noch keine Events angelegt.</p>
        )}
        {rows.map((event) => (
          <div key={event.id} className="rounded-lg border border-border border-l-4 border-l-primary bg-surface p-4 shadow-lg shadow-black/30">
            <p className="font-heading text-base italic font-bold uppercase tracking-wide text-text">{event.title}</p>
            <p className="mt-1 text-sm text-text-muted">{formatDateTime(event.starts_at)}</p>
            {event.location && <p className="mt-1 text-sm text-text-muted">{event.location}</p>}
            <div className="mt-3 flex items-center gap-4">
              <Link
                href={`/admin/events/${event.id}/edit`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Bearbeiten
              </Link>
              <ConfirmSubmitButton
                action={deleteEvent.bind(null, event.id)}
                label="Löschen"
                confirmMessage="Event wirklich löschen?"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
