import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-Role-Client: umgeht RLS komplett. Nur fuer serverseitigen Code,
 * der bewusst privilegiert arbeiten muss (Login-Pruefung vor dem Einloggen,
 * spaeter das Admin-Panel zum Anlegen von Mitgliedern). Niemals an den
 * Client durchreichen oder aus Client Components importieren.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
