'use client'

import * as React from 'react'
import {
  ClientEvent,
  EventType,
  MatrixEventEvent,
  MsgType,
  RoomEvent,
  type MatrixClient,
  type MatrixEvent,
  type Room,
} from 'matrix-js-sdk'
import type { EncryptedFile } from 'matrix-js-sdk/lib/@types/media'
import type {
  EmojiMapping,
  ShowSasCallbacks,
  VerificationRequest,
} from 'matrix-js-sdk/lib/crypto-api'
import { ShieldCheck, KeyRound, Lock, X, Copy, Check } from 'lucide-react'
import {
  extractValidatedEncryptedMediaContent,
  fetchAndDecryptMedia,
  MediaSecurityError,
  redactEncryptedMediaEvent,
  uploadAndSendEncryptedMedia,
  type ValidatedEncryptedMediaDescriptor,
} from '@/lib/matrix/encrypted-media'
import {
  attachVerificationFlowHandlers,
  bootstrapEncryptedIdentityAndBackup,
  CryptoEvent,
  getEncryptionSecurityStatus,
  initSanctuaryMatrixClient,
  SecretKeyMemoryVault,
  startPartnerVerification,
  unlockAndRestoreFromRecoveryKey,
  VerificationPhase,
  type EncryptionSecurityStatus,
} from '@/lib/matrix/crypto-lifecycle'
import { Button } from '@/components/ui/button'

export type MatrixConnectionStatus = 'idle' | 'connecting' | 'ready' | 'unconfigured' | 'error'

export interface SanctuaryDecryptedMessage {
  id: string
  roomId: string
  senderId: string
  isOwn: boolean
  timestampMs: number
  timestampLabel: string
  kind: 'text' | 'image' | 'video' | 'audio' | 'file'
  text?: string
  media?: ValidatedEncryptedMediaDescriptor
  isEncryptedEvent: boolean
  decryptionError?: string
  redacted: boolean
}

export interface MatrixSessionPayload {
  homeserverUrl: string
  serverName: string
  userId: string
  accessToken: string
  deviceId: string
  roomId: string | null
  peerUserId: string | null
  mode: 'supabase' | 'local_poc'
}

interface ActiveSasState {
  request: VerificationRequest
  phase: VerificationPhase
  emojis: EmojiMapping[]
  callbacks: ShowSasCallbacks | null
  otherUserId: string
  initiatedByMe: boolean
  error?: string
}

interface MatrixContextValue {
  status: MatrixConnectionStatus
  statusMessage: string | null
  session: MatrixSessionPayload | null
  activeRoomId: string | null
  securityStatus: EncryptionSecurityStatus | null
  messagesByRoom: Record<string, SanctuaryDecryptedMessage[]>
  decryptedUrls: Record<string, string>
  uploadingStage: 'verifying' | 'encrypting' | 'uploading' | 'sending' | null
  connectSpace: (spaceId: string, pocUser?: 'alice' | 'bob') => Promise<MatrixSessionPayload | null>
  disconnect: () => void
  sendTextMessage: (roomId: string, text: string) => Promise<string | null>
  sendEncryptedMedia: (
    roomId: string,
    file: Blob,
    options: { filename: string; mimeType: string; caption?: string; durationMs?: number }
  ) => Promise<string>
  ensureDecryptedMediaUrl: (
    file: EncryptedFile,
    mimeType: string,
    variant: 'full' | 'thumbnail'
  ) => Promise<string>
  redactMessage: (roomId: string, eventId: string) => Promise<void>
  setupEncryptionAndBackup: (passphrase?: string) => Promise<string | null>
  unlockWithRecoveryKey: (recoveryKey: string) => Promise<boolean>
  initiatePartnerVerification: (roomId: string, peerUserId: string) => Promise<void>
  refreshSecurityStatus: (peerIds?: string[]) => Promise<void>
}

const MatrixContext = React.createContext<MatrixContextValue | null>(null)

