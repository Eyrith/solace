'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Video,
  Phone,
  Pin,
  Search,
  MoreVertical,
  Clock,
  Sparkles,
  Heart,
  Smile,
  Mic,
  Camera,
  X,
  Volume2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ChatBubble, type BubbleReaction } from '@/components/sanctuary/chat-bubble'
import { ChatComposer, type DisappearingPreset } from '@/components/sanctuary/chat-composer'
import { TypingIndicator } from '@/components/sanctuary/typing-indicator'
import { useDesignSystem } from '@/components/providers/design-system-provider'

interface ActiveMessage {
  id: string
  direction: 'sent' | 'received'
  text?: string
  timestamp: string
  voiceDurationSeconds?: number
  replyPreview?: string
  edited?: boolean
  readReceipt?: 'sent' | 'delivered' | 'read'
  disappearing?: DisappearingPreset
  disappearingLabel?: string
  expiresAt?: number // epoch timestamp in ms for live disappearing
  reactions?: BubbleReaction[]
  isPinned?: boolean
}

const INITIAL_MESSAGES: ActiveMessage[] = [
  {
    id: 'msg-1',
    direction: 'received',
    text: 'Good morning darling. Did you sleep peacefully?',
    timestamp: '08:42 AM',
    readReceipt: 'read',
    reactions: [{ emoji: '🕊️', count: 1, reactedByMe: true }],
  },
  {
    id: 'msg-2',
    direction: 'sent',
    text: 'I did. Was reading that Simone Weil essay from Psyche you recommended. Loved the part about attention as generosity.',
    timestamp: '08:45 AM',
    readReceipt: 'read',
    reactions: [{ emoji: '❤️', count: 1, reactedByMe: false }],
  },
  {
    id: 'msg-3',
    direction: 'received',
    text: 'That passage reminded me so much of how you listen to me when I am stressed.',
    timestamp: '08:47 AM',
    readReceipt: 'read',
    isPinned: true,
  },
  {
    id: 'msg-4',
    direction: 'sent',
    text: 'Sending a quiet voice thought from my walk...',
    timestamp: '09:02 AM',
    voiceDurationSeconds: 14,
    readReceipt: 'read',
  },
  {
    id: 'msg-5',
    direction: 'received',
    text: 'Here is a secret that disappears in 5 minutes after viewing :)',
    timestamp: '09:15 AM',
    disappearing: '5m',
    disappearingLabel: '5m after view',
    readReceipt: 'read',
  },
]

