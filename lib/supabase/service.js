import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — bypasses RLS.
 * Only use server-side (Route Handlers, Server Components). Never expose to the browser.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