function formatTimeLabel(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

function mapEventToMessage(
  event: MatrixEvent,
  ownUserId: string | null,
  roomId: string
): SanctuaryDecryptedMessage | null {
  if (event.getType() !== EventType.RoomMessage) return null
  const eventId = event.getId()
  if (!eventId) return null

  const senderId = event.getSender() || ''
  const timestampMs = event.getTs() || Date.now()
  const base = {
    id: eventId,
    roomId,
    senderId,
    isOwn: senderId === ownUserId,
    timestampMs,
    timestampLabel: formatTimeLabel(timestampMs),
    isEncryptedEvent: event.isEncrypted(),
    redacted: event.isRedacted(),
  }

  if (event.isRedacted()) {
    return {
      ...base,
      kind: 'text',
      text: 'This message was deleted.',
    }
  }

  if (event.isDecryptionFailure()) {
    return {
      ...base,
      kind: 'text',
      decryptionError:
        'Encrypted with keys not shared with this device yet. Restore your Recovery Key or verify devices.',
    }
  }

  const content = event.getContent() as Record<string, unknown>
  if (content.msgtype === MsgType.Text) {
    return {
      ...base,
      kind: 'text',
      text: typeof content.body === 'string' ? content.body : '',
    }
  }

  try {
    const media = extractValidatedEncryptedMediaContent(event)
    if (!media) return null
    const kind =
      media.msgtype === MsgType.Image
        ? 'image'
        : media.msgtype === MsgType.Video
          ? 'video'
          : media.msgtype === MsgType.Audio
            ? 'audio'
            : 'file'
    return {
      ...base,
      kind,
      text: media.body !== media.filename ? media.body : undefined,
      media,
    }
  } catch (err) {
    return {
      ...base,
      kind: 'text',
      decryptionError:
        err instanceof MediaSecurityError
          ? err.message
          : 'Blocked unsafe/unencrypted media payload.',
    }
  }
}

export function MatrixProvider({ children }: { children: React.ReactNode }) {
  const clientRef = React.useRef<MatrixClient | null>(null)
  const vaultRef = React.useRef<SecretKeyMemoryVault>(new SecretKeyMemoryVault())
  const decryptedCacheRef = React.useRef<Map<string, string>>(new Map())
  const inflightDecryptsRef = React.useRef<Map<string, Promise<string>>>(new Map())
  const verificationCleanupRef = React.useRef<(() => void) | null>(null)

  const [status, setStatus] = React.useState<MatrixConnectionStatus>('idle')
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null)
  const [session, setSession] = React.useState<MatrixSessionPayload | null>(null)
  const [activeRoomId, setActiveRoomId] = React.useState<string | null>(null)
  const [securityStatus, setSecurityStatus] = React.useState<EncryptionSecurityStatus | null>(null)
  const [messagesByRoom, setMessagesByRoom] = React.useState<
    Record<string, SanctuaryDecryptedMessage[]>
  >({})
  const [decryptedUrls, setDecryptedUrls] = React.useState<Record<string, string>>({})
  const [uploadingStage, setUploadingStage] = React.useState<
    'verifying' | 'encrypting' | 'uploading' | 'sending' | null
  >(null)

  const [pendingRecoveryKey, setPendingRecoveryKey] = React.useState<string | null>(null)
  const [copiedRecovery, setCopiedRecovery] = React.useState(false)
  const [sasModal, setSasModal] = React.useState<ActiveSasState | null>(null)

  const revokeAllDecryptedUrls = React.useCallback(() => {
    for (const url of decryptedCacheRef.current.values()) {
      URL.revokeObjectURL(url)
    }
    decryptedCacheRef.current.clear()
    inflightDecryptsRef.current.clear()
    setDecryptedUrls({})
  }, [])

  const disconnect = React.useCallback(() => {
    verificationCleanupRef.current?.()
    verificationCleanupRef.current = null
    if (clientRef.current) {
      try {
        clientRef.current.stopClient()
      } catch {
        // Ignore teardown errors
      }
      clientRef.current = null
    }
    vaultRef.current.clear()
    revokeAllDecryptedUrls()
    setSession(null)
    setActiveRoomId(null)
    setSecurityStatus(null)
    setMessagesByRoom({})
    setStatus('idle')
    setStatusMessage(null)
    setSasModal(null)
  }, [revokeAllDecryptedUrls])

  React.useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  const rebuildRoomMessages = React.useCallback((room: Room) => {
    const ownId = clientRef.current?.getUserId() ?? null
    const timelineEvents = room.getLiveTimeline().getEvents()
    const mapped: SanctuaryDecryptedMessage[] = []
    for (const ev of timelineEvents) {
      const parsed = mapEventToMessage(ev, ownId, room.roomId)
      if (parsed) mapped.push(parsed)
    }
    setMessagesByRoom((prev) => ({
      ...prev,
      [room.roomId]: mapped,
    }))
  }, [])

  const refreshSecurityStatus = React.useCallback(
    async (peerIds?: string[]) => {
      const client = clientRef.current
      if (!client) return
      const targetPeers = peerIds ?? (session?.peerUserId ? [session.peerUserId] : [])
      const next = await getEncryptionSecurityStatus(client, targetPeers)
      setSecurityStatus(next)
    },
    [session]
  )

  const bindVerificationRequest = React.useCallback((req: VerificationRequest) => {
    verificationCleanupRef.current?.()
    setSasModal({
      request: req,
      phase: req.phase,
      emojis: [],
      callbacks: null,
      otherUserId: req.otherUserId,
      initiatedByMe: req.initiatedByMe,
    })

    verificationCleanupRef.current = attachVerificationFlowHandlers(req, {
      onPhaseChange: (phase) => {
        setSasModal((prev) => (prev ? { ...prev, phase } : prev))
        if (phase === VerificationPhase.Ready && req.initiatedByMe && !req.verifier) {
          req.startVerification('m.sas.v1').catch(() => {})
        }
      },
      onShowSas: (emojis, callbacks) => {
        setSasModal((prev) => (prev ? { ...prev, emojis, callbacks } : prev))
      },
      onCancelled: (reason) => {
        setSasModal((prev) => (prev ? { ...prev, error: reason } : null))
      },
      onCompleted: () => {
        setSasModal(null)
        void refreshSecurityStatus()
      },
    })
  }, [refreshSecurityStatus])

  const connectSpace = React.useCallback(
    async (spaceId: string, pocUser?: 'alice' | 'bob'): Promise<MatrixSessionPayload | null> => {
      setStatus('connecting')
      setStatusMessage(null)

      try {
        const res = await fetch('/api/matrix/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spaceId, pocUser }),
        })

        const payload = (await res.json()) as Partial<MatrixSessionPayload> & {
          error?: string
          code?: string
        }

        if (!res.ok) {
          if (payload.code === 'MATRIX_NOT_CONFIGURED' || res.status === 503) {
            setStatus('unconfigured')
            setStatusMessage(payload.error || 'Matrix homeserver not configured')
            return null
          }
          if (res.status === 401) {
            setStatus('unconfigured')
            setStatusMessage('Sign in required to initialize end-to-end encrypted messaging')
            return null
          }
          throw new Error(payload.error || 'Failed to obtain Matrix session')
        }

        const validSession = payload as MatrixSessionPayload
        const currentUserId = clientRef.current?.getUserId()

        if (!clientRef.current || currentUserId !== validSession.userId) {
          disconnect()
          setStatus('connecting')

          const { client } = await initSanctuaryMatrixClient({
            homeserverUrl: validSession.homeserverUrl,
            userId: validSession.userId,
            accessToken: validSession.accessToken,
            deviceId: validSession.deviceId,
            vault: vaultRef.current,
          })

          clientRef.current = client

          client.on(RoomEvent.Timeline, (_event, room) => {
            if (room) rebuildRoomMessages(room)
          })
          client.on(MatrixEventEvent.Decrypted, (ev) => {
            const rId = ev.getRoomId()
            if (rId) {
              const r = client.getRoom(rId)
              if (r) rebuildRoomMessages(r)
            }
          })
          client.on(RoomEvent.Redaction, (_ev, room) => {
            if (room) rebuildRoomMessages(room)
          })
          client.on(CryptoEvent.VerificationRequestReceived, (req) => {
            bindVerificationRequest(req)
          })
          client.on(CryptoEvent.UserTrustStatusChanged, () => {
            void getEncryptionSecurityStatus(
              client,
              validSession.peerUserId ? [validSession.peerUserId] : []
            ).then(setSecurityStatus)
          })

          await new Promise<void>((resolve) => {
            if (client.isInitialSyncComplete()) {
              resolve()
              return
            }
            const onSync = (state: string) => {
              if (state === 'PREPARED' || state === 'SYNCING') {
                client.off(ClientEvent.Sync, onSync)
                resolve()
              }
            }
            client.on(ClientEvent.Sync, onSync)
            window.setTimeout(() => {
              client.off(ClientEvent.Sync, onSync)
              resolve()
            }, 6000)
          })
        }

        setSession(validSession)
        setActiveRoomId(validSession.roomId)

        const client = clientRef.current
        if (client && validSession.roomId) {
          const room = client.getRoom(validSession.roomId)
          if (room) {
            await client.decryptEventIfNeeded?.(room.getLiveTimeline().getEvents()[0]).catch(() => {})
            rebuildRoomMessages(room)
          }
        }

        if (client) {
          const sec = await getEncryptionSecurityStatus(
            client,
            validSession.peerUserId ? [validSession.peerUserId] : []
          )
          setSecurityStatus(sec)
        }

        setStatus('ready')
        return validSession
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Matrix connection failed'
        setStatus('error')
        setStatusMessage(msg)
        return null
      }
    },
    [bindVerificationRequest, disconnect, rebuildRoomMessages]
  )

  const sendTextMessage = React.useCallback(async (roomId: string, text: string) => {
    const client = clientRef.current
    if (!client) throw new Error('Matrix client is not connected')
    const crypto = client.getCrypto()
    if (!crypto || !(await crypto.isEncryptionEnabledInRoom(roomId))) {
      throw new MediaSecurityError('UNENCRYPTED_ROOM', 'Refusing to send message in unencrypted room')
    }
    const res = await client.sendMessage(roomId, {
      msgtype: MsgType.Text,
      body: text,
    })
    return res.event_id
  }, [])

  const sendEncryptedMedia = React.useCallback(
    async (
      roomId: string,
      file: Blob,
      options: { filename: string; mimeType: string; caption?: string; durationMs?: number }
    ) => {
      const client = clientRef.current
      if (!client) throw new Error('Matrix client is not connected')
      try {
        const res = await uploadAndSendEncryptedMedia(client, {
          roomId,
          file,
          filename: options.filename,
          mimeType: options.mimeType,
          caption: options.caption,
          durationMs: options.durationMs,
          generateThumbnail: true,
          requireVerifiedRecipients: true,
          enforceMaxTwoMembers: true,
          onStageChange: (stage) => setUploadingStage(stage),
        })
        return res.eventId
      } finally {
        setUploadingStage(null)
      }
    },
    []
  )

  const ensureDecryptedMediaUrl = React.useCallback(
    async (file: EncryptedFile, mimeType: string, variant: 'full' | 'thumbnail') => {
      const cacheKey = `${file.url}::${variant}`
      const existing = decryptedCacheRef.current.get(cacheKey)
      if (existing) return existing

      const inflight = inflightDecryptsRef.current.get(cacheKey)
      if (inflight) return inflight

      const client = clientRef.current
      if (!client) {
        throw new MediaSecurityError('CRYPTO_UNAVAILABLE', 'Matrix client is disconnected')
      }

      const promise = fetchAndDecryptMedia(client, file, mimeType)
        .then(({ blob }) => {
          const blobUrl = URL.createObjectURL(blob)
          decryptedCacheRef.current.set(cacheKey, blobUrl)
          setDecryptedUrls((prev) => ({ ...prev, [cacheKey]: blobUrl }))
          return blobUrl
        })
        .finally(() => {
          inflightDecryptsRef.current.delete(cacheKey)
        })

      inflightDecryptsRef.current.set(cacheKey, promise)
      return promise
    },
    []
  )

  const redactMessage = React.useCallback(async (roomId: string, eventId: string) => {
    const client = clientRef.current
    if (!client) return
    await redactEncryptedMediaEvent(client, roomId, eventId)
    const room = client.getRoom(roomId)
    if (room) rebuildRoomMessages(room)
  }, [rebuildRoomMessages])

  const setupEncryptionAndBackup = React.useCallback(
    async (passphrase?: string): Promise<string | null> => {
      const client = clientRef.current
      if (!client) return null
      const result = await bootstrapEncryptedIdentityAndBackup(client, vaultRef.current, {
        passphrase,
      })
      setPendingRecoveryKey(result.recoveryKey)
      await refreshSecurityStatus()
      return result.recoveryKey
    },
    [refreshSecurityStatus]
  )

  const unlockWithRecoveryKey = React.useCallback(
    async (recoveryKey: string): Promise<boolean> => {
      const client = clientRef.current
      if (!client) return false
      await unlockAndRestoreFromRecoveryKey(client, vaultRef.current, recoveryKey)
      if (activeRoomId) {
        const room = client.getRoom(activeRoomId)
        if (room) {
          for (const ev of room.getLiveTimeline().getEvents()) {
            await client.decryptEventIfNeeded?.(ev).catch(() => {})
          }
          rebuildRoomMessages(room)
        }
      }
      await refreshSecurityStatus()
      return true
    },
    [activeRoomId, rebuildRoomMessages, refreshSecurityStatus]
  )

  const initiatePartnerVerification = React.useCallback(
    async (roomId: string, peerUserId: string) => {
      const client = clientRef.current
      if (!client) throw new Error('Matrix client is not connected')
      const req = await startPartnerVerification(client, peerUserId, roomId)
      bindVerificationRequest(req)
    },
    [bindVerificationRequest]
  )

  const copyRecoveryKey = async () => {
    if (!pendingRecoveryKey) return
    await navigator.clipboard.writeText(pendingRecoveryKey)
    setCopiedRecovery(true)
    window.setTimeout(() => setCopiedRecovery(false), 2000)
  }

  return (
    <MatrixContext.Provider
      value={{
        status,
        statusMessage,
        session,
        activeRoomId,
        securityStatus,
        messagesByRoom,
        decryptedUrls,
        uploadingStage,
        connectSpace,
        disconnect,
        sendTextMessage,
        sendEncryptedMedia,
        ensureDecryptedMediaUrl,
        redactMessage,
        setupEncryptionAndBackup,
        unlockWithRecoveryKey,
        initiatePartnerVerification,
        refreshSecurityStatus,
      }}
    >
      {children}

      {/* One-time Recovery Key Display Modal */}
      {pendingRecoveryKey && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Save your encrypted backup recovery key"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
                <h2 className="font-serif text-lg font-medium text-[var(--foreground)]">
                  Save your Sanctuary Recovery Key
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close recovery key notice"
                onClick={() => setPendingRecoveryKey(null)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
              Your encrypted message and media backup is protected by this key. Neither Synapse nor
              Supabase stores a readable copy. Save it offline before closing this dialog.
            </p>
            <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--muted)]/50 p-3 font-mono text-xs break-all select-all text-[var(--foreground)]">
              {pendingRecoveryKey}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={copyRecoveryKey}>
                {copiedRecovery ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    <span>Copy key</span>
                  </>
                )}
              </Button>
              <Button type="button" variant="primary" onClick={() => setPendingRecoveryKey(null)}>
                I&apos;ve saved it safely
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive SAS Emoji Device Verification Modal */}
      {sasModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Verify partner encryption devices"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
                <div>
                  <h2 className="font-serif text-lg font-medium text-[var(--foreground)]">
                    Verify partner devices
                  </h2>
                  <p className="text-xs text-[var(--muted-foreground)] font-mono">
                    {sasModal.otherUserId}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Cancel verification"
                onClick={() => {
                  sasModal.callbacks?.cancel()
                  void sasModal.request.cancel()
                  setSasModal(null)
                }}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {sasModal.error && (
              <p className="rounded-[var(--ds-radius)] bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                {sasModal.error}
              </p>
            )}

            {!sasModal.initiatedByMe && sasModal.phase === VerificationPhase.Requested && (
              <div className="space-y-3">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Your partner wants to verify encryption keys via a 7-emoji comparison so media
                  decryption keys can be trusted end-to-end.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      void sasModal.request.cancel()
                      setSasModal(null)
                    }}
                  >
                    Decline
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={async () => {
                      await sasModal.request.accept()
                    }}
                  >
                    Accept &amp; compare emojis
                  </Button>
                </div>
              </div>
            )}

            {sasModal.emojis.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Confirm these seven emojis appear in exact order on your partner&apos;s screen:
                </p>
                <div className="grid grid-cols-4 gap-2 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--muted)]/40 p-3">
                  {sasModal.emojis.map(([emoji, label], idx) => (
                    <div
                      key={`${label}-${idx}`}
                      className="flex flex-col items-center justify-center rounded-md bg-[var(--background)] px-2 py-2 text-center"
                    >
                      <span className="text-2xl" role="img" aria-label={label}>
                        {emoji}
                      </span>
                      <span className="mt-1 text-[10px] text-[var(--muted-foreground)] leading-tight">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      sasModal.callbacks?.mismatch()
                      setSasModal(null)
                    }}
                  >
                    They don&apos;t match
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={async () => {
                      await sasModal.callbacks?.confirm()
                    }}
                  >
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>They match — Trust partner</span>
                  </Button>
                </div>
              </div>
            ) : (
              sasModal.phase !== VerificationPhase.Requested && (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Negotiating encrypted verification channel (phase: {sasModal.phase})...
                </p>
              )
            )}
          </div>
        </div>
      )}
    </MatrixContext.Provider>
  )
}

export function useMatrix(): MatrixContextValue {
  const ctx = React.useContext(MatrixContext)
  if (!ctx) {
    throw new Error('useMatrix must be used within MatrixProvider inside (app)')
  }
  return ctx
}

