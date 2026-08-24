"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hashPin, generatePin } from "@/lib/auth/pin";
import type { MemberRole, Team } from "@/types/database";

const VALID_ROLES: MemberRole[] = ["member", "vorstand", "admin", "coach"];
const VALID_TEAMS: Team[] = ["herren", "u16"];

function isValidRole(value: string): value is MemberRole {
  return (VALID_ROLES as string[]).includes(value);
}

function redirectWithError(message: string): never {
  redirect(`/admin/members?error=${encodeURIComponent(message)}`);
}

export interface CreateMemberState {
  error?: string;
  createdName?: string;
  createdPin?: string;
}

export async function createMember(
  _prevState: CreateMemberState,
  formData: FormData
): Promise<CreateMemberState> {
  await requireRole(["admin", "coach", "vorstand"]);

  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "member").trim();
  const rawTeam = String(formData.get("team") ?? "").trim();
  const team: Team | null = rawTeam === "" ? null : (rawTeam as Team);

  if (!name) {
    return { error: "Name ist ein Pflichtfeld." };
  }
  if (!isValidRole(role)) {
    return { error: "Ungültige Rolle." };
  }
  if (team !== null && !VALID_TEAMS.includes(team)) {
    return { error: "Ungültiges Team." };
  }

  const supabase = await createServerSupabaseClient();

  // Serverseitige Vorab-Pruefung fuer eine klare Fehlermeldung. Der
  // unique-Constraint auf members.name (siehe error.code 23505 unten)
  // greift zusaetzlich als Absicherung gegen die Race Condition, falls
  // zwei Admins gleichzeitig denselben Namen anlegen.
  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (existing) {
    return { error: `Ein Mitglied mit dem Namen "${name}" existiert bereits.` };
  }

  const pin = generatePin();
  const pinHash = await hashPin(pin);

  const { error } = await supabase
    .from("members")
    .insert({ name, pin_hash: pinHash, role, team, must_change_pin: true });
  if (error) {
    if (error.code === "23505") {
      return { error: `Ein Mitglied mit dem Namen "${name}" existiert bereits.` };
    }
    return { error: "Anlegen fehlgeschlagen: " + error.message };
  }

  return { createdName: name, createdPin: pin };
}

export interface ResetPinState {
  error?: string;
  pin?: string;
}

export async function resetPin(
  memberId: string,
  prevState: ResetPinState,
  formData: FormData
): Promise<ResetPinState> {
  void prevState;
  void formData;
  await requireRole(["admin", "coach", "vorstand"]);

  const pin = generatePin();
  const pinHash = await hashPin(pin);

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("members")
    .update({ pin_hash: pinHash, must_change_pin: true })
    .eq("id", memberId);
  if (error) {
    return { error: "PIN-Reset fehlgeschlagen: " + error.message };
  }

  return { pin };
}

export async function changeRole(memberId: string, formData: FormData): Promise<void> {
  await requireRole(["admin", "coach", "vorstand"]);

  const newRole = String(formData.get("role") ?? "").trim();
  if (!isValidRole(newRole)) {
    redirectWithError("Ungültige Rolle.");
  }

  const supabase = await createServerSupabaseClient();

  const { data: target } = await supabase
    .from("members")
    .select("role")
    .eq("id", memberId)
    .maybeSingle();
  if (!target) {
    redirectWithError("Mitglied nicht gefunden.");
  }

  if (target.role === "admin" && newRole !== "admin") {
    const { count } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      redirectWithError("Der letzte verbleibende Admin kann nicht degradiert werden.");
    }
  }

  const { error } = await supabase.from("members").update({ role: newRole }).eq("id", memberId);
  if (error) {
    redirectWithError("Rollenänderung fehlgeschlagen: " + error.message);
  }

  redirect("/admin/members");
}

export async function changeTeam(memberId: string, formData: FormData): Promise<void> {
  await requireRole(["admin", "coach", "vorstand"]);

  const rawTeam = String(formData.get("team") ?? "").trim();
  const newTeam: Team | null = rawTeam === "" ? null : (rawTeam as Team);
  if (newTeam !== null && !VALID_TEAMS.includes(newTeam)) {
    redirectWithError("Ungültiges Team.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("members").update({ team: newTeam }).eq("id", memberId);
  if (error) {
    redirectWithError("Team-Änderung fehlgeschlagen: " + error.message);
  }

  redirect("/admin/members");
}

export async function deleteMember(memberId: string): Promise<void> {
  const session = await requireRole(["admin", "coach", "vorstand"]);

  // Verhindert versehentliches Selbst-Aussperren (eigene Session verweist
  // sonst auf ein geloeschtes Mitglied). Nicht explizit gefordert, aber
  // eine sinnvolle Ergaenzung zur "mindestens 1 admin"-Regel.
  if (memberId === session.memberId) {
    redirectWithError("Du kannst dich nicht selbst löschen.");
  }

  const supabase = await createServerSupabaseClient();

  const { data: target } = await supabase
    .from("members")
    .select("role")
    .eq("id", memberId)
    .maybeSingle();
  if (!target) {
    redirect("/admin/members");
  }

  if (target.role === "admin") {
    const { count } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      redirectWithError("Der letzte verbleibende Admin kann nicht gelöscht werden.");
    }
  }

  const { error } = await supabase.from("members").delete().eq("id", memberId);
  if (error) {
    redirectWithError("Löschen fehlgeschlagen: " + error.message);
  }

  redirect("/admin/members");
}
