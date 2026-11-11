/**
 * Supabase browser client — safe to use in Client Components.
 *
 * Uses @supabase/ssr to manage cookies properly in Next.js App Router.
 * This client uses the ANON key only — never the service role key.
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