export default function SpaceMessagesPage() {
  const params = useParams()
  const spaceId = params.spaceId as string
  const { bubbleStyle } = useDesignSystem()

  const [messages, setMessages] = React.useState<ActiveMessage[]>(INITIAL_MESSAGES)
  const [partnerTyping, setPartnerTyping] = React.useState(false)
  const [replyingTo, setReplyingTo] = React.useState<ActiveMessage | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [showSearch, setShowSearch] = React.useState(false)
  const [pinnedOpen, setPinnedOpen] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages, partnerTyping])

  // Handle sending new message
  const handleSend = (text: string, disappearing: DisappearingPreset) => {
    if (!text.trim()) return

    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    let disappearingLabel: string | undefined
    if (disappearing === 'just_seen') disappearingLabel = 'Disappears on view'
    else if (disappearing === '1s') disappearingLabel = '1s after view'
    else if (disappearing === '5m') disappearingLabel = '5m after view'
    else if (disappearing === '1h') disappearingLabel = '1h after view'
    else if (disappearing === '24h') disappearingLabel = '24 hours'

    const newMsg: ActiveMessage = {
      id: `msg-${Date.now()}`,
      direction: 'sent',
      text,
      timestamp: timeStr,
      readReceipt: 'delivered',
      replyPreview: replyingTo?.text ? replyingTo.text.slice(0, 60) : undefined,
      disappearing,
      disappearingLabel,
    }

    setMessages((prev) => [...prev, newMsg])
    setReplyingTo(null)

    // Simulate partner reaction or soft reply
    setTimeout(() => {
      setPartnerTyping(true)
      setTimeout(() => {
        setPartnerTyping(false)
        const partnerMsg: ActiveMessage = {
          id: `msg-${Date.now() + 1}`,
          direction: 'received',
          text: '❤️ Always here with you.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          readReceipt: 'read',
        }
        setMessages((prev) => [...prev, partnerMsg])
      }, 2200)
    }, 1200)
  }

  // Handle reaction toggle
  const handleToggleReaction = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m

        const currentReactions = m.reactions || []
        const existing = currentReactions.find((r) => r.emoji === emoji)

        let nextReactions: BubbleReaction[]
        if (existing) {
          if (existing.reactedByMe) {
            nextReactions = currentReactions
              .map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1, reactedByMe: false } : r))
              .filter((r) => r.count > 0)
          } else {
            nextReactions = currentReactions.map((r) =>
              r.emoji === emoji ? { ...r, count: r.count + 1, reactedByMe: true } : r
            )
          }
        } else {
          nextReactions = [...currentReactions, { emoji, count: 1, reactedByMe: true }]
        }

        return { ...m, reactions: nextReactions }
      })
    )
  }

  // Handle reply
  const handleReply = (messageId: string) => {
    const target = messages.find((m) => m.id === messageId)
    if (target) setReplyingTo(target)
  }

  // Send voice note
  const handleRecordVoice = () => {
    const newVoiceMsg: ActiveMessage = {
      id: `voice-${Date.now()}`,
      direction: 'sent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      voiceDurationSeconds: 8,
      readReceipt: 'delivered',
    }
    setMessages((prev) => [...prev, newVoiceMsg])
  }

  const pinnedMessages = messages.filter((m) => m.isPinned)
  const displayMessages = searchQuery.trim()
    ? messages.filter((m) => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] max-w-4xl mx-auto border-x border-[var(--border)] bg-[var(--background)]">
      {/* ── Room Header ────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xs sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="sm:hidden">
            <Link href="/home">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>

          <Avatar className="h-9 w-9 border border-[var(--border)]">
            <AvatarFallback className="bg-[var(--primary)]/10 text-[var(--primary)] font-medium text-xs">
              M
            </AvatarFallback>
          </Avatar>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-[var(--foreground)] leading-none">
                My Partner
              </h1>
              <span className="h-2 w-2 rounded-full bg-emerald-500" title="Online" />
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] leading-none">
              In Sanctuary · End-to-end isolated
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {pinnedMessages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPinnedOpen((prev) => !prev)}
              aria-label="View pinned memories"
              className={pinnedOpen ? 'bg-[var(--muted)] text-[var(--primary)]' : ''}
            >
              <Pin className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch((prev) => !prev)}
            aria-label="Search conversation"
          >
            <Search className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" asChild aria-label="1:1 Voice Call">
            <Link href="/calls">
              <Phone className="h-4 w-4" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild aria-label="1:1 Video Call">
            <Link href="/calls">
              <Video className="h-4 w-4 text-[var(--primary)]" />
            </Link>
          </Button>
        </div>
      </header>

      {/* ── Search in Chat Drawer ───────────────────────────────────────────── */}
      {showSearch && (
        <div className="p-2 border-b border-[var(--border)] bg-[var(--muted)]/30 flex items-center gap-2">
          <Search className="h-4 w-4 text-[var(--muted-foreground)] ml-2" />
          <input
            type="text"
            placeholder="Search notes in this private space..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-[var(--foreground)] focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-1 text-[var(--muted-foreground)]">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowSearch(false)} className="text-xs h-7">
            Close
          </Button>
        </div>
      )}

      {/* ── Pinned Message Strip ────────────────────────────────────────────── */}
      {pinnedOpen && pinnedMessages.length > 0 && (
        <div className="bg-[var(--card)] border-b border-[var(--border)] px-4 py-2 text-xs flex items-center justify-between text-[var(--muted-foreground)]">
          <div className="flex items-center gap-2 truncate">
            <Pin className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />
            <span className="font-medium text-[var(--foreground)]">Pinned:</span>
            <span className="truncate">&ldquo;{pinnedMessages[0].text}&rdquo;</span>
          </div>
          <button onClick={() => setPinnedOpen(false)} className="text-[11px] hover:underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* ── Conversation Stream ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* Date separator */}
        <div className="flex items-center justify-center my-2">
          <span className="text-[11px] font-medium text-[var(--muted-foreground)] bg-[var(--muted)]/60 px-3 py-1 rounded-full">
            Today
          </span>
        </div>

        {displayMessages.map((msg) => (
          <div key={msg.id} className="relative group/msg">
            <ChatBubble
              id={msg.id}
              direction={msg.direction}
              text={msg.text}
              timestamp={msg.timestamp}
              bubbleStyle={bubbleStyle}
              voiceDurationSeconds={msg.voiceDurationSeconds}
              replyPreview={msg.replyPreview}
              edited={msg.edited}
              readReceipt={msg.readReceipt}
              disappearingLabel={msg.disappearingLabel}
              reactions={msg.reactions}
              onToggleReaction={handleToggleReaction}
              onReply={handleReply}
            />

            {/* Quick reaction hover shortcut */}
            <div
              className={`absolute top-0 hidden group-hover/msg:flex items-center gap-1 rounded-full bg-[var(--card)] border border-[var(--border)] shadow-xs px-2 py-0.5 z-10 ${
                msg.direction === 'sent' ? 'right-0 -translate-y-4' : 'left-0 -translate-y-4'
              }`}
            >
              {['❤️', '🥰', '🫂', '🕊️'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleToggleReaction(msg.id, emoji)}
                  className="text-xs hover:scale-125 transition-transform p-0.5 cursor-pointer"
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}

        {partnerTyping && <TypingIndicator partnerName="Partner" />}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Replying Banner ─────────────────────────────────────────────────── */}
      {replyingTo && (
        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--muted)]/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="text-[var(--primary)] font-medium">Replying to:</span>
            <span className="truncate text-[var(--muted-foreground)]">
              {replyingTo.text || 'Voice note'}
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Chat Composer ───────────────────────────────────────────────────── */}
      <footer className="p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--background)]">
        <ChatComposer
          onSend={handleSend}
          onRecordVoice={handleRecordVoice}
          onAttachMedia={() => {
            handleSend('Shared a sunset photo [photo.jpg]', 'off')
          }}
          placeholder="Send a quiet note... (Shift+Enter for newline)"
        />
      </footer>
    </div>
  )
}

