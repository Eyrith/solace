import { describe, expect, it } from 'vitest'
import * as React from 'react'
import { renderToString } from 'react-dom/server'
import {
  FaceTimeStage,
  formatFaceTimeDuration,
} from '@/components/sanctuary/facetime-stage'

describe('iOS FaceTime Video Call Stage', () => {
  describe('Duration formatting', () => {
    it('formats short durations as MM:SS', () => {
      expect(formatFaceTimeDuration(0)).toBe('00:00')
      expect(formatFaceTimeDuration(9)).toBe('00:09')
      expect(formatFaceTimeDuration(65)).toBe('01:05')
      expect(formatFaceTimeDuration(599)).toBe('09:59')
      expect(formatFaceTimeDuration(3599)).toBe('59:59')
    })

    it('formats durations over an hour as HH:MM:SS', () => {
      expect(formatFaceTimeDuration(3600)).toBe('01:00:00')
      expect(formatFaceTimeDuration(3665)).toBe('01:01:05')
      expect(formatFaceTimeDuration(7322)).toBe('02:02:02')
    })
  })

  describe('Sandbox Fallback and Component Structure', () => {
    it('renders the iOS FaceTime stage in sandbox mode with full chrome', () => {
      const html = renderToString(
        React.createElement(FaceTimeStage, {
          partnerName: 'Elena Rostova',
          callType: 'video',
          isDemo: true,
          duration: 125,
          onEndCall: () => {},
        }),
      )

      // Partner name in HUD
      expect(html).toContain('Elena Rostova')

      // Formatted live duration (02:05)
      expect(html).toContain('02:05')

      // E2EE shield
      expect(html).toContain('E2EE')

      // Floating squircle self-view PiP classes (rounded-3xl / 24px squircle and border)
      expect(html).toContain('rounded-3xl')
      expect(html).toContain('rounded-[24px]')
      expect(html).toContain('border-white/20')
      expect(html).toContain('shadow-2xl')

      // Floating glassmorphic bottom pill controls
      expect(html).toContain('bg-black/45')
      expect(html).toContain('backdrop-blur-2xl')
      expect(html).toContain('rounded-full')

      // End Call button with bright red #DC2626
      expect(html).toContain('bg-[#DC2626]')

      // Tactile control buttons aria labels
      expect(html).toContain('Mute microphone')
      expect(html).toContain('Turn off camera')
      expect(html).toContain('Flip camera')
      expect(html).toContain('End call')
    })

    it('supports voice-only mode with appropriate initial labels and avatar poster', () => {
      const html = renderToString(
        React.createElement(FaceTimeStage, {
          partnerName: 'Julian',
          callType: 'voice',
          isDemo: true,
          duration: 45,
          onEndCall: () => {},
        }),
      )

      expect(html).toContain('Julian')
      expect(html).toContain('00:45')
      expect(html).toContain('Turn on camera')
      expect(html).toContain('E2EE')
    })
  })
})
