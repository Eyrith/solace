import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { renderToString } from 'react-dom/server'
import {
  triggerHaptic,
  playBedtimeSound,
  type HapticType,
} from '@/lib/sanctuary/mobile-haptics'
import { GAME_TEMPLATES, KULFI_STAKES } from '@/lib/games/data'
import { CoOpVessel } from '@/components/sanctuary/games/co-op-vessel'

describe('Kulfi App Inspiration & Mechanics', () => {
  describe('Mobile Haptics & Bedtime Audio Engine', () => {
    let originalVibrate: any
    let originalWindow: any

    beforeEach(() => {
      originalWindow = (globalThis as any).window
      ;(globalThis as any).window = globalThis
      originalVibrate = (globalThis as any).navigator?.vibrate
    })

    afterEach(() => {
      ;(globalThis as any).window = originalWindow
      if ((globalThis as any).navigator) {
        ;(globalThis as any).navigator.vibrate = originalVibrate
      }
    })

    it('triggers haptic pulses using navigator.vibrate when available', () => {
      const vibrateMock = vi.fn()
      Object.defineProperty(globalThis, 'navigator', {
        value: { vibrate: vibrateMock },
        writable: true,
        configurable: true,
      })

      triggerHaptic('light')
      expect(vibrateMock).toHaveBeenCalledWith(15)

      triggerHaptic('heavy')
      expect(vibrateMock).toHaveBeenCalledWith(55)

      triggerHaptic('lantern')
      expect(vibrateMock).toHaveBeenCalledWith([20, 30, 50])

      triggerHaptic('clash')
      expect(vibrateMock).toHaveBeenCalledWith([80, 50, 80])
    })

    it('does not throw when navigator.vibrate is missing or fails', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      })

      expect(() => triggerHaptic('success')).not.toThrow()
    })

    it('plays bedtime synthesized sound effects cleanly', () => {
      const mockOscillator = {
        type: 'sine',
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }
      const mockGain = {
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      }
      const mockAudioContext = vi.fn().mockImplementation(() => ({
        currentTime: 0,
        destination: {},
        createOscillator: vi.fn(() => mockOscillator),
        createGain: vi.fn(() => mockGain),
      }))

      ;(globalThis as any).AudioContext = mockAudioContext

      expect(() => playBedtimeSound('paddle')).not.toThrow()
      expect(() => playBedtimeSound('lantern')).not.toThrow()
      expect(() => playBedtimeSound('clash')).not.toThrow()
      expect(() => playBedtimeSound('lock')).not.toThrow()
      expect(() => playBedtimeSound('success')).not.toThrow()
    })
  })

  describe('Game Templates & Kulfi Stakes Data', () => {
    it('includes Kulfi Split-Control Co-Op template in GAME_TEMPLATES', () => {
      const coop = GAME_TEMPLATES.find((g) => g.id === 'game-coop-river-01')
      expect(coop).toBeDefined()
      expect(coop?.category).toBe('co_op')
      expect(coop?.title).toContain('Two-Boat River')
      expect(coop?.questions.length).toBeGreaterThanOrEqual(3)
    })

    it('includes Kulfi Bedtime Showdown & Dilemmas', () => {
      const likely = GAME_TEMPLATES.find((g) => g.id === 'game-likely-01')
      const dilemmas = GAME_TEMPLATES.find((g) => g.id === 'game-dilemmas-01')
      expect(likely).toBeDefined()
      expect(dilemmas).toBeDefined()
    })

    it('declares authentic Kulfi forfeit stakes', () => {
      expect(KULFI_STAKES.length).toBeGreaterThanOrEqual(5)
      expect(KULFI_STAKES.some((s) => s.includes('chai/coffee'))).toBe(true)
      expect(KULFI_STAKES.some((s) => s.includes('dessert'))).toBe(true)
      expect(KULFI_STAKES.some((s) => s.includes('massage'))).toBe(true)
    })
  })

  describe('Co-Op Vessel Component Rendering', () => {
    it('renders Two-Boat River HUD and controls dock in server render', () => {
      const html = renderToString(
        React.createElement(CoOpVessel, {
          spaceId: 'space-test',
          partnerName: 'TestPartner',
          defaultRole: 'solo_split',
        })
      )

      expect(html).toContain('Two-Boat River')
      expect(html).toContain('Shared Screen')
      expect(html).toContain('Helm (Steer)')
      expect(html).toContain('Engine (Speed)')
      expect(html).toContain('Launch Shared Vessel')
    })

    it('supports individual Helm and Engine role rendering', () => {
      const helmHtml = renderToString(
        React.createElement(CoOpVessel, {
          spaceId: 'space-test',
          partnerName: 'TestPartner',
          defaultRole: 'helm',
        })
      )
      expect(helmHtml).toContain('Helm Master · Steer Boat')

      const engineHtml = renderToString(
        React.createElement(CoOpVessel, {
          spaceId: 'space-test',
          partnerName: 'TestPartner',
          defaultRole: 'engine',
        })
      )
      expect(engineHtml).toContain('Engine Room · Throttle')
    })
  })
})
