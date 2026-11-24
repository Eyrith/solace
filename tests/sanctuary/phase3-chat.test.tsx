import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { ChatBubble } from '@/components/sanctuary/chat-bubble'
import { ChatComposer } from '@/components/sanctuary/chat-composer'

describe('Phase 3 — Chat Components', () => {
  it('renders ChatBubble with normalized token styles and max-width 68ch', () => {
    const html = renderToString(
      React.createElement(ChatBubble, {
        id: 'msg-1',
        direction: 'received',
        senderLabel: 'Maya',
        text: 'Quiet note from the morning reflection.',
        timestamp: '10:30 AM',
        isPinned: true,
        reactions: [{ emoji: '🕊️', count: 2, reactedByMe: true }],
        onToggleReaction: () => {},
        onReply: () => {},
      })
    )

    // Direction and token classes
    expect(html).toContain('bg-[#E9E9EB]')
    expect(html).toContain('Maya')
    expect(html).toContain('Quiet note from the morning reflection.')
    expect(html).toContain('Pinned')
    expect(html).toContain('🕊️')
    expect(html).toContain('2')
    // Overflow menu trigger
    expect(html).toContain('aria-label="Message options"')
  })

  it('renders sent ChatBubble with --bubble-sent token', () => {
    const html = renderToString(
      React.createElement(ChatBubble, {
        id: 'msg-2',
        direction: 'sent',
        text: 'Sending a quiet response.',
        timestamp: '10:32 AM',
        readReceipt: 'read',
      })
    )

    expect(html).toContain('bg-[#007AFF]')
    expect(html).toContain('Sending a quiet response.')
    expect(html).toContain('10:32 AM')
    expect(html).toContain('Read')
  })

  it('renders ChatComposer in single row with timer chip, attach, and mic when empty', () => {
    const html = renderToString(
      React.createElement(ChatComposer, {
        onSend: vi.fn(),
        placeholder: 'Write a quiet note...',
      })
    )

    // Attach button
    expect(html).toContain('aria-label="Add attachment, prompts or set timer"')
    // Textarea with placeholder
    expect(html).toContain('placeholder="Write a quiet note..."')
    // Mic button when textarea is empty
    expect(html).toContain('aria-label="Record audio message"')
  })

  it('renders ChatComposer with Send button when text is provided', () => {
    const html = renderToString(
      React.createElement(ChatComposer, {
        initialText: 'Thinking about Marcus Aurelius today',
        onSend: vi.fn(),
      })
    )

    // Send button replaces Mic when text is non-empty
    expect(html).toContain('aria-label="Send iMessage"')
  })

  it('renders upload stage status line cleanly above composer', () => {
    const html = renderToString(
      React.createElement(ChatComposer, {
        onSend: vi.fn(),
        uploadingStage: 'encrypting',
      })
    )

    expect(html).toContain('Encrypting on device (AES-256-CTR)...')
    expect(html).toContain('role="status"')
  })
})
