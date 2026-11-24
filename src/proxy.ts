/**
 * Next.js Proxy — Project00 (formerly middleware.ts, renamed for Next.js 16+)
 *
 * Runs at the edge before every request. Responsibilities:
 * 1. Refresh Supabase auth session (keep JWTs fresh)
 * 2. Unify routing under a single host (solace.dpdns.org, localhost):
 *    - Root '/' serves the educational cover portal by default
 *    - Educational pages (/discover, /philosophy, etc.) serve public editorial portal
 *    - Sanctuary routes (/sanctuary, /home, /messages, /settings, etc.) are protected
 *    - Unauthenticated access to private sanctuary routes redirects to /sanctuary/login?next=...
 *    - Public sanctuary routes (/sanctuary/login, /sanctuary/register, /invite/*) remain accessible
 * 3. Forward /api/* traffic to the Python FastAPI backend
 *
 * IMPORTANT: This proxy handles ROUTING, not security.
 * Security is enforced by RLS policies in Supabase.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Sanctuary route path prefixes
const SANCTUARY_PATH_PREFIXES = [
  '/sanctuary',
  '/home',
  '/messages',
  '/settings',
  '/games',
  '/questions',
  '/memories',
  '/calendar',
  '/calls',
]

function isSanctuaryPath(pathname: string): boolean {
  return (
    SANCTUARY_PATH_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    ) ||
    pathname === '/invite' ||
    pathname.startsWith('/invite/')
  )
}

function isPublicSanctuaryPath(pathname: string): boolean {
  return (
    pathname.startsWith('/sanctuary/login') ||
    pathname.startsWith('/sanctuary/register') ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/auth')
  )
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // ── 0. Forward all /api/* traffic dynamically to the Python FastAPI backend ─
  if (pathname.startsWith('/api/') || pathname === '/api') {
    const backendUrl = (
      process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000'
    ).replace(/\/+$/, '')
    return NextResponse.rewrite(new URL(`${pathname}${search}`, backendUrl))
  }

  let supabaseResponse = NextResponse.next({ request })

  // ── 1. Refresh Supabase session ───────────────────────────────────────────
  let user = null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isSupabaseConfigured = Boolean(
    supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project-ref')
  )
  const isSandboxSession = request.cookies.get('sanctuary_sandbox')?.value === 'true'

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerClient(
        supabaseUrl!,
        supabaseAnonKey!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              )
              supabaseResponse = NextResponse.next({ request })
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
              )
            },
          },
        }
      )

      const { data } = await supabase.auth.getUser()
      user = data?.user ?? null
    } catch (e) {
      console.warn('Supabase auth check in proxy failed or not yet configured:', e)
    }
  }

  // ── 2. Skip middleware for Next.js internals and static files ────────────
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.') // static files
  ) {
    return supabaseResponse
  }

  // Guard internal design-system and preview routes in production builds
  if (
    (process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production') &&
    (pathname === '/design-system' ||
      pathname.startsWith('/design-system/') ||
      pathname === '/preview' ||
      pathname.startsWith('/preview/'))
  ) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl, 308)
  }

  // ── 3. Unified Single-Host Routing & Protection ───────────────────────────
  // Both educational pages (/, /discover, /philosophy, etc.) and private sanctuary
  // live under the same single host (solace.dpdns.org or localhost).
  // - Root '/' serves the educational cover portal by default.
  // - Sanctuary routes (/sanctuary, /home, /messages, /settings, etc.) are protected.
  // - Unauthenticated requests to private sanctuary routes redirect to /sanctuary/login.
  // - Public auth/invite routes (/sanctuary/login, /sanctuary/register, /invite/*) remain accessible.

  const isSanctuary = isSanctuaryPath(pathname)
  const isPublicAccessible = isPublicSanctuaryPath(pathname)
  const isPrivateSanctuary = isSanctuary && !isPublicAccessible

  if (isPrivateSanctuary) {
    if (isSupabaseConfigured && !user && !isSandboxSession) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/sanctuary/login'
      const returnUrl = `${pathname}${search}` || pathname
      loginUrl.searchParams.set('next', returnUrl)
      return NextResponse.redirect(loginUrl)
    }

    // Clean redirects for index routes without standalone pages
    if (pathname === '/sanctuary' || pathname === '/sanctuary/') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/home'
      return NextResponse.redirect(redirectUrl)
    }

    if (pathname === '/settings' || pathname === '/settings/') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/settings/appearance'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
