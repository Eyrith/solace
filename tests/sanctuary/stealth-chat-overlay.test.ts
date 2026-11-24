import { describe, expect, it } from 'vitest'
import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { StealthChatOverlay } from '@/components/sanctuary/stealth-chat-overlay'

describe('StealthChatOverlay Component', () => {
  it('does not render any HTML when isOpen is false', () => {
    const html = renderToString(
      React.createElement(StealthChatOverlay, {
        isOpen: false,
        onClose: () => {},
      })
    )
    expect(html).toBe('')
  })

  it('renders disguised header and messages when isOpen is true', () => {
    const html = renderToString(
      React.createElement(StealthChatOverlay, {
        isOpen: true,
        onClose: () => {},
        partnerName: 'Maya',
        partnerAlias: 'Solitude Research Notes',
      })
    )

    // Disguised / active header
    expect(html).toContain('Maya')
    expect(html).toContain('Direct P2P Encrypted')

    // Disguised security pill
    expect(html).toContain('Zero-Trace Session')
    expect(html).toContain('Persistent P2P')

    // Action buttons (FaceTime, Minimize, Emergency Panic)
    expect(html).toContain('Start iOS FaceTime Call')
    expect(html).toContain('Minimize back to reading')
    expect(html).toContain('Emergency Panic Wipe')

    // Media & blur-to-reveal controls
    expect(html).toContain('Burn')
    expect(html).toContain('Whisper a private note...')
    expect(html).toContain('Thinking of you')
  })

  it('renders camouflage partner alias when configured', () => {
    const html = renderToString(
      React.createElement(StealthChatOverlay, {
        isOpen: true,
        onClose: () => {},
        partnerName: 'Maya',
        partnerAlias: 'Solitude Research Notes',
      })
    )

    // Both partner and alias are available for seamless disguise
    expect(html).toContain('Maya')
    expect(html).toContain('Tap to toggle camouflage disguise')
  })
})
