// In einer eigenen, abhaengigkeitsfreien Datei fuer die Server-only
// Session-Helfer (lib/auth/session.ts). middleware.ts importiert diese
// Konstante bewusst NICHT (dort als lokales Literal dupliziert) -- siehe
// Kommentar in middleware.ts zu einem Vercel-Edge-Bundling-Problem mit
// projektinternen @/-Pfad-Aliasen.
export const SESSION_COOKIE_NAME = "lions_session";
