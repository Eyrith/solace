'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Lock,
  Pencil,
  Phone,
  Pin,
  Search,
  UserPlus,
  Users,
  Video,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { SectionRule } from '@/components/ui/section-rule'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ChatBubble, type BubbleAttachment, type BubbleReaction } from '@/components/sanctuary/chat-bubble'
import { ChatComposer, type DisappearingPreset } from '@/components/sanctuary/chat-composer'
import { getInitials } from '@/components/sanctuary/private-shell'
import { useDesignSystem } from '@/components/providers/design-system-provider'
import { useSanctuary } from '@/components/providers/sanctuary-provider'
import { createClient, isSupabaseClientConfigured } from '@/lib/supabase/client'
import {
  DISAPPEARING_MS,
  type LocalEncryptedAttachment,
  type LocalMessage,
  decryptLocalMediaAttachment,
  deleteLocalMessage,
  editLocalMessage,
  encryptLocalMediaAttachment,
  formatDisappearingCountdown,
  listLocalMessages,
  markLocalSpaceSeen,
  pruneExpiredLocalMessages,
  sendLocalMessage,
  subscribeLocalSanctuary,
  toggleLocalPin,
  toggleLocalReaction,
} from '@/lib/sanctuary/local-store'

interface ActiveMessage {
  id: string
  direction: 'sent' | 'received'
  senderLabel?: string
  text?: string
  timestamp: string
  createdAtRaw?: string | number
  voiceDurationSeconds?: number
  voiceSrc?: string
  attachment?: BubbleAttachment
  replyPreview?: string
  edited?: boolean
  readReceipt?: 'sent' | 'delivered' | 'read'
  disappearing?: DisappearingPreset
  disappearingLabel?: string
  expiresAt?: number
  expiresAtIso?: string | null
  reactions?: BubbleReaction[]
  isPinned?: boolean
}

interface ApiMessageRow {
  id: string
  content?: string | null
  message_type?: string
  expires_mode?: string | null
  expires_at?: string | null
  is_edited?: boolean
  is_pinned?: boolean
  created_at?: string
  isOwn?: boolean
  replyPreview?: string | null
  reactions?: BubbleReaction[]
  readReceipt?: 'sent' | 'delivered' | 'read'
}

const EXPIRES_LABEL_MAP: Record<string, string> = {
  just_seen: 'Seen',
  '1_second': '1s',
  '1s': '1s',
  '5_minutes': '5m',
  '5m': '5m',
  '1_hour': '1h',
  '1h': '1h',
  '24_hours': '24h',
  '24h': '24h',
}

function getTimerMs(preset: DisappearingPreset): number | null {
  if (preset === 'off') return null
  return DISAPPEARING_MS[preset] ?? null
}

function mapApiMessage(row: ApiMessageRow): ActiveMessage {
  const mode = row.expires_mode ?? 'never'
  return {
    id: row.id,
    direction: row.isOwn ? 'sent' : 'received',
    text: row.content ?? '',
    timestamp: row.created_at
      ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '',
    createdAtRaw: row.created_at,
    replyPreview: row.replyPreview ?? undefined,
    edited: Boolean(row.is_edited),
    readReceipt: row.readReceipt ?? 'delivered',
    disappearingLabel: mode !== 'never' ? EXPIRES_LABEL_MAP[mode] ?? mode : undefined,
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : undefined,
    expiresAtIso: row.expires_at ?? null,
    reactions: row.reactions ?? [],
    isPinned: Boolean(row.is_pinned),
  }
}

