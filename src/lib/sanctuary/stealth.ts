/**
 * Stealth Doorway & Emergency Panic Burn Key
 *
 * Implements:
 * 1. Secret Doorway Trigger:
 *    - Detects stealth codes (default: '//open', '//solace', or configurable passcode) in educational search bars.
 *    - Intercepts search queries before execution.
 *    - Smoothly navigates to '/home' (or '/sanctuary/login' if not authenticated).
 *
 * 2. Emergency Panic / Burn Key:
 *    - Detects panic decoy codes (default: '//burn', '//panic', '911').
 *    - Instantly renders an authentic, serene educational decoy essay (0ms visual cue).
 *    - Revokes all active blob: media URLs and clears DOM media references.
 *    - Clears in-memory decrypted media caches.
 *    - Permanently wipes all sanctuary, supabase, matrix, and session traces from localStorage.
 *    - Clears sessionStorage.
 *    - Signs out from Supabase client (invalidating auth session cookies).
 *    - Clears client-accessible auth cookies.
 *    - Hard-redirects to '/philosophy' via window.location.replace() so the browser back button cannot return.
 */

import { createClient, isSupabaseClientConfigured } from '@/lib/supabase/client'
import { getLocalSanctuaryState, wipeLocalSanctuaryMemory } from '@/lib/sanctuary/local-store'

export const DEFAULT_DOORWAY_CODES: readonly string[] = ['//open', '//solace']
export const DEFAULT_PANIC_CODES: readonly string[] = ['//burn', '//panic', '911']

export const DOORWAY_PASSCODE_STORAGE_KEY = 'sanctuary:stealth:doorway-passcode'
export const PANIC_PASSCODE_STORAGE_KEY = 'sanctuary:stealth:panic-passcode'

// In-memory set of tracked blob: URLs created in this window
const trackedBlobUrls = new Set<string>()

export function registerBlobUrl(url: string): string {
  if (url && typeof url === 'string' && url.startsWith('blob:')) {
    trackedBlobUrls.add(url)
  }
  return url
}

export function revokeAllBlobUrls(): void {
  for (const url of trackedBlobUrls) {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }
  trackedBlobUrls.clear()

  // Sweep DOM for any remaining blob: URLs attached to media elements
  if (typeof document !== 'undefined') {
    try {
      const mediaElements = document.querySelectorAll<HTMLMediaElement | HTMLImageElement>(
        'img, video, audio, source'
      )
      mediaElements.forEach((el) => {
        const src = el.src
        if (src && src.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(src)
          } catch {}
          el.src = ''
        }
      })
    } catch {}
  }
}

// Automatically register newly created Object URLs if in browser environment
if (typeof window !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
  const origCreateObjectURL = URL.createObjectURL
  if (!(origCreateObjectURL as unknown as { __stealthHooked?: boolean }).__stealthHooked) {
    const wrapped = function (obj: Blob | MediaSource): string {
      const url = origCreateObjectURL.call(URL, obj)
      registerBlobUrl(url)
      return url
    }
    ;(wrapped as unknown as { __stealthHooked?: boolean }).__stealthHooked = true
    URL.createObjectURL = wrapped
  }
}

/**
 * Returns all active doorway codes, including user-configured passcodes.
 */
export function getConfiguredDoorwayCodes(): string[] {
  const codes = [...DEFAULT_DOORWAY_CODES]
  if (typeof window !== 'undefined') {
    try {
      const custom = window.localStorage.getItem(DOORWAY_PASSCODE_STORAGE_KEY)
      if (custom && custom.trim()) {
        const trimmed = custom.trim().toLowerCase()
        if (!codes.includes(trimmed)) {
          codes.push(trimmed)
        }
      }
    } catch {}
  }
  return codes
}

/**
 * Returns all active panic codes, including user-configured passcodes.
 */
export function getConfiguredPanicCodes(): string[] {
  const codes = [...DEFAULT_PANIC_CODES]
  if (typeof window !== 'undefined') {
    try {
      const custom = window.localStorage.getItem(PANIC_PASSCODE_STORAGE_KEY)
      if (custom && custom.trim()) {
        const trimmed = custom.trim().toLowerCase()
        if (!codes.includes(trimmed)) {
          codes.push(trimmed)
        }
      }
    } catch {}
  }
  return codes
}

