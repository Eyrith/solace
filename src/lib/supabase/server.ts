/**
 * Supabase server client — for use in Server Components, Route Handlers,
 * and Server Actions.
 *
 * Uses @supabase/ssr with Next.js cookies() to read/write session cookies
 * server-side. This is the standard pattern for Next.js App Router.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates an authenticated Supabase client for server-side use.
 * Reads the session from request cookies automatically.
 *
 * Usage: const supabase = await createClient()
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll is called from a Server Component — cookies can only
            // be set from Server Actions or Route Handlers. This is fine;
            // the middleware will refresh the session.
          }
        },
      },
    }
  )
}

/**
 * Creates a Supabase client using the service role key.
 * FOR SERVER-SIDE USE ONLY. Never expose or call from client code.
 *
 * Used by: Route Handlers, Edge Functions, background jobs.
 */
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
