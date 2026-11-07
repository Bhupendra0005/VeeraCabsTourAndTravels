import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/server/core/env";

let client: SupabaseClient | undefined;

/**
 * Service-role Supabase client. Server only: it bypasses RLS, which is why every
 * caller must check the session / ownership itself.
 */
export function db(): SupabaseClient {
  client ??= createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_Secret_key"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}
