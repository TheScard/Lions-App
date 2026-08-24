import { NextResponse, type NextRequest } from "next/server";
// Bewusst der spezifische Unterpfad statt des "jose"-Barrels -- der Barrel
// buendelt auch JWE-Verschluesselung, die CompressionStream/
// DecompressionStream nutzt (in der Edge Runtime nicht unterstuetzt), obwohl
// hier nur jwtVerify (JWS) gebraucht wird. Siehe auch lib/auth/session.ts.
import { jwtVerify } from "jose/jwt/verify";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function readSession(token: string | undefined) {
  if (!token) return null;
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await readSession(token);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  // Feingranulare Rollen-Pruefung (welche Rolle darf welchen /admin-Bereich
  // sehen) passiert bewusst in den einzelnen Routen/Layouts (siehe
  // lib/auth/guards.ts), nicht hier – dort unterscheiden sich die
  // erlaubten Rollen je nach Unterseite (z.B. Mitglieder nur Admin,
  // Spiele/Events auch Vorstand).

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
