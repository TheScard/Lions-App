import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSessionToken } from "@/lib/auth/session";

/**
 * Request-scoped Supabase-Client fuer Server Components / Server Actions /
 * Route Handlers. Nutzt den anon key, haengt aber – falls vorhanden – das
 * eigene Session-JWT (siehe lib/auth/session.ts) als Authorization-Bearer-
 * Token an. PostgREST verifiziert dieses JWT gegen das Supabase-Projekt-
 * JWT-Secret und setzt dadurch auth.uid()/auth.role() fuer die RLS-Policies.
 *
 * Ohne gueltiges Cookie verhaelt sich der Client wie ein anonymer Request –
 * RLS blockt dann alle "authenticated"-Policies, wie gewuenscht.
 */
export async function createServerSupabaseClient() {
  const token = await getSessionToken();

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : undefined,
    }
  );
}
