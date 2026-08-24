import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EventForm } from "@/components/admin/EventForm";
import { updateEvent } from "@/app/admin/events/actions";

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!event) {
    notFound();
  }

  const action = updateEvent.bind(null, event.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl text-text">Event bearbeiten</h1>
      <EventForm action={action} submitLabel="Speichern" initialValues={event} />
    </div>
  );
}
