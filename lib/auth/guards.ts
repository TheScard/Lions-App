import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import type { SessionPayload } from "@/types/session";
import type { MemberRole } from "@/types/database";

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/**
 * Serverseitige Rollen-Pruefung fuer geschuetzte Routen (Server Components
 * und Server Actions). Bewusst NICHT nur UI-Ausblenden: leitet bei
 * fehlender Session nach /login, bei falscher Rolle nach /dashboard um.
 */
export async function requireRole(allowedRoles: MemberRole[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!allowedRoles.includes(session.role)) {
    redirect("/dashboard");
  }
  return session;
}
