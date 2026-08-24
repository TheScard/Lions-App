import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Bewusst als lokale Konstante dupliziert (statt aus @/lib/auth/constants zu
// importieren) und "jose" bewusst als Top-Level-Paket statt Unterpfad-Import:
// Vercels Edge-Function-Bundler fuer middleware.ts hat sich in der Praxis als
// unzuverlaessig bei der Aufloesung von TS-Pfad-Aliasen (@/...) sowie bei
// jose-Unterpfad-Importen (jose/jwt/verify) gezeigt ("referencing unsupported
// modules"), obwohl beides lokal (next build) fehlerfrei kompiliert. Damit
// middleware.ts unabhaengig von dieser Vercel-Eigenheit bleibt, importiert es
// ausschliesslich npm-Pakete, keine eigenen Projektdateien. Aendert sich der
// Cookie-Name in lib/auth/constants.ts, muss er hier manuell mitgezogen werden.
const SESSION_COOKIE_NAME = "lions_session";

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
