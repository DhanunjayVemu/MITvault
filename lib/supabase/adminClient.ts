import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Full-privilege Supabase client for the admin API routes only. Uses the
 *  service role key, which bypasses Row Level Security — this must never be
 *  imported from a client component or exposed to the browser. The
 *  "server-only" import above makes the build fail loudly if that ever
 *  happens by accident. */
export function getSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set in your environment."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
