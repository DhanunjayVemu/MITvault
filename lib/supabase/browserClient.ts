import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Storage bucket + table names, shared between the browser client, the
 *  admin API routes, and the SQL in supabase/schema.sql. Change here if you
 *  rename either in your Supabase project. */
export const PAPERS_BUCKET = "papers";
export const PAPERS_TABLE = "papers";

let client: SupabaseClient | null | undefined;

/** Lazily creates a singleton browser Supabase client using the public
 *  (anon) key — safe to call from client components. Returns null instead
 *  of throwing when the env vars aren't set yet, so the rest of the site
 *  still renders; subjects just show "no papers uploaded yet" until
 *  Supabase is configured. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn(
      "[pyqvault] Supabase isn't configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are missing). Papers won't load until you set them — see supabase/schema.sql and .env.local.example."
    );
    client = null;
    return client;
  }

  client = createClient(url, anonKey);
  return client;
}
