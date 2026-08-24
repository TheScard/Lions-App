// In einer eigenen, abhaengigkeitsfreien Datei, damit sowohl die
// Server-only Session-Helfer (lib/auth/session.ts) als auch die Middleware
// (Edge-Runtime, kein next/headers/server-only) denselben Cookie-Namen
// verwenden koennen, ohne next/headers in den Middleware-Bundle zu ziehen.
export const SESSION_COOKIE_NAME = "lions_session";
