"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPin } from "@/lib/auth/pin";
import { createSessionCookie, clearSessionCookie } from "@/lib/auth/session";

export interface LoginState {
  error?: string;
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const name = String(formData.get("name") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();

  if (!name || !pin) {
    return { error: "Bitte Name und PIN eingeben." };
  }

  // Vor dem Login gibt es keine Session -> RLS wuerde einen normalen Client
  // blocken. Die Login-Pruefung selbst laeuft daher bewusst mit dem
  // Service-Role-Client server-seitig in dieser Server Action.
  const supabase = createAdminClient();
  const { data: member, error } = await supabase
    .from("members")
    .select("id, name, pin_hash, role")
    .eq("name", name)
    .maybeSingle();

  if (error || !member) {
    return { error: "Name oder PIN ist falsch." };
  }

  const pinValid = await verifyPin(pin, member.pin_hash);
  if (!pinValid) {
    return { error: "Name oder PIN ist falsch." };
  }

  await createSessionCookie({
    memberId: member.id,
    name: member.name,
    role: member.role,
  });

  redirect("/dashboard");
}

export async function logout() {
  clearSessionCookie();
  redirect("/login");
}