function mapLocalMessage(
  msg: LocalMessage,
  demoActor: 'self' | 'partner',
  nowMs: number,
  objectUrls: Record<string, string>,
): ActiveMessage {
  const isSent = msg.senderRole === demoActor
  const reactions: BubbleReaction[] = Object.entries(msg.reactions || {}).map(([emoji, actors]) => ({
    emoji,
    count: actors.length,
    reactedByMe: actors.includes(demoActor),
  }))

  const att = msg.attachment
  const decryptedUrl = att ? objectUrls[att.id] ?? null : null

  return {
    id: msg.id,
    direction: isSent ? 'sent' : 'received',
    senderLabel: isSent ? undefined : msg.senderName,
    text: msg.text || undefined,
    timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAtRaw: msg.createdAt,
    voiceDurationSeconds: att?.kind === 'audio' ? att.durationSeconds ?? 1 : undefined,
    voiceSrc: att?.kind === 'audio' ? decryptedUrl ?? undefined : undefined,
    attachment: att
      ? {
          kind: att.kind,
          filename: att.filename,
          mimeType: att.mimeType,
          sizeBytes: att.sizeBytes,
          objectUrl: decryptedUrl,
        }
      : undefined,
    replyPreview: msg.replyTo ? `${msg.replyTo.senderName}: ${msg.replyTo.text}` : undefined,
    edited: Boolean(msg.edited),
    readReceipt: isSent ? 'read' : undefined,
    disappearing: msg.disappearing,
    disappearingLabel: formatDisappearingCountdown(msg.expiresAt, nowMs, msg.disappearing),
    expiresAt: msg.expiresAt ? new Date(msg.expiresAt).getTime() : undefined,
    expiresAtIso: msg.expiresAt ?? null,
    reactions,
    isPinned: Boolean(msg.pinned),
  }
}

