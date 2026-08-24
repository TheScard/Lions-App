import { EventForm } from "@/components/admin/EventForm";
import { createEvent } from "@/app/admin/events/actions";

export default function NewEventPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl text-text">Neues Event</h1>
      <EventForm action={createEvent} submitLabel="Anlegen" />
    </div>
  );
}
