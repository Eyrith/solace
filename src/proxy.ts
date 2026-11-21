/**
 * Next.js Proxy — Project00 (formerly middleware.ts, renamed for Next.js 16+)
 *
 * Runs at the edge before every request. Responsibilities:
 * 1. Refresh Supabase auth session (keep JWTs fresh)
 * 2. Route requests by hostname:
 *    - www.* or no-subdomain → (public) editorial portal
 *    - app.*                 → (app) private sanctuary
 *    - localhost/dev         → configurable via NEXT_PUBLIC_DEFAULT_HOST
 * 3. Protect all (app) routes — redirect to /auth/login if unauthenticated
 *
 * IMPORTANT: This proxy handles ROUTING, not security.
 * Security is enforced by RLS policies in Supabase.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project-ref')) {
    try {
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
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

  // ── 2. Determine which experience to serve ────────────────────────────────
  const host = request.headers.get('host') ?? ''

  // Skip middleware for Next.js internals and static files
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

  const isAppHost = host.startsWith('app.')
  const defaultHost = process.env.NEXT_PUBLIC_DEFAULT_HOST ?? 'public'
  const serveApp = isAppHost || (!host.startsWith('www.') && defaultHost === 'app')

  // ── 3. Route to correct segment ───────────────────────────────────────────
  if (serveApp) {
    // ── App (private sanctuary) ──────────────────────────────────────────

    // Allow public auth routes within the app experience
    const isAuthRoute =
      pathname.startsWith('/sanctuary') ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/invite')

    if (!user && !isAuthRoute) {
      // Unauthenticated → redirect to login with return URL
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/sanctuary/login'
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Rewrite root → /home for app experience
    const appPath = pathname === '/' ? '/home' : pathname
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = appPath
    return NextResponse.rewrite(rewriteUrl, { ...supabaseResponse })
  } else {
    // ── Public (editorial portal) ────────────────────────────────────────
    // The (public) route group pages are already at the correct paths.
    // No rewrite needed — they respond to / /discover /psychology etc. directly.
    // (The route group parentheses are invisible to the URL.)
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
