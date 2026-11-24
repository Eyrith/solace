import { describe, it, expect, beforeEach, beforeAll, vi, afterEach } from 'vitest'
import {
  DEFAULT_DOORWAY_CODES,
  DEFAULT_PANIC_CODES,
  classifyStealthCode,
  getConfiguredDoorwayCodes,
  getConfiguredPanicCodes,
  handleStealthInput,
  isDoorwayCode,
  isPanicCode,
  registerBlobUrl,
  revokeAllBlobUrls,
  setCustomDoorwayCode,
  setCustomPanicCode,
  triggerPanicBurn,
} from '@/lib/sanctuary/stealth'

function createMockStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
}

describe('Stealth Doorway and Emergency Panic Burn Key', () => {
  const domElements = new Map<string, any>()
  let replaceMock: ReturnType<typeof vi.fn>

  beforeAll(() => {
    const localStorage = createMockStorage()
    const sessionStorage = createMockStorage()
    replaceMock = vi.fn()

    const mockWindow: any = {
      localStorage,
      sessionStorage,
      location: {
        replace: replaceMock,
        href: '',
        hostname: 'solace.dpdns.org',
      },
    }

    const mockDocument: any = {
      getElementById: (id: string) => domElements.get(id) ?? null,
      createElement: (tag: string) => {
        const el: any = {
          tagName: tag.toUpperCase(),
          style: {},
          setAttribute: vi.fn(),
          innerHTML: '',
          remove: () => {
            if (el.id) domElements.delete(el.id)
          },
        }
        return el
      },
      body: {
        appendChild: (el: any) => {
          if (el.id) domElements.set(el.id, el)
          return el
        },
      },
      querySelectorAll: () => [],
      cookie: '',
    }

    ;(globalThis as any).window = mockWindow
    ;(globalThis as any).document = mockDocument
    if (!globalThis.URL) {
      ;(globalThis as any).URL = {}
    }
    globalThis.URL.createObjectURL = vi.fn((blob) => 'blob:mock-url')
    globalThis.URL.revokeObjectURL = vi.fn()
  })

  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    domElements.clear()
    replaceMock.mockClear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    domElements.clear()
  })

  describe('Code Detection & Classification', () => {
    it('detects default doorway codes case-insensitively with trimming', () => {
      expect(isDoorwayCode('//open')).toBe(true)
      expect(isDoorwayCode('  //OPEN  ')).toBe(true)
      expect(isDoorwayCode('//solace')).toBe(true)
      expect(isDoorwayCode(' //Solace ')).toBe(true)

      expect(classifyStealthCode('//open')).toBe('doorway')
      expect(classifyStealthCode('//solace')).toBe('doorway')
    })

    it('detects default panic burn codes case-insensitively with trimming', () => {
      expect(isPanicCode('//burn')).toBe(true)
      expect(isPanicCode('  //BURN ')).toBe(true)
      expect(isPanicCode('//panic')).toBe(true)
      expect(isPanicCode(' 911 ')).toBe(true)
      expect(isPanicCode('911')).toBe(true)

      expect(classifyStealthCode('//burn')).toBe('panic')
      expect(classifyStealthCode('//panic')).toBe('panic')
      expect(classifyStealthCode('911')).toBe('panic')
    })

    it('does not classify standard educational search queries as stealth codes', () => {
      expect(isDoorwayCode('Marcus Aurelius')).toBe(false)
      expect(isPanicCode('Marcus Aurelius')).toBe(false)
      expect(classifyStealthCode('Stoic philosophy of emotion')).toBeNull()
      expect(classifyStealthCode('Psychology of vulnerability')).toBeNull()
      expect(classifyStealthCode('')).toBeNull()
    })

    it('supports custom configurable doorway passcode', () => {
      setCustomDoorwayCode('//whisper')
      expect(getConfiguredDoorwayCodes()).toContain('//whisper')
      expect(isDoorwayCode('//whisper')).toBe(true)
      expect(classifyStealthCode('//whisper')).toBe('doorway')

      setCustomDoorwayCode(null)
      expect(isDoorwayCode('//whisper')).toBe(false)
    })

    it('supports custom configurable panic passcode', () => {
      setCustomPanicCode('//wipeout')
      expect(getConfiguredPanicCodes()).toContain('//wipeout')
      expect(isPanicCode('//wipeout')).toBe(true)
      expect(classifyStealthCode('//wipeout')).toBe('panic')

      setCustomPanicCode(null)
      expect(isPanicCode('//wipeout')).toBe(false)
    })
  })

  describe('Blob URL Tracking and Revocation', () => {
    it('tracks and revokes active blob URLs upon request', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      const blobUrl1 = 'blob:http://localhost/test-uuid-1'
      const blobUrl2 = 'blob:http://localhost/test-uuid-2'

      registerBlobUrl(blobUrl1)
      registerBlobUrl(blobUrl2)

      revokeAllBlobUrls()

      expect(revokeSpy).toHaveBeenCalledWith(blobUrl1)
      expect(revokeSpy).toHaveBeenCalledWith(blobUrl2)
    })
  })

  describe('Doorway Handling', () => {
    it('intercepts doorway code and navigates via router without submitting search', async () => {
      const mockRouter = {
        push: vi.fn(),
      }

      const result = await handleStealthInput('//open', mockRouter)
      expect(result.handled).toBe(true)
      expect(result.action).toBe('doorway')
      expect(mockRouter.push).toHaveBeenCalledTimes(1)
      const target = mockRouter.push.mock.calls[0][0]
      expect(['/home', '/sanctuary/login']).toContain(target)
    })

    it('returns false when input is normal text', async () => {
      const mockRouter = {
        push: vi.fn(),
      }

      const result = await handleStealthInput('Stoicism', mockRouter)
      expect(result.handled).toBe(false)
      expect(result.action).toBeNull()
      expect(mockRouter.push).not.toHaveBeenCalled()
    })
  })

  describe('Emergency Panic Burn Execution', () => {
    it('wipes all sanctuary, supabase, matrix localStorage keys and sessionStorage', async () => {
      // Seed data into localStorage
      window.localStorage.setItem('sanctuary:active-space-id', 'space-1')
      window.localStorage.setItem('sanctuary:local-workspace:v1', '{"spaces":[]}')
      window.localStorage.setItem('supabase.auth.token', 'mock-token')
      window.localStorage.setItem('sb-test-auth-token', 'mock-sb-token')
      window.localStorage.setItem('matrix_user_id', '@user:matrix.dpdns.org')
      window.localStorage.setItem('project00_editorial_reader_name', 'reader@example.com')
      // Non-sanctuary item to verify selective wipe
      window.localStorage.setItem('other_app_setting', 'keep-me')

      window.sessionStorage.setItem('sanctuary:transient', 'temp-val')

      await triggerPanicBurn({ destination: '/philosophy' })

      // Verify localStorage traces wiped
      expect(window.localStorage.getItem('sanctuary:active-space-id')).toBeNull()
      expect(window.localStorage.getItem('sanctuary:local-workspace:v1')).toBeNull()
      expect(window.localStorage.getItem('supabase.auth.token')).toBeNull()
      expect(window.localStorage.getItem('sb-test-auth-token')).toBeNull()
      expect(window.localStorage.getItem('matrix_user_id')).toBeNull()
      expect(window.localStorage.getItem('project00_editorial_reader_name')).toBeNull()

      // Non-sanctuary setting preserved
      expect(window.localStorage.getItem('other_app_setting')).toBe('keep-me')

      // Verify sessionStorage wiped
      expect(window.sessionStorage.length).toBe(0)

      // Verify Seneca decoy educational overlay rendered
      const decoy = document.getElementById('__sanctuary_panic_decoy')
      expect(decoy).not.toBeNull()
      expect(decoy?.innerHTML).toContain('On the Tranquility of the Mind')
      expect(decoy?.innerHTML).toContain('Lucius Annaeus Seneca')

      // Verify hard redirect called to prevent browser back navigation
      expect(replaceMock).toHaveBeenCalledWith('/philosophy')
    })

    it('handleStealthInput triggers panic burn on 911 or //panic', async () => {
      const res = await handleStealthInput('911')
      expect(res.handled).toBe(true)
      expect(res.action).toBe('panic')
      expect(replaceMock).toHaveBeenCalledWith('/philosophy')
    })
  })
})