export function setCustomDoorwayCode(code: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (code && code.trim()) {
      window.localStorage.setItem(DOORWAY_PASSCODE_STORAGE_KEY, code.trim())
    } else {
      window.localStorage.removeItem(DOORWAY_PASSCODE_STORAGE_KEY)
    }
  } catch {}
}

export function setCustomPanicCode(code: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (code && code.trim()) {
      window.localStorage.setItem(PANIC_PASSCODE_STORAGE_KEY, code.trim())
    } else {
      window.localStorage.removeItem(PANIC_PASSCODE_STORAGE_KEY)
    }
  } catch {}
}

export function isDoorwayCode(input: string): boolean {
  if (!input) return false
  const normalized = input.trim().toLowerCase()
  return getConfiguredDoorwayCodes().some((code) => code.toLowerCase() === normalized)
}

export function isPanicCode(input: string): boolean {
  if (!input) return false
  const normalized = input.trim().toLowerCase()
  return getConfiguredPanicCodes().some((code) => code.toLowerCase() === normalized)
}

export type StealthCodeType = 'doorway' | 'panic' | null

export function classifyStealthCode(input: string): StealthCodeType {
  if (isDoorwayCode(input)) return 'doorway'
  if (isPanicCode(input)) return 'panic'
  return null
}

/**
 * Determines whether user can enter directly into /home or must log in.
 */
export async function getStealthDoorwayDestination(): Promise<string> {
  if (typeof window === 'undefined') return '/sanctuary/login'

  // 1. Supabase authentication check
  if (isSupabaseClientConfigured()) {
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      if (data?.session?.user) {
        return '/home'
      }
      return '/sanctuary/login'
    } catch {
      return '/sanctuary/login'
    }
  }

  // 2. Check local workspace state for sandbox/offline mode
  try {
    const local = getLocalSanctuaryState()
    if (local?.profile?.onboardingDone || (local?.spaces && local.spaces.length > 0)) {
      return '/home'
    }
  } catch {}

  return '/sanctuary/login'
}

/**
 * Renders an instant, unstyled-flash-free educational article overlay to immediately
 * mask any chat or interface before redirection completes.
 */
export function displayDecoyCover(): void {
  if (typeof document === 'undefined') return
  try {
    const existing = document.getElementById('__sanctuary_panic_decoy')
    if (existing) return

    const decoy = document.createElement('div')
    decoy.id = '__sanctuary_panic_decoy'
    decoy.setAttribute('role', 'region')
    decoy.setAttribute('aria-label', 'Philosophical Inquiries')
    decoy.style.cssText = [
      'position: fixed',
      'inset: 0',
      'z-index: 2147483647',
      'background-color: #faf9f6',
      'color: #1c1917',
      'font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
      'padding: 3.5rem 1.5rem',
      'overflow: hidden',
      'display: flex',
      'flex-direction: column',
      'align-items: center',
      'justify-content: flex-start',
    ].join(';')

    decoy.innerHTML = `
      <div style="max-width: 44rem; width: 100%; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem;">
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.12em; color: #78716c;">
          Commonplace &bull; Philosophy &amp; Stoicism
        </div>
        <h1 style="font-size: 2.25rem; font-weight: 700; line-height: 1.25; color: #1c1917; margin: 0; letter-spacing: -0.02em;">
          On the Tranquility of the Mind
        </h1>
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 0.875rem; color: #78716c; border-bottom: 1px solid #e7e5e4; padding-bottom: 1rem;">
          Lucius Annaeus Seneca &bull; Classical Reflections
        </div>
        <p style="font-size: 1.125rem; line-height: 1.8; color: #292524; margin: 0;">
          It is not that we have so little time, but that we lose so much. The life we receive is not short, but we make it so; we are not ill provided, but use what we have wastefully. When life is consumed in heedless luxury and no good goal, we are driven at last by extreme necessity to realize that it has passed away before we were conscious that it was passing.
        </p>
      </div>
    `
    document.body.appendChild(decoy)
  } catch {}
}

export interface PanicBurnOptions {
  destination?: string
}

/**
 * Emergency Panic Burn: Irreversibly wipes all sanctuary traces from device and redirects.
 */
