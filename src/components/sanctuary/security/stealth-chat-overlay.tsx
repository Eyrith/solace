'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Video,
  X,
  Flame,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  Sparkles,
  ShieldCheck,
  Minimize2,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { triggerPanicBurn } from '@/lib/sanctuary/stealth'
import { FaceTimeStage } from '@/components/sanctuary/facetime-stage'

export interface StealthMessage {
  id: string
  sender: 'me' | 'partner'
  text: string
  mediaUrl?: string | null
  mediaType?: 'image' | 'audio' | 'video' | null
  created_at: string
  burnAfterSeconds?: number | null
}

export interface StealthChatOverlayProps {
  isOpen: boolean
  onClose: () => void
  partnerName?: string
  partnerAlias?: string
}

export function StealthChatOverlay({
  isOpen,
  onClose,
  partnerName = 'My Partner',
  partnerAlias = 'Reading Group Notes',
}: StealthChatOverlayProps) {
  const [messages, setMessages] = React.useState<StealthMessage[]>(() => [
    {
      id: 'demo-1',
      sender: 'partner',
      text: 'Hey... did you read the latest chapter on solitude? Are you free to call?',
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
      id: 'demo-2',
      sender: 'me',
      text: 'Just opened Meridian. Yeah, give me one second!',
      created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    },
  ])
  const [inputText, setInputText] = React.useState('')
  const [revealedMedia, setRevealedMedia] = React.useState<Record<string, boolean>>({})
  const [camouflageMode, setCamouflageMode] = React.useState(false)
  const [inFaceTimeCall, setInFaceTimeCall] = React.useState(false)
  const [burnTimer, setBurnTimer] = React.useState<number | null>(null)
  const [isTyping, setIsTyping] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null)

  // Fetch messages from backend when opened
  React.useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    async function loadMessages() {
      try {
        const res = await fetch('/api/stealth/messages', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.messages && data.messages.length > 0) {
            setMessages(data.messages)
          }
        }
      } catch {
        // Fall back to in-memory state
      }
    }

    void loadMessages()

    // Setup WebSocket for live messaging if supported
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/stealth/ws`
    let ws: WebSocket | null = null

    try {
      ws = new WebSocket(wsUrl)
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.type === 'new_message' && payload.message) {
            setMessages((prev) => [...prev, payload.message])
          } else if (payload.type === 'panic_wipe') {
            void triggerPanicBurn({ destination: '/philosophy' })
          } else if (payload.type === 'typing') {
            setIsTyping(true)
            setTimeout(() => setIsTyping(false), 2500)
          }
        } catch {}
      }
    } catch {}

    return () => {
      cancelled = true
      if (ws) ws.close()
    }
  }, [isOpen])

  // Scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Handle escape key to quickly minimize back to reading
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputText.trim()) return

    const newMsg: StealthMessage = {
      id: `msg-${Date.now()}`,
      sender: 'me',
      text: inputText.trim(),
      created_at: new Date().toISOString(),
      burnAfterSeconds: burnTimer,
    }

    setMessages((prev) => [...prev, newMsg])
    setInputText('')

    try {
      await fetch('/api/stealth/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMsg),
      })
    } catch {}
  }

  const handleSendSamplePhoto = async () => {
    const photoMsg: StealthMessage = {
      id: `media-${Date.now()}`,
      sender: 'me',
      text: 'Sent confidential photo',
      mediaUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=800&q=80',
      mediaType: 'image',
      created_at: new Date().toISOString(),
      burnAfterSeconds: 60,
    }
    setMessages((prev) => [...prev, photoMsg])
    try {
      await fetch('/api/stealth/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(photoMsg),
      })
    } catch {}
  }

  const toggleMediaReveal = (id: string) => {
    setRevealedMedia((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handlePanicWipe = async () => {
    try {
      await fetch('/api/stealth/burn', { method: 'POST' })
    } catch {}
    await triggerPanicBurn({ destination: '/philosophy' })
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-md"
      >
        {/* Full-bleed iOS FaceTime Video Stage if call is active */}
        {inFaceTimeCall ? (
          <div className="fixed inset-0 z-60 bg-black">
            <FaceTimeStage
              partnerName={camouflageMode ? partnerAlias : partnerName}
              callType="video"
              isDemo={true}
              onEndCall={() => setInFaceTimeCall(false)}
              onMinimize={() => setInFaceTimeCall(false)}
            />
          </div>
        ) : null}

        {/* In-page Slide-over Drawer disguised as Study Notes */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative flex h-full w-full max-w-lg flex-col border-l border-[var(--border)] bg-[var(--surface-1)] text-[var(--foreground)] shadow-[var(--shadow-2)]"
        >
          {/* Header disguised as Study Notes */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 bg-[var(--surface-2)]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCamouflageMode(!camouflageMode)}
                className="group flex flex-col text-left focus:outline-none"
                title="Tap to toggle camouflage disguise"
              >
                <div className="flex items-center gap-2">
                  <span className="font-serif text-base font-medium text-[var(--foreground)]">
                    {camouflageMode ? partnerAlias : partnerName}
                  </span>
                  <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
                </div>
                <span className="text-[11px] font-sans text-[var(--muted-foreground)]">
                  {camouflageMode ? 'Study Notebook · Confidential' : 'Direct P2P Encrypted · Active'}
                </span>
              </button>
            </div>

            {/* Actions: FaceTime call, Minimize, Panic Burn */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInFaceTimeCall(true)}
                className="text-xs font-medium gap-1.5"
                title="Start iOS FaceTime Call"
                aria-label="Start iOS FaceTime Call"
              >
                <Video className="h-3.5 w-3.5" />
                <span>Call</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
                title="Minimize back to reading"
                aria-label="Minimize back to reading"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handlePanicWipe}
                className="h-8 w-8 p-0 text-[var(--destructive)] hover:bg-[var(--danger-soft)]"
                title="Emergency Panic Wipe"
                aria-label="Emergency Panic Wipe"
              >
                <Flame className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Discreet Security & Connection Status */}
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-0)] px-5 py-2 text-[11px] text-[var(--muted-foreground)]">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              <span className="font-medium text-[var(--foreground)]">Connected</span>
              <span>•</span>
              <span>Zero-Trace Session</span>
            </div>
            {burnTimer ? (
              <span className="flex items-center gap-1 text-[var(--warning)] font-medium">
                <Clock className="h-3 w-3" />
                Burn {burnTimer}s
              </span>
            ) : (
              <span className="font-mono text-[10px]">Persistent P2P</span>
            )}
          </div>

          {/* Quick Notes / Prompts Bar */}
          <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 border-b border-[var(--border)] bg-[var(--surface-2)] scrollbar-none">
            {[
              { label: 'Thinking of you', text: 'Thinking of you right now.' },
              { label: 'Free to call?', text: 'Are you free for a call?' },
              { label: 'Miss you', text: 'Miss you lots, sending a quiet hug.' },
              { label: 'Goodnight', text: 'Goodnight, rest peacefully.' },
            ].map((whisper) => (
              <button
                key={whisper.label}
                type="button"
                onClick={async () => {
                  const newMsg: StealthMessage = {
                    id: `msg-${Date.now()}`,
                    sender: 'me',
                    text: whisper.text,
                    created_at: new Date().toISOString(),
                    burnAfterSeconds: burnTimer,
                  }
                  setMessages((prev) => [...prev, newMsg])
                  try {
                    await fetch('/api/stealth/messages', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(newMsg),
                    })
                  } catch {}
                }}
                className="shrink-0 rounded-[var(--ds-radius)] bg-[var(--surface-1)] border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                {whisper.label}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 space-y-4 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-stone-800">
            {messages.map((msg) => {
              const isMe = msg.sender === 'me'
              const isRevealed = revealedMedia[msg.id]

              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col gap-1 max-w-[82%]',
                    isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                  )}
                >
                  {/* Photo with Blur-to-Reveal */}
                  {msg.mediaUrl ? (
                    <div
                      onClick={() => toggleMediaReveal(msg.id)}
                      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/15 bg-black/60 shadow-lg"
                    >
                      <img
                        src={msg.mediaUrl}
                        alt="Encrypted attachment"
                        className={cn(
                          'max-h-60 w-auto rounded-2xl object-cover transition duration-300',
                          isRevealed ? 'blur-0' : 'blur-2xl scale-105'
                        )}
                      />
                      {!isRevealed ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 p-4 text-center">
                          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/15">
                            <Lock className="h-4 w-4 text-rose-300" />
                          </div>
                          <span className="text-xs font-medium text-stone-100">
                            Private Memory
                          </span>
                          <span className="text-[10px] text-stone-400 mt-0.5">
                            Tap to reveal confidential photo
                          </span>
                        </div>
                      ) : (
                        <div className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2.5 py-0.5 text-[9px] text-white/90 backdrop-blur-md">
                          Tap to conceal
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Text Bubble */}
                  {msg.text ? (
                    <div
                      className={cn(
                        'rounded-[var(--ds-radius)] px-4 py-2.5 text-sm leading-relaxed shadow-xs font-sans',
                        isMe
                          ? 'bg-[var(--bubble-sent)] text-[var(--bubble-sent-foreground)] rounded-br-xs'
                          : 'bg-[var(--bubble-received)] text-[var(--bubble-received-foreground)] rounded-bl-xs border border-[var(--border)]'
                      )}
                    >
                      {msg.text}
                    </div>
                  ) : null}

                  {/* Timestamp & Burn badge */}
                  <div className="flex items-center gap-1.5 px-1 text-[10px] text-[var(--muted-foreground)]">
                    <span>
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {msg.burnAfterSeconds ? (
                      <span className="flex items-center gap-0.5 text-[var(--warning)]">
                        <Flame className="h-2.5 w-2.5" />
                        {msg.burnAfterSeconds}s
                      </span>
                    ) : null}
                  </div>
                </div>
              )
            })}

            {isTyping ? (
              <div className="flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] w-fit border border-[var(--border)]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--success)]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--success)] delay-150" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--success)] delay-300" />
                <span className="ml-1 text-[11px]">Partner is typing...</span>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSendMessage}
            className="border-t border-[var(--border)] bg-[var(--surface-1)] p-3"
          >
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSendSamplePhoto}
                className="h-9 w-9 rounded-full p-0 text-stone-400 hover:bg-white/10 hover:text-stone-200"
                title="Send Blur-to-Reveal Media"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setBurnTimer((curr) => (curr === null ? 60 : curr === 60 ? 300 : null))
                }
                className={cn(
                  'h-9 rounded-full px-2.5 text-xs transition',
                  burnTimer
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-stone-400 hover:bg-white/10 hover:text-stone-200'
                )}
                title="Cycle auto-destruct timer (Off, 1m, 5m)"
              >
                <Flame className="mr-1 h-3.5 w-3.5" />
                {burnTimer ? `${burnTimer}s` : 'Burn'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setInputText((prev) => `${prev} ❤️`.trim())}
                className="h-9 w-9 rounded-full p-0 text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 cursor-pointer"
                title="Add Heart"
              >
                <span className="text-sm">❤️</span>
              </Button>

              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Whisper a private note..."
                className="h-10 flex-1 rounded-full border-white/15 bg-black/50 px-4 text-sm text-stone-100 placeholder:text-stone-500 focus-visible:ring-[#E07A5F]"
              />

              <Button
                type="submit"
                size="sm"
                disabled={!inputText.trim()}
                className="h-10 w-10 rounded-full bg-[#D06A50] hover:bg-[#C25D43] p-0 text-white shadow-sm disabled:opacity-40 cursor-pointer transition-colors"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
