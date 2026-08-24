"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type BoardMemberUpdate = Database["public"]["Tables"]["board_members"]["Update"];

export interface BoardMemberFormState {
  error?: string;
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function parseBoardMemberForm(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const responsibilities = String(formData.get("responsibilities") ?? "").trim();

  if (!displayName) {
    return { error: "Name ist ein Pflichtfeld." } as const;
  }
  if (!position) {
    return { error: "Position ist ein Pflichtfeld." } as const;
  }

  return {
    data: {
      member_id: null,
      display_name: displayName,
      position,
      responsibilities: responsibilities || null,
    },
  } as const;
}

type Supabase = Awaited<ReturnType<typeof createServerSupabaseClient>>;

async function uploadPhotoIfPresent(
  supabase: Supabase,
  formData: FormData
): Promise<{ path?: string; error?: string }> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return {};
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { error: "Foto zu groß (max. 5 MB)." };
  }

  const path = `${randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("board-photos").upload(path, file, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) {
    return { error: "Foto-Upload fehlgeschlagen: " + error.message };
  }
  return { path };
}

export async function createBoardMember(formData: FormData): Promise<BoardMemberFormState> {
  await requireRole(["admin", "vorstand", "coach"]);

  const parsed = parseBoardMemberForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createServerSupabaseClient();

  const photoResult = await uploadPhotoIfPresent(supabase, formData);
  if (photoResult.error) return { error: photoResult.error };

  const { count } = await supabase.from("board_members").select("*", { count: "exact", head: true });

  const { error } = await supabase.from("board_members").insert({
    ...parsed.data,
    photo_url: photoResult.path ?? null,
    sort_order: (count ?? 0) + 1,
  });

  if (error) {
    if (photoResult.path) await supabase.storage.from("board-photos").remove([photoResult.path]);
    return { error: "Anlegen fehlgeschlagen: " + error.message };
  }

  revalidatePath("/admin/board");
  revalidatePath("/dashboard/board");
  return {};
}

export async function updateBoardMember(
  id: string,
  formData: FormData
): Promise<BoardMemberFormState> {
  await requireRole(["admin", "vorstand", "coach"]);

  const parsed = parseBoardMemberForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createServerSupabaseClient();

  const photoResult = await uploadPhotoIfPresent(supabase, formData);
  if (photoResult.error) return { error: photoResult.error };

  const updateData: BoardMemberUpdate = { ...parsed.data };
  let oldPhotoPath: string | null = null;

  if (photoResult.path) {
    const { data: existing } = await supabase
      .from("board_members")
      .select("photo_url")
      .eq("id", id)
      .maybeSingle();
    oldPhotoPath = existing?.photo_url ?? null;
    updateData.photo_url = photoResult.path;
  }

  const { error } = await supabase.from("board_members").update(updateData).eq("id", id);
  if (error) {
    if (photoResult.path) await supabase.storage.from("board-photos").remove([photoResult.path]);
    return { error: "Speichern fehlgeschlagen: " + error.message };
  }

  if (oldPhotoPath) {
    await supabase.storage.from("board-photos").remove([oldPhotoPath]);
  }

  revalidatePath("/admin/board");
  revalidatePath("/dashboard/board");
  return {};
}

export async function deleteBoardMember(id: string): Promise<void> {
  await requireRole(["admin", "vorstand", "coach"]);
  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("board_members")
    .select("photo_url")
    .eq("id", id)
    .maybeSingle();

  await supabase.from("board_members").delete().eq("id", id);

  if (existing?.photo_url) {
    await supabase.storage.from("board-photos").remove([existing.photo_url]);
  }

  revalidatePath("/admin/board");
  revalidatePath("/dashboard/board");
}

async function swapSortOrder(id: string, direction: "up" | "down"): Promise<void> {
  await requireRole(["admin", "vorstand", "coach"]);
  const supabase = await createServerSupabaseClient();

  const { data: all } = await supabase
    .from("board_members")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });

  const rows = all ?? [];
  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) return;

  const swapWithIndex = direction === "up" ? index - 1 : index + 1;
  if (swapWithIndex < 0 || swapWithIndex >= rows.length) return;

  const current = rows[index];
  const other = rows[swapWithIndex];

  await supabase.from("board_members").update({ sort_order: other.sort_order }).eq("id", current.id);
  await supabase.from("board_members").update({ sort_order: current.sort_order }).eq("id", other.id);

  revalidatePath("/admin/board");
  revalidatePath("/dashboard/board");
}

export async function moveBoardMemberUp(id: string): Promise<void> {
  await swapSortOrder(id, "up");
}

export async function moveBoardMemberDown(id: string): Promise<void> {
  await swapSortOrder(id, "down");
}