function getDayKey(dateVal?: string | number | null): string {
  if (!dateVal) return 'today'
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return 'today'
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function formatDayLabel(dateVal?: string | number | null): string {
  if (!dateVal) return 'Today'
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return 'Today'
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function SpaceMessagesContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { spaces, configured, isLocalSandbox, loading, demoActor, createInvite } = useSanctuary()
  const spaceId = (params?.spaceId as string) || spaces[0]?.id || 'default-space'
  const initialPrompt = searchParams.get('prompt') ?? ''

  const { bubbleStyle } = useDesignSystem()

  const activeSpace = spaces.find((s) => s.id === spaceId) ?? spaces[0] ?? null
  const partnerName = activeSpace?.partner?.displayName ?? activeSpace?.name ?? 'Partner'
  const initials = getInitials(partnerName)

  const [copiedInvite, setCopiedInvite] = React.useState(false)
  const handleCopyInviteLink = async () => {
    try {
      const res = await createInvite(spaceId)
      const url = res?.inviteUrl || `${window.location.origin}/invite/sol-${Math.random().toString(36).slice(2, 9)}`
      await navigator.clipboard.writeText(url)
      setCopiedInvite(true)
      window.setTimeout(() => setCopiedInvite(false), 2200)
    } catch {
      const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/sol-${Math.random().toString(36).slice(2, 9)}`
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setCopiedInvite(true)
        window.setTimeout(() => setCopiedInvite(false), 2200)
      }
    }
  }

  const [mediaError, setMediaError] = React.useState<string | null>(null)
  const [localUploadStage, setLocalUploadStage] = React.useState<'encrypting' | null>(null)
  const [messages, setMessages] = React.useState<ActiveMessage[]>([])
  const [localRawMessages, setLocalRawMessages] = React.useState<LocalMessage[]>([])
  const [localMediaUrls, setLocalMediaUrls] = React.useState<Record<string, string>>({})
  const [nowMs, setNowMs] = React.useState(() => Date.now())
  const [replyingTo, setReplyingTo] = React.useState<ActiveMessage | null>(null)
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(null)
  const [editingDraft, setEditingDraft] = React.useState('')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [showSearch, setShowSearch] = React.useState(false)
  const [pinnedOpen, setPinnedOpen] = React.useState(false)

  // Scroll & New Messages notification tracking
  const streamRef = React.useRef<HTMLDivElement>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const [isNearBottom, setIsNearBottom] = React.useState(true)
  const [hasNewMessagesScrolledUp, setHasNewMessagesScrolledUp] = React.useState(false)
  const prevCountRef = React.useRef(0)

  const viewedIdsRef = React.useRef<Set<string>>(new Set())
  const decryptedCacheRef = React.useRef<Record<string, string>>({})
  const pendingDecryptRef = React.useRef<Set<string>>(new Set())

  const syncLocalStream = React.useCallback(() => {
    markLocalSpaceSeen(spaceId, demoActor)
    pruneExpiredLocalMessages(spaceId)
    setLocalRawMessages(listLocalMessages(spaceId))
  }, [spaceId, demoActor])

  const loadDbMessages = React.useCallback(async () => {
    if (!configured || !spaceId) return
    try {
      const res = await fetch(`/api/messages?spaceId=${encodeURIComponent(spaceId)}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const payload = await res.json()
      const rows: ApiMessageRow[] = Array.isArray(payload?.messages) ? payload.messages : []
      setMessages(rows.map(mapApiMessage))

      for (const row of rows) {
        if (!row.isOwn && !viewedIdsRef.current.has(row.id)) {
          viewedIdsRef.current.add(row.id)
          void fetch('/api/messages/view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId: row.id }),
          }).catch(() => {})
        }
      }
    } catch {}
  }, [configured, spaceId])

  React.useEffect(() => {
    if (loading) return
    if (!configured) {
      Promise.resolve().then(syncLocalStream)
      return subscribeLocalSanctuary(syncLocalStream)
    }

    let active = true
    fetch(`/api/messages?spaceId=${encodeURIComponent(spaceId)}`, {
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active || !payload) return
        const rows: ApiMessageRow[] = Array.isArray(payload?.messages) ? payload.messages : []
        setMessages(rows.map(mapApiMessage))

        for (const row of rows) {
          if (!row.isOwn && !viewedIdsRef.current.has(row.id)) {
            viewedIdsRef.current.add(row.id)
            void fetch('/api/messages/view', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messageId: row.id }),
            }).catch(() => {})
          }
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [configured, loading, spaceId, syncLocalStream])

  // Decrypt client-side WebCrypto local attachments
  React.useEffect(() => {
    if (!isLocalSandbox) return
    let active = true
    for (const msg of localRawMessages) {
      const att: LocalEncryptedAttachment | undefined = msg.attachment
      if (!att) continue
      if (decryptedCacheRef.current[att.id] || pendingDecryptRef.current.has(att.id)) continue
      pendingDecryptRef.current.add(att.id)
      void decryptLocalMediaAttachment(att)
        .then((blobUrl) => {
          if (!active || !blobUrl) return
          decryptedCacheRef.current[att.id] = blobUrl
          setLocalMediaUrls((prev) => ({ ...prev, [att.id]: blobUrl }))
        })
        .catch(() => {})
        .finally(() => {
          pendingDecryptRef.current.delete(att.id)
        })
    }
    return () => {
      active = false
    }
  }, [isLocalSandbox, localRawMessages])

  React.useEffect(() => {
    const cache = decryptedCacheRef.current
    return () => {
      for (const url of Object.values(cache)) {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url)
      }
    }
  }, [])

  // Subscribe to Supabase Realtime updates
  React.useEffect(() => {
    if (!configured || !isSupabaseClientConfigured() || !spaceId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`space-messages:${spaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `space_id=eq.${spaceId}` },
        () => {
          void loadDbMessages()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        () => {
          void loadDbMessages()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [configured, spaceId, loadDbMessages])

  // Scroll detection
  const handleScroll = () => {
    const el = streamRef.current
    if (!el) return
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const near = distanceToBottom < 80
    setIsNearBottom(near)
    if (near) {
      setHasNewMessagesScrolledUp(false)
    }
  }

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (streamRef.current) {
      streamRef.current.scrollTo({
        top: streamRef.current.scrollHeight,
        behavior,
      })
      setHasNewMessagesScrolledUp(false)
    }
  }

  // Auto-scroll when already near bottom; show pill when scrolled up
  React.useEffect(() => {
    const count = configured ? messages.length : localRawMessages.length
    if (count > prevCountRef.current) {
      if (isNearBottom) {
        scrollToBottom(prevCountRef.current === 0 ? 'auto' : 'smooth')
      } else {
        requestAnimationFrame(() => {
          setHasNewMessagesScrolledUp(true)
        })
      }
    }
    prevCountRef.current = count
  }, [messages.length, localRawMessages.length, isNearBottom, configured])

  // Countdown tick + auto-purge for disappearing messages
  React.useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now()
      setNowMs(now)
      if (!configured && !loading) {
        if (pruneExpiredLocalMessages(spaceId)) {
          setLocalRawMessages(listLocalMessages(spaceId))
        }
      } else {
        setMessages((prev) => prev.filter((m) => m.isPinned || !m.expiresAt || m.expiresAt > now))
      }
    }, 500)
    return () => window.clearInterval(timer)
  }, [configured, loading, spaceId])

  const handleSendMessage = async (text: string, disappearing: DisappearingPreset) => {
    if (!text.trim()) return

    if (!configured) {
      sendLocalMessage(spaceId, {
        text: text.trim(),
        disappearing,
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              text: replyingTo.text || 'Voice note',
              senderName: replyingTo.direction === 'sent' ? 'You' : partnerName,
            }
          : null,
        actor: demoActor,
      })
      setReplyingTo(null)
      syncLocalStream()
      return
    }

    const timerMs = getTimerMs(disappearing)
    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const tempId = `local-${Date.now()}`
    const optimistic: ActiveMessage = {
      id: tempId,
      direction: 'sent',
      text,
      timestamp: timeStr,
      createdAtRaw: now.toISOString(),
      readReceipt: 'delivered',
      replyPreview: replyingTo?.text ? replyingTo.text.slice(0, 60) : undefined,
      disappearing,
      disappearingLabel: disappearing !== 'off' ? EXPIRES_LABEL_MAP[disappearing] : undefined,
      expiresAt: timerMs ? Date.now() + timerMs : undefined,
    }
    setMessages((prev) => [...prev, optimistic])
    const replyTarget = replyingTo
    setReplyingTo(null)

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId,
          content: text,
          expiresMode: disappearing,
          replyToId: replyTarget?.id?.startsWith('local-') ? undefined : replyTarget?.id,
        }),
      })
      if (res.ok && configured) {
        await loadDbMessages()
      }
    } catch {
      setMediaError('Failed to deliver message.')
    }
  }

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!configured) {
      toggleLocalReaction(spaceId, messageId, emoji, demoActor)
      syncLocalStream()
      return
    }

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m
        const currentReactions = m.reactions || []
        const existing = currentReactions.find((r) => r.emoji === emoji)
        let nextReactions: BubbleReaction[]
        if (existing) {
          if (existing.reactedByMe) {
            nextReactions = currentReactions
              .map((r) =>
                r.emoji === emoji ? { ...r, count: r.count - 1, reactedByMe: false } : r,
              )
              .filter((r) => r.count > 0)
          } else {
            nextReactions = currentReactions.map((r) =>
              r.emoji === emoji ? { ...r, count: r.count + 1, reactedByMe: true } : r,
            )
          }
        } else {
          nextReactions = [...currentReactions, { emoji, count: 1, reactedByMe: true }]
        }
        return { ...m, reactions: nextReactions }
      }),
    )

    if (configured && !messageId.startsWith('preview-') && !messageId.startsWith('local-')) {
      await fetch('/api/messages/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji }),
      }).catch(() => {})
    }
  }

  const effectiveMessages: ActiveMessage[] = React.useMemo(() => {
    if (configured) return messages
    return localRawMessages.map((m) => mapLocalMessage(m, demoActor, nowMs, localMediaUrls))
  }, [configured, messages, localRawMessages, demoActor, nowMs, localMediaUrls])

  const handleReply = (messageId: string) => {
    const target = effectiveMessages.find((m) => m.id === messageId)
    if (target) setReplyingTo(target)
  }

  const handlePinMessage = async (messageId: string, pinned: boolean) => {
    if (!configured) {
      toggleLocalPin(spaceId, messageId)
      syncLocalStream()
      return
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isPinned: pinned } : m)),
    )
    await fetch('/api/messages/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, pinned }),
    }).catch(() => {})
  }

  const handleStartEdit = (messageId: string) => {
    const target = effectiveMessages.find((m) => m.id === messageId)
    if (!target?.text) return
    setEditingMessageId(messageId)
    setEditingDraft(target.text)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMessageId || !editingDraft.trim()) return
    editLocalMessage(spaceId, editingMessageId, editingDraft.trim())
    setEditingMessageId(null)
    setEditingDraft('')
    syncLocalStream()
  }

  const handleDeleteMessage = (messageId: string) => {
    deleteLocalMessage(spaceId, messageId)
    syncLocalStream()
  }

  const handleAttachFile = async (file: File, caption?: string) => {
    setMediaError(null)
    setLocalUploadStage('encrypting')
    try {
      const attachment = await encryptLocalMediaAttachment(file, {
        filename: file.name || 'attachment',
        mimeType: file.type || 'application/octet-stream',
      })
      if (!configured) {
        sendLocalMessage(spaceId, {
          text: caption || '',
          attachment,
          actor: demoActor,
        })
        syncLocalStream()
      } else {
        await handleSendMessage(caption || `[Sent media: ${file.name}]`, 'off')
      }
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Media processing failed')
    } finally {
      setLocalUploadStage(null)
    }
  }

  const handleSendVoiceBlob = async (blob: Blob, mimeType: string, durationMs: number) => {
    setMediaError(null)
    setLocalUploadStage('encrypting')
    try {
      const attachment = await encryptLocalMediaAttachment(blob, {
        filename: 'voice-note.webm',
        mimeType,
        durationSeconds: Math.max(1, Math.round(durationMs / 1000)),
      })
      if (!configured) {
        sendLocalMessage(spaceId, {
          text: '',
          attachment,
          actor: demoActor,
        })
        syncLocalStream()
      } else {
        await handleSendMessage('🎙️ [Voice note]', 'off')
      }
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Voice note processing failed')
    } finally {
      setLocalUploadStage(null)
    }
  }

  const pinnedMessages = effectiveMessages.filter((m) => m.isPinned)
  const searchResults = searchQuery.trim()
    ? effectiveMessages.filter(
        (m) =>
          m.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.attachment?.filename.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : effectiveMessages

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 w-full overflow-hidden bg-[var(--surface-0)] relative">
      {/* ── Room Header (iOS Style Navigation Bar) ───────────────────────── */}
      <header className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--surface-1)]/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <IconButton variant="ghost" size="md" asChild className="shrink-0 text-[var(--primary)] hover:bg-[var(--primary)]/10" aria-label="Back to home">
            <Link href="/home">
              <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
            </Link>
          </IconButton>

          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)]/15 text-xs font-bold text-[var(--primary)] shrink-0 border border-[var(--primary)]/30 shadow-xs">
              {initials}
            </span>

            <div className="space-y-0.5 min-w-0">
              <h1 className="text-[15px] font-semibold text-[var(--foreground)] truncate leading-none tracking-tight">
                {partnerName}
              </h1>
              <p className="text-[11px] text-[var(--muted-foreground)] leading-none truncate font-normal">
                Kulfi 1:1 Whisper
              </p>
            </div>
          </div>
        </div>

        {/* Room Header Actions: Invite, Search, Call, Video */}
        <div className="flex items-center gap-1.5 shrink-0">
          {Boolean(!activeSpace?.partner || activeSpace?.partner?.displayName === 'Partner pending' || activeSpace?.pendingInviteUrl) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyInviteLink}
              className="h-8 gap-1.5 text-xs text-[var(--primary)] border-[var(--border)] hover:bg-[var(--surface-2)]"
              title="Copy partner invite link"
            >
              {copiedInvite ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  <span className="hidden sm:inline">Copied!</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Invite Partner</span>
                </>
              )}
            </Button>
          )}

          {pinnedMessages.length > 0 && (
            <IconButton
              variant="ghost"
              size="md"
              onClick={() => setPinnedOpen(true)}
              aria-label={`View ${pinnedMessages.length} pinned memories`}
              title="View pinned memories"
            >
              <div className="relative">
                <Pin className="h-4 w-4 text-[#007AFF]" />
                <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#007AFF] px-0.5 text-[9px] font-bold text-white">
                  {pinnedMessages.length}
                </span>
              </div>
            </IconButton>
          )}

          <IconButton
            variant="ghost"
            size="md"
            onClick={() => setShowSearch(true)}
            aria-label="Search conversation"
            title="Search conversation"
            className="text-[#007AFF] hover:bg-[#007AFF]/10"
          >
            <Search className="h-4 w-4" />
          </IconButton>

          <IconButton variant="ghost" size="md" asChild aria-label="Voice Call" title="Voice call" className="text-[#007AFF] hover:bg-[#007AFF]/10">
            <Link href={`/calls?partner=${encodeURIComponent(partnerName)}`}>
              <Phone className="h-4 w-4" />
            </Link>
          </IconButton>

          <IconButton variant="ghost" size="md" asChild aria-label="FaceTime Video Call" title="FaceTime video" className="text-[#007AFF] hover:bg-[#007AFF]/10">
            <Link href={`/calls?partner=${encodeURIComponent(partnerName)}&video=true`}>
              <Video className="h-4 w-4" />
            </Link>
          </IconButton>
        </div>
      </header>

      {/* ── Flexible Stream (max-width 720 centered) ───────────────────────── */}
      <div
        ref={streamRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-atomic="false"
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4"
      >
        <div className="max-w-[720px] mx-auto w-full space-y-3">
          {effectiveMessages.length === 0 ? (
            /* Direct 1:1 clean invite card or start messaging */
            <div className="py-16 sm:py-24 text-center max-w-sm mx-auto space-y-4 px-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--primary)] border border-[var(--border)]">
                <Lock className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  Your private conversation is ready
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Share your invite link with your partner so they can join directly.
                </p>
              </div>
              <Button
                onClick={handleCopyInviteLink}
                size="sm"
                className="gap-2 mx-auto"
              >
                {copiedInvite ? (
                  <>
                    <Check className="h-4 w-4 text-green-400" />
                    <span>Invite Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Partner Invite Link</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            effectiveMessages.map((msg, index) => {
              const prevMsg = effectiveMessages[index - 1]
              const nextMsg = effectiveMessages[index + 1]

              const currentDayKey = getDayKey(msg.createdAtRaw)
              const prevDayKey = prevMsg ? getDayKey(prevMsg.createdAtRaw) : null
              const nextDayKey = nextMsg ? getDayKey(nextMsg.createdAtRaw) : null

              const showDayDivider = !prevMsg || currentDayKey !== prevDayKey
              const dayLabel = formatDayLabel(msg.createdAtRaw)

              // Grouping rules:
              // sender names on first message of a group
              // timestamps on the last message of a group
              const isFirstInGroup = !prevMsg || prevMsg.direction !== msg.direction || showDayDivider
              const isLastInGroup = !nextMsg || nextMsg.direction !== msg.direction || currentDayKey !== nextDayKey

              const senderLabel =
                isFirstInGroup && msg.direction === 'received' ? partnerName : undefined
              const timestamp = isLastInGroup ? msg.timestamp : undefined

              return (
                <div key={msg.id} className="space-y-2">
                  {showDayDivider && (
                    <SectionRule label={dayLabel} className="my-5" />
                  )}

                  {editingMessageId === msg.id ? (
                    <form
                      onSubmit={handleSaveEdit}
                      className="ml-auto max-w-[68ch] rounded-[var(--ds-radius)] border border-[var(--primary)] bg-[var(--surface-1)] p-3 space-y-2 shadow-[var(--shadow-1)]"
                    >
                      <div className="flex items-center justify-between text-xs text-[var(--primary)] font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <Pencil className="h-3.5 w-3.5" /> Editing note
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingMessageId(null)}
                          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={editingDraft}
                        onChange={(e) => setEditingDraft(e.target.value)}
                        className="w-full rounded-[calc(var(--ds-radius)-2px)] border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] leading-relaxed"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingMessageId(null)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" size="sm" variant="primary">
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Save Edit
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <ChatBubble
                      id={msg.id}
                      direction={msg.direction}
                      senderLabel={senderLabel}
                      text={msg.text}
                      timestamp={timestamp}
                      bubbleStyle={bubbleStyle}
                      voiceDurationSeconds={msg.voiceDurationSeconds}
                      voiceSrc={msg.voiceSrc}
                      attachment={msg.attachment}
                      replyPreview={msg.replyPreview}
                      edited={msg.edited}
                      isPinned={msg.isPinned}
                      isFirstInGroup={isFirstInGroup}
                      isLastInGroup={isLastInGroup}
                      readReceipt={msg.readReceipt}
                      disappearingLabel={msg.disappearingLabel}
                      reactions={msg.reactions}
                      onToggleReaction={handleToggleReaction}
                      onReply={handleReply}
                      onPin={(id) => void handlePinMessage(id, !msg.isPinned)}
                      onEdit={!configured ? handleStartEdit : undefined}
                      onDelete={!configured ? handleDeleteMessage : undefined}
                    />
                  )}
                </div>
              )
            })
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating "New messages" pill when scrolled up */}
      {hasNewMessagesScrolledUp && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] shadow-[var(--shadow-2)] animate-bounce cursor-pointer hover:bg-[var(--primary)]/90"
          aria-label="Scroll to new messages"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          <span>New messages</span>
        </button>
      )}

      {/* Replying Preview Banner */}
      {replyingTo && (
        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--surface-1)] flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 truncate min-w-0">
            <span className="text-[var(--primary)] font-semibold shrink-0">Replying to:</span>
            <span className="truncate text-[var(--muted-foreground)]">
              {replyingTo.text || replyingTo.attachment?.filename || 'Voice note'}
            </span>
          </div>
          <IconButton
            variant="ghost"
            size="md"
            onClick={() => setReplyingTo(null)}
            aria-label="Cancel reply"
            className="h-7 w-7 min-h-7 min-w-7"
          >
            <X className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      )}

      {/* ── Composer (anchored at bottom, respecting safe-area) ─────────────── */}
      <footer className="p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--surface-0)] shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-[720px] mx-auto w-full space-y-2">
          {mediaError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 rounded-[var(--ds-radius)] border border-[var(--destructive)]/40 bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--destructive)]"
            >
              <span>{mediaError}</span>
              <IconButton
                variant="ghost"
                size="md"
                onClick={() => setMediaError(null)}
                aria-label="Dismiss error alert"
                className="h-6 w-6 min-h-6 min-w-6"
              >
                <X className="h-3.5 w-3.5" />
              </IconButton>
            </div>
          )}
          <ChatComposer
            key={initialPrompt}
            initialText={initialPrompt}
            onSend={handleSendMessage}
            onAttachFile={handleAttachFile}
            onSendVoiceBlob={handleSendVoiceBlob}
            uploadingStage={localUploadStage}
            placeholder="Write a private note..."
          />
        </div>
      </footer>

      {/* ── Search Sheet (Focus-Trapped) ───────────────────────────────────── */}
      <Sheet open={showSearch} onOpenChange={setShowSearch}>
        <SheetContent side="right" className="w-full sm:max-w-md p-6 flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>Search Conversation</SheetTitle>
            <SheetDescription>Find messages, notes, and shared files in this private room.</SheetDescription>
          </SheetHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
            <input
              type="search"
              placeholder="Search keywords or filenames..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--surface-2)] pl-9 pr-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)]"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {searchQuery.trim() && searchResults.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] text-center py-8">
                No messages matched your query.
              </p>
            ) : (
              searchResults.map((m) => (
                <div
                  key={m.id}
                  className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--surface-1)] p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
                    <span className="font-semibold text-[var(--foreground)]">
                      {m.direction === 'sent' ? 'You' : partnerName}
                    </span>
                    <span>{m.timestamp}</span>
                  </div>
                  <p className="text-[var(--foreground)] wrap-anywhere">
                    {m.text || m.attachment?.filename || 'Attachment'}
                  </p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Pinned Messages Sheet (Focus-Trapped) ───────────────────────────── */}
      <Sheet open={pinnedOpen} onOpenChange={setPinnedOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-6 flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>Pinned Memories</SheetTitle>
            <SheetDescription>Saved and pinned notes in this direct conversation.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto space-y-2">
            {pinnedMessages.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] text-center py-8">
                No pinned notes yet. Use the message options menu to pin meaningful notes.
              </p>
            ) : (
              pinnedMessages.map((pm) => (
                <div
                  key={pm.id}
                  className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--surface-1)] p-3 text-xs flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                      <span className="font-semibold text-[var(--primary)]">{pm.timestamp}</span>
                      <span>· {pm.direction === 'sent' ? 'You' : partnerName}</span>
                    </div>
                    <p className="text-[var(--foreground)] wrap-anywhere">
                      {pm.text || pm.attachment?.filename || 'Media note'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handlePinMessage(pm.id, false)}
                    className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--destructive)] shrink-0 h-7 px-2"
                  >
                    Unpin
                  </Button>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default function SpaceMessagesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">
          Loading sanctuary conversation...
        </div>
      }
    >
      <SpaceMessagesContent />
    </React.Suspense>
  )
}
