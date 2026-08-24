import "server-only";
import { cookies } from "next/headers";
// Bewusst die spezifischen Unterpfade statt des "jose"-Barrels: der Barrel
// buendelt auch JWE-Verschluesselung (jwt/encrypt.js), die intern
// CompressionStream/DecompressionStream nutzt -- das loest in der Vercel
// Edge Runtime (middleware.ts importiert verifySessionToken/jwtVerify
// transitiv nicht, aber signSessionToken laeuft ueber dieselbe Session-Datei)
// eine "Node.js API not supported"-Build-Warnung aus. Wir nutzen ohnehin nur
// Signieren/Verifizieren (JWS), nie Verschluesselung (JWE).
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import type { SessionPayload } from "@/types/session";
import type { MemberRole } from "@/types/database";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

export { SESSION_COOKIE_NAME };
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 Tage

function getSecretKey() {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error(
      "SUPABASE_JWT_SECRET fehlt. Bitte in .env.local setzen (Supabase Dashboard -> Settings -> API -> JWT Secret, bzw. `supabase status` bei lokaler Entwicklung)."
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Signiert ein JWT im Format, das Supabase/PostgREST fuer RLS erwartet:
 * `sub` = members.id, `role` = "authenticated" (Postgres-Rolle). Zusaetzlich
 * transportieren wir `member_role` (member/admin/vorstand) und `name` als
 * bequeme, aber NICHT fuer Autorisierungsentscheidungen in RLS verwendete
 * Claims (RLS prueft die Rolle stattdessen live gegen die members-Tabelle,
 * siehe is_admin_or_vorstand() in der Migration).
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    role: "authenticated",
    aud: "authenticated",
    name: payload.name,
    member_role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.memberId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.sub) return null;
    return {
      memberId: payload.sub,
      name: (payload.name as string) ?? "",
      role: (payload.member_role as MemberRole) ?? "member",
    };
  } catch {
    return null;
  }
}

export async function createSessionCookie(payload: SessionPayload) {
  const token = await signSessionToken(payload);
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE_NAME);
}

export function getSessionToken(): string | undefined {
  return cookies().get(SESSION_COOKIE_NAME)?.value;
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = getSessionToken();
  if (!token) return null;
  return verifySessionToken(token);
}
