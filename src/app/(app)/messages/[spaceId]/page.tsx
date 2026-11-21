'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, Pencil, Phone, Pin, Search, Users, Video, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ChatBubble, type BubbleAttachment, type BubbleReaction } from '@/components/sanctuary/chat-bubble'
import { ChatComposer, type DisappearingPreset } from '@/components/sanctuary/chat-composer'
import { MatrixRoomSecurityBar } from '@/components/sanctuary/matrix-room-security-bar'
import { EncryptedMediaBubble } from '@/components/sanctuary/encrypted-media-bubble'
import { useMatrix } from '@/components/providers/matrix-provider'
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
  just_seen: 'Disappears on view',
  '1_second': '1s after view',
  '1s': '1s after view',
  '5_minutes': '5m after view',
  '5m': '5m after view',
  '1_hour': '1h after view',
  '1h': '1h after view',
  '24_hours': '24 hours',
  '24h': '24 hours',
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
    replyPreview: row.replyPreview ?? undefined,
    edited: Boolean(row.is_edited),
    readReceipt: row.readReceipt ?? 'delivered',
    disappearingLabel: mode !== 'never' ? EXPIRES_LABEL_MAP[mode] ?? mode : undefined,
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : undefined,
    reactions: Array.isArray(row.reactions) ? row.reactions : [],
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
  const reactions: BubbleReaction[] = Object.entries(msg.reactions ?? {}).map(([emoji, actors]) => ({
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

function SpaceMessagesContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const spaceId = (params.spaceId as string) || 'space-1'
  const initialPrompt = searchParams.get('prompt') ?? ''

  const { bubbleStyle, chatBackground } = useDesignSystem()
  const { spaces, configured, isLocalSandbox, loading, demoActor, setDemoActor } = useSanctuary()
  const matrix = useMatrix()

  const activeSpace = spaces.find((s) => s.id === spaceId) ?? null
  const partnerName = activeSpace?.partner?.displayName ?? 'Partner'
  const partnerInitial = partnerName.trim().slice(0, 1).toUpperCase() || 'P'

  const [pocUser, setPocUser] = React.useState<'alice' | 'bob'>('alice')
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
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const viewedIdsRef = React.useRef<Set<string>>(new Set())
  const decryptedCacheRef = React.useRef<Record<string, string>>({})
  const pendingDecryptRef = React.useRef<Set<string>>(new Set())

  const connectMatrixSpace = matrix.connectSpace
  React.useEffect(() => {
    void connectMatrixSpace(spaceId, pocUser)
  }, [spaceId, pocUser, connectMatrixSpace])

  const matrixLiveReady = matrix.status === 'ready' && Boolean(matrix.activeRoomId)

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

      // Trigger read receipts on received messages once per message ID
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
    if (matrixLiveReady || loading) return
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
  }, [matrixLiveReady, configured, loading, spaceId, syncLocalStream])

  // Decrypt client-side WebCrypto local attachments to in-memory blob: URLs
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

  // Subscribe to Supabase Realtime updates when using Supabase messaging fallback
  React.useEffect(() => {
    if (matrixLiveReady || !configured || !isSupabaseClientConfigured() || !spaceId) return
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
  }, [matrixLiveReady, configured, spaceId, loadDbMessages])

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, localRawMessages.length, matrix.messagesByRoom])

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

  const registerMatrixTimer = React.useCallback(
    async (roomId: string, eventId: string, preset: DisappearingPreset) => {
      const ms = getTimerMs(preset)
      if (!ms) return

      const expiresAtIso = new Date(Date.now() + ms).toISOString()
      await fetch('/api/matrix/ephemeral-timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId,
          matrixRoomId: roomId,
          matrixEventId: eventId,
          expiresAt: expiresAtIso,
        }),
      }).catch(() => {})

      if (preset !== 'just_seen') {
        window.setTimeout(() => {
          void matrix.redactMessage(roomId, eventId).catch(() => {})
        }, ms)
      }
    },
    [spaceId, matrix],
  )

  const handleFallbackSend = async (text: string, disappearing: DisappearingPreset) => {
    if (!text.trim()) return

    if (!configured) {
      sendLocalMessage(spaceId, {
        text,
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
      setMediaError('Failed to deliver message to server.')
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
    if (!messageId.startsWith('preview-') && !messageId.startsWith('local-')) {
      await fetch('/api/messages/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, pinned }),
      }).catch(() => {})
    }
  }

  const handleStartEdit = (messageId: string) => {
    const target = effectiveMessages.find((m) => m.id === messageId)
    if (!target || target.direction !== 'sent') return
    setEditingMessageId(messageId)
    setEditingDraft(target.text ?? '')
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMessageId || !editingDraft.trim()) return
    if (!configured) {
      editLocalMessage(spaceId, editingMessageId, editingDraft.trim())
      syncLocalStream()
    }
    setEditingMessageId(null)
    setEditingDraft('')
  }

  const handleDeleteMessage = (messageId: string) => {
    if (!configured) {
      deleteLocalMessage(spaceId, messageId)
      syncLocalStream()
    }
  }

  const liveMatrixMessages = matrix.activeRoomId
    ? matrix.messagesByRoom[matrix.activeRoomId] ?? []
    : []

  const filteredLiveMessages = searchQuery.trim()
    ? liveMatrixMessages.filter((m) =>
        (m.text || m.media?.filename || '').toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : liveMatrixMessages

  const handleAttachFile = async (file: File, caption?: string) => {
    setMediaError(null)
    if (matrixLiveReady && matrix.activeRoomId) {
      try {
        await matrix.sendEncryptedMedia(matrix.activeRoomId, file, {
          filename: file.name || 'attachment',
          mimeType: file.type || 'application/octet-stream',
          caption,
        })
      } catch (err) {
        setMediaError(err instanceof Error ? err.message : 'Encrypted media upload failed')
      }
      return
    }

    if (isLocalSandbox) {
      setLocalUploadStage('encrypting')
      try {
        const attachment = await encryptLocalMediaAttachment(file, {
          filename: file.name || 'attachment',
          mimeType: file.type || 'application/octet-stream',
        })
        sendLocalMessage(spaceId, {
          text: caption || '',
          attachment,
          actor: demoActor,
        })
        syncLocalStream()
      } catch (err) {
        setMediaError(err instanceof Error ? err.message : 'Client-side encryption failed')
      } finally {
        setLocalUploadStage(null)
      }
      return
    }

    setMediaError(
      'Encrypted media requires an active Matrix E2EE room session. Plaintext media uploads are disabled.',
    )
  }

  const handleSendVoiceBlob = async (blob: Blob, mimeType: string, durationMs: number) => {
    setMediaError(null)
    if (matrixLiveReady && matrix.activeRoomId) {
      try {
        await matrix.sendEncryptedMedia(matrix.activeRoomId, blob, {
          filename: 'voice-note.webm',
          mimeType,
          durationMs,
        })
      } catch (err) {
        setMediaError(err instanceof Error ? err.message : 'Encrypted voice message upload failed')
      }
      return
    }

    if (isLocalSandbox) {
      setLocalUploadStage('encrypting')
      try {
        const attachment = await encryptLocalMediaAttachment(blob, {
          filename: 'voice-note.webm',
          mimeType,
          durationSeconds: Math.max(1, Math.round(durationMs / 1000)),
        })
        sendLocalMessage(spaceId, {
          text: '',
          attachment,
          actor: demoActor,
        })
        syncLocalStream()
      } catch (err) {
        setMediaError(err instanceof Error ? err.message : 'Voice encryption failed')
      } finally {
        setLocalUploadStage(null)
      }
      return
    }

    setMediaError(
      'Encrypted voice messages require an active Matrix E2EE room session. Plaintext audio uploads are disabled.',
    )
  }

  const handleComposerSend = async (text: string, disappearing: DisappearingPreset) => {
    setMediaError(null)
    if (matrixLiveReady && matrix.activeRoomId) {
      try {
        const eventId = await matrix.sendTextMessage(matrix.activeRoomId, text)
        if (disappearing !== 'off' && eventId) {
          await registerMatrixTimer(matrix.activeRoomId, eventId, disappearing)
        }
      } catch (err) {
        setMediaError(err instanceof Error ? err.message : 'Failed to send encrypted message')
      }
      return
    }
    await handleFallbackSend(text, disappearing)
  }

  const chatBgClass =
    chatBackground === 'linen'
      ? 'chat-bg-linen'
      : chatBackground === 'botanical'
        ? 'chat-bg-botanical'
        : 'chat-bg-solid'

  const pinnedMessages = effectiveMessages.filter((m) => m.isPinned)
  const displayMessages = searchQuery.trim()
    ? effectiveMessages.filter(
        (m) =>
          m.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.attachment?.filename.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : effectiveMessages

  return (
    <div className={`flex flex-col h-[calc(100dvh-8.5rem)] lg:h-[calc(100dvh-5.5rem)] max-w-4xl mx-auto border-x border-[var(--border)] ${chatBgClass}`}>
      {/* Room Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xs sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" asChild className="sm:hidden shrink-0">
            <Link href="/home">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>

          <Avatar className="h-9 w-9 border border-[var(--border)] shrink-0">
            <AvatarFallback className="bg-[var(--primary)]/10 text-[var(--primary)] font-medium text-xs">
              {partnerInitial}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-[var(--foreground)] leading-none truncate">
                {activeSpace?.name ? `${activeSpace.name} · ${partnerName}` : partnerName}
              </h1>
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  activeSpace?.partner ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                title={activeSpace?.partner ? 'Connected' : 'Partner pending'}
              />
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] leading-none truncate">
              {matrixLiveReady
                ? 'Matrix E2EE Active · Verified Key Room'
                : configured
                  ? 'Sanctuary Channel · Synapse Offline'
                  : `Local Sandbox · Speaking as ${demoActor === 'self' ? 'You' : 'Partner'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isLocalSandbox && (
            <button
              type="button"
              onClick={() => setDemoActor(demoActor === 'self' ? 'partner' : 'self')}
              title="Switch who is typing in Local Sandbox mode"
              className="hidden sm:inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] hover:border-[var(--primary)] cursor-pointer mr-1"
            >
              <Users className="h-3 w-3 text-[var(--primary)]" />
              <span>As: {demoActor === 'self' ? 'You' : 'Partner'}</span>
            </button>
          )}

          {pinnedMessages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPinnedOpen((prev) => !prev)}
              aria-label="View pinned memories"
              className={`h-8 gap-1 px-2 text-xs ${pinnedOpen ? 'bg-[var(--muted)] text-[var(--primary)]' : ''}`}
            >
              <Pin className="h-3.5 w-3.5" />
              <span className="tabular-nums">{pinnedMessages.length}</span>
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

      {/* Search in Chat Drawer */}
      {showSearch && (
        <div className="p-2 border-b border-[var(--border)] bg-[var(--muted)]/30 flex items-center gap-2">
          <Search className="h-4 w-4 text-[var(--muted-foreground)] ml-2" />
          <input
            type="text"
            placeholder="Search notes or filenames in this private space..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-[var(--foreground)] focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 text-[var(--muted-foreground)] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(false)}
            className="text-xs h-7"
          >
            Close
          </Button>
        </div>
      )}

      {/* Expandable All-Pinned Keepsakes Drawer */}
      {pinnedOpen && pinnedMessages.length > 0 && (
        <div className="bg-[var(--card)]/95 border-b border-[var(--border)] px-4 py-2.5 text-xs space-y-1.5 max-h-40 overflow-y-auto">
          <div className="flex items-center justify-between text-[var(--muted-foreground)]">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--foreground)]">
              <Pin className="h-3.5 w-3.5 text-[var(--primary)]" />
              Pinned Keepsakes ({pinnedMessages.length})
            </span>
            <button
              type="button"
              onClick={() => setPinnedOpen(false)}
              className="text-[11px] hover:underline cursor-pointer"
            >
              Collapse
            </button>
          </div>
          {pinnedMessages.map((pm) => (
            <div
              key={pm.id}
              className="flex items-center justify-between gap-2 rounded-[var(--ds-radius)] bg-[var(--background)] px-2.5 py-1.5 border border-[var(--border)]"
            >
              <span className="truncate text-[var(--foreground)]">
                &ldquo;{pm.text || pm.attachment?.filename || 'Voice note'}&rdquo;
              </span>
              <button
                type="button"
                onClick={() => void handlePinMessage(pm.id, false)}
                className="shrink-0 text-[11px] text-[var(--muted-foreground)] hover:text-[var(--primary)] cursor-pointer"
              >
                Unpin
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Matrix E2EE Verification & Key Backup Status Bar */}
      <div className="px-4 sm:px-6 pt-3">
        <MatrixRoomSecurityBar
          spaceId={spaceId}
          pocUser={pocUser}
          onSwitchPocUser={setPocUser}
        />
      </div>

      {/* Conversation Stream */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-center my-2">
          <span className="text-[11px] font-medium text-[var(--muted-foreground)] bg-[var(--card)]/80 border border-[var(--border)] px-3 py-1 rounded-full">
            {matrixLiveReady
              ? 'End-to-End Encrypted Room'
              : configured
                ? 'Supabase Realtime Channel (Synapse Offline)'
                : 'Local Sanctuary Workspace · Saved in Browser'}
          </span>
        </div>

        {matrixLiveReady ? (
          filteredLiveMessages.map((msg) => (
            <EncryptedMediaBubble
              key={msg.id}
              id={msg.id}
              direction={msg.isOwn ? 'sent' : 'received'}
              timestamp={msg.timestampLabel}
              kind={msg.kind}
              text={msg.text}
              media={msg.media}
              isEncrypted={msg.isEncryptedEvent}
              decryptionError={msg.decryptionError}
              redacted={msg.redacted}
              decryptedUrls={matrix.decryptedUrls}
              onEnsureDecryptedUrl={matrix.ensureDecryptedMediaUrl}
              onDelete={(id) => matrix.redactMessage(msg.roomId, id)}
            />
          ))
        ) : displayMessages.length === 0 ? (
          <div className="text-center py-12 text-xs text-[var(--muted-foreground)]">
            {searchQuery.trim()
              ? 'No messages matched your search.'
              : 'No messages in this channel yet. Start your conversation below.'}
          </div>
        ) : (
          displayMessages.map((msg) => (
            <div key={msg.id} className="space-y-1.5">
              {editingMessageId === msg.id ? (
                <form
                  onSubmit={handleSaveEdit}
                  className="ml-auto max-w-[85%] rounded-[var(--ds-radius)] border border-[var(--primary)] bg-[var(--card)] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] text-[var(--primary)] font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Pencil className="h-3 w-3" /> Editing note
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingMessageId(null)}
                      className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={editingDraft}
                    onChange={(e) => setEditingDraft(e.target.value)}
                    className="w-full rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] focus:outline-none"
                    autoFocus
                  />
                  <div className="flex justify-end">
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
                  senderLabel={msg.senderLabel}
                  text={msg.text}
                  timestamp={msg.timestamp}
                  bubbleStyle={bubbleStyle}
                  voiceDurationSeconds={msg.voiceDurationSeconds}
                  voiceSrc={msg.voiceSrc}
                  attachment={msg.attachment}
                  replyPreview={msg.replyPreview}
                  edited={msg.edited}
                  isPinned={msg.isPinned}
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
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Replying Banner */}
      {replyingTo && (
        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--muted)]/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="text-[var(--primary)] font-medium">Replying to:</span>
            <span className="truncate text-[var(--muted-foreground)]">
              {replyingTo.text || replyingTo.attachment?.filename || 'Voice note'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Chat Composer */}
      <footer className="p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--background)]/95 space-y-2">
        {mediaError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-2 rounded-[var(--ds-radius)] border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300"
          >
            <span>{mediaError}</span>
            <button
              type="button"
              onClick={() => setMediaError(null)}
              aria-label="Dismiss security alert"
              className="shrink-0 opacity-80 hover:opacity-100 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
        <ChatComposer
          key={initialPrompt}
          initialText={initialPrompt}
          onSend={handleComposerSend}
          onAttachFile={handleAttachFile}
          onSendVoiceBlob={handleSendVoiceBlob}
          uploadingStage={matrix.uploadingStage ?? localUploadStage}
          placeholder={
            matrixLiveReady
              ? 'Send an E2EE note, photo, video, or voice message...'
              : 'Send a quiet note, encrypted photo, or voice note...'
          }
        />
      </footer>
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