export async function triggerPanicBurn(options?: PanicBurnOptions): Promise<void> {
  const destination = options?.destination || '/philosophy'

  if (typeof window === 'undefined') return

  // 1. Instant Decoy Cover: eliminates any trace or flash on screen
  displayDecoyCover()

  // 2. Revoke all active blob URLs
  try {
    revokeAllBlobUrls()
  } catch {}

  // 3. Clear in-memory caches
  try {
    wipeLocalSanctuaryMemory()
  } catch {}

  // 4. Wipe localStorage traces: sanctuary:*, supabase.*, sb-*, matrix*, etc.
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key) continue
      const lower = key.toLowerCase()
      if (
        lower.startsWith('sanctuary:') ||
        lower.startsWith('supabase.') ||
        lower.startsWith('sb-') ||
        lower.includes('sanctuary') ||
        lower.includes('matrix') ||
        lower.includes('supabase') ||
        key === 'project00_editorial_reader_name'
      ) {
        keysToRemove.push(key)
      }
    }
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key)
    }
  } catch (e) {
    console.error('Failed to wipe localStorage:', e)
  }

  // 5. Clear sessionStorage
  try {
    window.sessionStorage.clear()
  } catch (e) {
    console.error('Failed to clear sessionStorage:', e)
  }

  // 6. Sign out from Supabase client (clear auth session cookies)
  try {
    if (isSupabaseClientConfigured()) {
      const supabase = createClient()
      await supabase.auth.signOut({ scope: 'local' })
    }
  } catch (e) {
    console.warn('Supabase signOut error during panic burn:', e)
  }

  // 7. Expire client-accessible cookies
  try {
    const cookies = document.cookie.split(';')
    for (const c of cookies) {
      const eqPos = c.indexOf('=')
      const name = (eqPos > -1 ? c.substring(0, eqPos) : c).trim()
      const lower = name.toLowerCase()
      if (
        lower.startsWith('sb-') ||
        lower.includes('supabase') ||
        lower.includes('sanctuary') ||
        lower.includes('auth')
      ) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`
      }
    }
  } catch {}

  // 8. Hard redirect so browser back button CANNOT return to chat!
  window.location.replace(destination)
}

export interface HandleStealthInputResult {
  handled: boolean
  action: 'doorway' | 'panic' | null
}

export interface StealthRouterLike {
  push: (url: string) => void
  replace?: (url: string) => void
}

/**
 * Evaluates an input string. If it matches a secret doorway or panic code,
 * executes the appropriate action and returns { handled: true, action }.
 * If not, returns { handled: false, action: null }.
 */
export async function handleStealthInput(
  input: string,
  router?: StealthRouterLike
): Promise<HandleStealthInputResult> {
  const codeType = classifyStealthCode(input)

  if (codeType === 'panic') {
    await triggerPanicBurn({ destination: '/philosophy' })
    return { handled: true, action: 'panic' }
  }

  if (codeType === 'doorway') {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(new CustomEvent('sanctuary:open-stealth-overlay', { detail: { code: input } }))
      } catch {}
    }
    const destination = await getStealthDoorwayDestination()
    if (router) {
      router.push(destination)
    } else if (typeof window !== 'undefined') {
      window.location.href = destination
    }
    return { handled: true, action: 'doorway' }
  }

  return { handled: false, action: null }
}

export const DECOY_PRESETS = [
  'Stoic Notes',
  'Research Draft',
  'Reading Journal',
  'Philosophy Seminar',
  'Marcus Aurelius Meditations',
]

export function getDecoyPreset(index: number, custom?: string): string {
  if (custom && custom.trim()) return custom.trim()
  return DECOY_PRESETS[index % DECOY_PRESETS.length] || 'Reading Notes'
}

export function getDecoyAlias(name: string, index = 0, custom?: string): string {
  if (custom && custom.trim()) return custom.trim()
  return getDecoyPreset(index)
}

export async function wipeSanctuarySession(): Promise<void> {
  wipeLocalSanctuaryMemory()
  revokeAllBlobUrls()
  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (!key) continue
        const lower = key.toLowerCase()
        if (
          lower.startsWith('sanctuary:') ||
          lower.startsWith('supabase.') ||
          lower.startsWith('sb-') ||
          lower.includes('sanctuary') ||
          lower.includes('matrix') ||
          lower.includes('supabase')
        ) {
          keysToRemove.push(key)
        }
      }
      for (const k of keysToRemove) window.localStorage.removeItem(k)
      window.sessionStorage.clear()
    } catch {}
  }
}

