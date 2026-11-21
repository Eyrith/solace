/**
 * Supabase browser client — safe to use in Client Components.
 *
 * Uses @supabase/ssr to manage cookies properly in Next.js App Router.
 * This client uses the ANON key only — never the service role key.
 */

import { createBrowserClient } from '@supabase/ssr'

export function isSupabaseClientConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(
    url &&
      key &&
      !url.includes('placeholder-project') &&
      !key.includes('placeholder'),
  )
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

  return createBrowserClient(url, key)
}

