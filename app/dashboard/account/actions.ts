"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPin, verifyPin } from "@/lib/auth/pin";

export interface ChangePinState {
  error?: string;
  success?: boolean;
}

function isValidPinFormat(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

// Laeuft bewusst ueber den Service-Role-Client: members_update_admin (RLS)
// erlaubt UPDATEs nur fuer Admins, ein normales Mitglied kann die eigene
// Zeile darueber nicht aendern. Sicherheit kommt stattdessen daraus, dass
// zuerst erneut die aktuelle PIN geprueft wird und ausschliesslich die
// eigene Zeile (session.memberId aus der verifizierten Session) angefasst wird.
export async function changeOwnPin(
  _prevState: ChangePinState,
  formData: FormData
): Promise<ChangePinState> {
  const session = await requireSession();

  const currentPin = String(formData.get("current_pin") ?? "").trim();
  const newPin = String(formData.get("new_pin") ?? "").trim();
  const newPinConfirm = String(formData.get("new_pin_confirm") ?? "").trim();

  if (!currentPin || !newPin || !newPinConfirm) {
    return { error: "Bitte alle Felder ausfüllen." };
  }
  if (!isValidPinFormat(newPin)) {
    return { error: "Die neue PIN muss aus 4 bis 6 Ziffern bestehen." };
  }
  if (newPin !== newPinConfirm) {
    return { error: "Die neuen PINs stimmen nicht überein." };
  }

  const supabase = createAdminClient();
  const { data: member } = await supabase
    .from("members")
    .select("pin_hash")
    .eq("id", session.memberId)
    .maybeSingle();

  if (!member || !(await verifyPin(currentPin, member.pin_hash))) {
    return { error: "Aktuelle PIN ist falsch." };
  }

  const newPinHash = await hashPin(newPin);
  const { error } = await supabase
    .from("members")
    .update({ pin_hash: newPinHash, must_change_pin: false })
    .eq("id", session.memberId);

  if (error) {
    return { error: "Speichern fehlgeschlagen: " + error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function dismissPinHint(): Promise<void> {
  const session = await requireSession();
  const supabase = createAdminClient();
  await supabase.from("members").update({ must_change_pin: false }).eq("id", session.memberId);
  revalidatePath("/dashboard");
}
