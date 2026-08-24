import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!event) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl text-text">{event.title}</h1>
        <p className="mt-1 text-sm text-text-muted">{formatDateTime(event.starts_at)}</p>
        {event.location && <p className="mt-1 text-sm text-text-muted">{event.location}</p>}
      </div>

      {event.description && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="whitespace-pre-line text-sm text-text">{event.description}</p>
        </div>
      )}
    </div>
  );
}
