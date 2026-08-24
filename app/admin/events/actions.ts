"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseLocalInputAsUtc } from "@/lib/timezone";

export interface EventFormState {
  error?: string;
}

function parseEventForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const startsAtLocal = String(formData.get("starts_at") ?? "").trim();

  if (!title || !startsAtLocal) {
    return { error: "Titel und Datum/Uhrzeit sind Pflichtfelder." } as const;
  }

  // startsAtLocal ist eine Ortszeit ohne Zeitzoneninfo (Browser-Feld) und
  // wird bewusst als Europe/Berlin interpretiert, nicht mit dem naiven
  // `new Date(...)`, das von der Server-Zeitzone abhaengen wuerde.
  const startsAtDate = parseLocalInputAsUtc(startsAtLocal);
  if (Number.isNaN(startsAtDate.getTime())) {
    return { error: "Ungueltiges Datum/Uhrzeit." } as const;
  }

  return {
    data: {
      title,
      description: description || null,
      location: location || null,
      starts_at: startsAtDate.toISOString(),
    },
  } as const;
}

export async function createEvent(
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  await requireRole(["admin", "vorstand"]);

  const parsed = parseEventForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("events").insert(parsed.data);

  if (error) {
    return { error: "Speichern fehlgeschlagen: " + error.message };
  }

  redirect("/admin/events");
}

export async function updateEvent(
  id: string,
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  await requireRole(["admin", "vorstand"]);

  const parsed = parseEventForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("events").update(parsed.data).eq("id", id);

  if (error) {
    return { error: "Speichern fehlgeschlagen: " + error.message };
  }

  redirect("/admin/events");
}

export async function deleteEvent(id: string): Promise<void> {
  await requireRole(["admin", "vorstand"]);
  const supabase = await createServerSupabaseClient();
  await supabase.from("events").delete().eq("id", id);

  revalidatePath("/admin/events");
  revalidatePath("/dashboard/events");
}
