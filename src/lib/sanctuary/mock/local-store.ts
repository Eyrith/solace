import type { DisappearingPreset } from '@/components/sanctuary/chat-composer'
import { GAME_TEMPLATES } from '@/lib/games/data'
import { QUESTION_LIBRARY } from '@/lib/questions/data'

export type DemoActor = 'self' | 'partner'

export interface LocalProfile {
  selfDisplayName: string
  partnerDisplayName: string
  email: string
  bio: string
  onboardingDone: boolean
}

export interface LocalSpace {
  id: string
  name: string
  role: 'owner' | 'partner'
  createdAt: string
  memberCount: number
  partnerName: string | null
  myMood: string | null
  partnerMood: string | null
  pendingInviteToken?: string | null
  pendingInviteUrl?: string | null
  camouflageAlias?: string | null
  burnTimer?: string | null
}

export interface EncryptedFileMetadata {
  url: string
  key: string
  iv: string
}

export interface LocalEncryptedAttachment {
  id: string
  kind: 'image' | 'audio' | 'video' | 'file'
  filename: string
  mimeType: string
  sizeBytes: number
  durationSeconds?: number
  encryptedFile?: EncryptedFileMetadata
  storageMode: 'local-storage' | 'memory-only'
  ciphertextBase64?: string
}

export interface LocalMessage {
  id: string
  spaceId: string
  senderRole: DemoActor
  senderName: string
  text: string
  createdAt: string
  edited?: boolean
  deleted?: boolean
  pinned?: boolean
  reactions: Record<string, DemoActor[]>
  replyTo?: { id: string; text: string; senderName: string } | null
  disappearing?: DisappearingPreset
  expiresAt?: string | null
  attachment?: LocalEncryptedAttachment
}

export interface LocalDailyAnswerRecord {
  id: string
  spaceId: string
  date: string
  questionId: string
  category: string
  prompt: string
  answers: {
    self?: string
    partner?: string
  }
}

export interface LocalCustomQuestion {
  id: string
  spaceId: string
  category: string
  prompt: string
  createdBy: DemoActor
  createdAt: string
}

export interface LocalGameAnswer {
  self?: string
  partner?: string
}

export interface LocalGameSession {
  id: string
  spaceId: string
  templateId: string
  title: string
  category: string
  status: 'waiting_partner' | 'active' | 'completed'
  currentQuestionIndex: number
  answersByQuestion: Record<string, LocalGameAnswer>
  createdAt: string
  updatedAt: string
}

export interface LocalMemoryEntry {
  id: string
  spaceId: string
  type: 'memory' | 'letter' | 'journal'
  title: string
  content: string
  entryDate: string
  isShared: boolean
  authorRole: DemoActor
  createdAt: string
  updatedAt: string
}

export interface LocalCalendarEvent {
  id: string
  spaceId: string
  title: string
  eventDate: string
  eventType: 'anniversary' | 'date_night' | 'trip' | 'milestone' | 'custom'
  recurringYearly: boolean
  notes?: string
  createdAt: string
}

export interface LocalCallRecord {
  id: string
  spaceId: string
  callType: 'video' | 'voice'
  status: 'ended'
  durationSec: number
  startedAt: string
  initiatorRole: DemoActor
}

export interface LocalInviteRecord {
  token: string
  spaceId: string
  spaceName: string
  inviterName: string
  expiresAt: string
  redeemed?: boolean
}

export interface LocalSanctuaryState {
  version: number
  demoActor: DemoActor
  profile: LocalProfile
  spaces: LocalSpace[]
  messagesBySpace: Record<string, LocalMessage[]>
  dailyBySpaceDate: Record<string, LocalDailyAnswerRecord>
  customQuestionsBySpace: Record<string, LocalCustomQuestion[]>
  savedQuestionIds: string[]
  gamesBySpace: Record<string, LocalGameSession[]>
  memoriesBySpace: Record<string, LocalMemoryEntry[]>
  calendarBySpace: Record<string, LocalCalendarEvent[]>
  callsBySpace: Record<string, LocalCallRecord[]>
  invitesByToken: Record<string, LocalInviteRecord>
}

const STORAGE_KEY = 'sanctuary:local-workspace:v1'
const CHANNEL_NAME = 'sanctuary-local-workspace-sync'
const CHANGE_EVENT = 'sanctuary:local-workspace:changed'
const MAX_PERSISTED_CIPHERTEXT_CHARS = 700_000

const memoryCiphertextCache = new Map<string, string>()
let ssrFallbackState: LocalSanctuaryState | null = null
let broadcastChannel: BroadcastChannel | null = null

export const DISAPPEARING_MS: Record<Exclude<DisappearingPreset, 'off'>, number> = {
  just_seen: 4_000,
  '1s': 1_000,
  '5m': 300_000,
  '1h': 3_600_000,
  '24h': 86_400_000,
}

export function formatDisappearingCountdown(
  expiresAtIso: string | null | undefined,
  nowMs: number = Date.now(),
  preset?: DisappearingPreset
): string | undefined {
  if (expiresAtIso) {
    const remainingMs = Math.max(0, new Date(expiresAtIso).getTime() - nowMs)
    if (remainingMs <= 0) return 'Vanishing...'
    const totalSeconds = Math.ceil(remainingMs / 1000)
    if (totalSeconds < 60) return `Vanishes in ${totalSeconds}s`
    if (totalSeconds < 3600) return `Vanishes in ${Math.ceil(totalSeconds / 60)}m`
    return `Vanishes in ${Math.ceil(totalSeconds / 3600)}h`
  }
  if (preset && preset !== 'off') {
    return preset === 'just_seen' ? 'Vanishes once seen' : `${preset} timer`
  }
  return undefined
}

function uid(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function createInitialState(): LocalSanctuaryState {
  return {
    version: 1,
    demoActor: 'self',
    profile: {
      selfDisplayName: 'You',
      partnerDisplayName: 'Partner',
      email: 'local@sanctuary.internal',
      bio: 'Quiet reflections, shared rituals, and unhurried conversation.',
      onboardingDone: false,
    },
    spaces: [],
    messagesBySpace: {},
    dailyBySpaceDate: {},
    customQuestionsBySpace: {},
    savedQuestionIds: [],
    gamesBySpace: {},
    memoriesBySpace: {},
    calendarBySpace: {},
    callsBySpace: {},
    invitesByToken: {},
  }
}

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null
  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME)
    } catch {
      return null
    }
  }
  return broadcastChannel
}

function emitStateChanged(broadcastAcrossTabs: boolean): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
  if (broadcastAcrossTabs) {
    try {
      getBroadcastChannel()?.postMessage({ updatedAt: Date.now() })
    } catch {}
  }
}

function readStateFromStorage(): LocalSanctuaryState {
  if (typeof window === 'undefined') {
    if (!ssrFallbackState) {
      ssrFallbackState = createInitialState()
    }
    return ssrFallbackState
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const initial = createInitialState()
      writeStateToStorage(initial, false)
      return initial
    }
    const parsed = JSON.parse(raw) as Partial<LocalSanctuaryState>
    const base = createInitialState()
    return {
      ...base,
      ...parsed,
      profile: { ...base.profile, ...(parsed.profile ?? {}) },
      spaces: Array.isArray(parsed.spaces) && parsed.spaces.length > 0 ? parsed.spaces : base.spaces,
      messagesBySpace: parsed.messagesBySpace ?? base.messagesBySpace,
      dailyBySpaceDate: parsed.dailyBySpaceDate ?? {},
      customQuestionsBySpace: parsed.customQuestionsBySpace ?? {},
      savedQuestionIds: Array.isArray(parsed.savedQuestionIds)
        ? parsed.savedQuestionIds
        : base.savedQuestionIds,
      gamesBySpace: parsed.gamesBySpace ?? base.gamesBySpace,
      memoriesBySpace: parsed.memoriesBySpace ?? base.memoriesBySpace,
      calendarBySpace: parsed.calendarBySpace ?? base.calendarBySpace,
      callsBySpace: parsed.callsBySpace ?? {},
      invitesByToken: parsed.invitesByToken ?? {},
    }
  } catch {
    if (!ssrFallbackState) {
      ssrFallbackState = createInitialState()
    }
    return ssrFallbackState
  }
}

function writeStateToStorage(state: LocalSanctuaryState, broadcast = true): void {
  ssrFallbackState = state
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Strip large attachment ciphertexts if storage quota is tight, keeping them in memoryCiphertextCache.
    const stripped: LocalSanctuaryState = {
      ...state,
      messagesBySpace: Object.fromEntries(
        Object.entries(state.messagesBySpace).map(([spaceId, msgs]) => [
          spaceId,
          msgs.map((m) =>
            m.attachment?.ciphertextBase64
              ? {
                  ...m,
                  attachment: {
                    ...m.attachment,
                    storageMode: 'memory-only' as const,
                    ciphertextBase64: undefined,
                  },
                }
              : m
          ),
        ])
      ),
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped))
    } catch {}
  }
  if (broadcast) {
    emitStateChanged(true)
  }
}

function mutateState(updater: (draft: LocalSanctuaryState) => void): LocalSanctuaryState {
  const current = readStateFromStorage()
  const draft: LocalSanctuaryState = structuredClone(current)
  updater(draft)
  writeStateToStorage(draft, true)
  return draft
}

export function actorDisplayName(state: LocalSanctuaryState, actor: DemoActor, spaceId?: string): string {
  if (actor === 'self') {
    return state.profile.selfDisplayName || 'You'
  }
  const space = spaceId ? state.spaces.find((s) => s.id === spaceId) : undefined
  return space?.partnerName || state.profile.partnerDisplayName || 'Partner'
}

export function getLocalSanctuaryState(): LocalSanctuaryState {
  return readStateFromStorage()
}

export function subscribeLocalSanctuary(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onCustom = () => onChange()
  const onStorage = (ev: StorageEvent) => {
    if (ev.key === STORAGE_KEY) onChange()
  }
  window.addEventListener(CHANGE_EVENT, onCustom)
  window.addEventListener('storage', onStorage)

  const channel = getBroadcastChannel()
  const onBroadcast = () => onChange()
  channel?.addEventListener('message', onBroadcast)

  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustom)
    window.removeEventListener('storage', onStorage)
    channel?.removeEventListener('message', onBroadcast)
  }
}

export function resetLocalSanctuaryState(): LocalSanctuaryState {
  memoryCiphertextCache.clear()
  const fresh = createInitialState()
  writeStateToStorage(fresh, true)
  return fresh
}

export function wipeLocalSanctuaryMemory(): void {
  memoryCiphertextCache.clear()
  ssrFallbackState = null
}

export function setLocalDemoActor(actor: DemoActor): LocalSanctuaryState {
  return mutateState((draft) => {
    draft.demoActor = actor
  })
}

export function updateLocalProfile(patch: Partial<LocalProfile>): LocalSanctuaryState {
  return mutateState((draft) => {
    draft.profile = { ...draft.profile, ...patch }
    if (patch.partnerDisplayName !== undefined) {
      for (const space of draft.spaces) {
        if (!space.partnerName || space.partnerName === 'Partner') {
          space.partnerName = patch.partnerDisplayName
        }
      }
    }
  })
}

export function markLocalOnboardingComplete(): LocalSanctuaryState {
  return updateLocalProfile({ onboardingDone: true })
}

export function createLocalSpace(
  name: string,
  partnerName?: string,
  camouflageAlias?: string,
  burnTimer?: string
): { state: LocalSanctuaryState; space: LocalSpace } {
  const current = readStateFromStorage()
  // Hard-lock to 1:1 only: An account can only ever have 1 sanctuary space
  if (current.spaces.length > 0) {
    const existingSpace = current.spaces[0]
    return { state: current, space: existingSpace }
  }

  const id = uid('space')
  const space: LocalSpace = {
    id,
    name: name.trim() || 'Our Sanctuary',
    role: 'owner',
    createdAt: new Date().toISOString(),
    memberCount: 2,
    partnerName: partnerName?.trim() || current.profile.partnerDisplayName || 'Partner',
    myMood: null,
    partnerMood: null,
    pendingInviteToken: null,
    pendingInviteUrl: null,
    camouflageAlias: camouflageAlias?.trim() || null,
    burnTimer: burnTimer || null,
  }
  const state = mutateState((draft) => {
    draft.spaces.push(space)
    draft.messagesBySpace[id] = [
      {
        id: uid('msg'),
        spaceId: id,
        senderRole: 'self',
        senderName: actorDisplayName(draft, 'self', id),
        text: `Connected with "${space.name}" — ready for quiet notes, prompts, and memories.`,
        createdAt: space.createdAt,
        reactions: {},
      },
    ]
  })
  return { state, space }
}

export function renameLocalSpace(
  spaceId: string,
  name: string,
  partnerName?: string,
  camouflageAlias?: string,
  burnTimer?: string
): LocalSanctuaryState {
  return mutateState((draft) => {
    const space = draft.spaces.find((s) => s.id === spaceId)
    if (!space) return
    if (name.trim()) space.name = name.trim()
    if (partnerName !== undefined && partnerName.trim()) {
      space.partnerName = partnerName.trim()
    }
    if (camouflageAlias !== undefined) {
      space.camouflageAlias = camouflageAlias.trim() || null
    }
    if (burnTimer !== undefined) {
      space.burnTimer = burnTimer || null
    }
  })
}

export function setLocalMood(spaceId: string, mood: string): LocalSanctuaryState {
  return mutateState((draft) => {
    const space = draft.spaces.find((s) => s.id === spaceId)
    if (!space) return
    if (draft.demoActor === 'partner') {
      space.partnerMood = mood
    } else {
      space.myMood = mood
    }
  })
}

export function createLocalInvite(
  spaceId: string,
  origin?: string
): { state: LocalSanctuaryState; invite: LocalInviteRecord; inviteUrl: string } {
  const token = `local-${uid('inv')}`
  const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString()
  const baseOrigin =
    origin || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3002')
  const inviteUrl = `${baseOrigin}/invite/${token}`

  let createdInvite: LocalInviteRecord = {
    token,
    spaceId,
    spaceName: 'Our Private Sanctuary',
    inviterName: 'You',
    expiresAt,
  }

  const state = mutateState((draft) => {
    const space = draft.spaces.find((s) => s.id === spaceId)
    createdInvite = {
      token,
      spaceId,
      spaceName: space?.name ?? 'Our Private Sanctuary',
      inviterName: actorDisplayName(draft, draft.demoActor, spaceId),
      expiresAt,
      redeemed: false,
    }
    draft.invitesByToken[token] = createdInvite
    if (space) {
      space.pendingInviteToken = token
      space.pendingInviteUrl = inviteUrl
    }
  })

  return { state, invite: createdInvite, inviteUrl }
}

export function inspectLocalInvite(token: string): LocalInviteRecord | null {
  const state = readStateFromStorage()
  return state.invitesByToken[token] ?? null
}

export function redeemLocalInvite(
  token: string,
  partnerName?: string
): { state: LocalSanctuaryState; space: LocalSpace } | null {
  const current = readStateFromStorage()
  const invite = current.invitesByToken[token]
  if (!invite) return null

  let joinedSpace: LocalSpace | undefined
  const state = mutateState((draft) => {
    const record = draft.invitesByToken[token]
    if (record) record.redeemed = true
    const space = draft.spaces.find((s) => s.id === invite.spaceId)
    if (space) {
      space.memberCount = 2
      space.pendingInviteToken = null
      space.pendingInviteUrl = null
      if (partnerName?.trim()) space.partnerName = partnerName.trim()
      joinedSpace = space
    }
  })

  if (!joinedSpace) return null
  return { state, space: joinedSpace }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  const chunks: string[] = []
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)))
  }
  return btoa(chunks.join(''))
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function inferMediaKind(mimeType: string): LocalEncryptedAttachment['kind'] {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'
  return 'file'
}

async function encryptMediaBuffer(
  plaintextBuffer: ArrayBuffer
): Promise<{ ciphertext: ArrayBuffer; keyB64: string; ivB64: string }> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintextBuffer)
    const exportedKey = await crypto.subtle.exportKey('raw', key)
    return {
      ciphertext,
      keyB64: arrayBufferToBase64(exportedKey),
      ivB64: arrayBufferToBase64(iv.buffer),
    }
  }
  return {
    ciphertext: plaintextBuffer,
    keyB64: 'mock-key',
    ivB64: 'mock-iv',
  }
}

async function decryptMediaBuffer(
  ciphertext: ArrayBuffer,
  meta?: EncryptedFileMetadata
): Promise<ArrayBuffer> {
  if (typeof crypto !== 'undefined' && crypto.subtle && meta && meta.key !== 'mock-key') {
    try {
      const rawKey = base64ToArrayBuffer(meta.key)
      const iv = new Uint8Array(base64ToArrayBuffer(meta.iv))
      const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt'])
      return await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    } catch {
      return ciphertext
    }
  }
  return ciphertext
}

/**
 * Encrypts a local sandbox file or voice note in browser memory using AES-GCM 256-bit
 * so even local sandbox media avoids plaintext persistence.
 */
export async function encryptLocalMediaAttachment(
  file: Blob,
  opts: { filename: string; mimeType: string; durationSeconds?: number }
): Promise<LocalEncryptedAttachment> {
  const buffer = await file.arrayBuffer()
  const { ciphertext, keyB64, ivB64 } = await encryptMediaBuffer(buffer)
  const id = uid('media')
  const kind = inferMediaKind(opts.mimeType)

  const base64 = arrayBufferToBase64(ciphertext)
  memoryCiphertextCache.set(id, base64)
  const persistInStorage = base64.length <= MAX_PERSISTED_CIPHERTEXT_CHARS

  const encryptedFile: EncryptedFileMetadata = {
    url: `local://${id}`,
    key: keyB64,
    iv: ivB64,
  }

  return {
    id,
    kind,
    filename: opts.filename || 'attachment',
    mimeType: opts.mimeType || 'application/octet-stream',
    sizeBytes: file.size,
    durationSeconds: opts.durationSeconds,
    encryptedFile,
    storageMode: persistInStorage ? 'local-storage' : 'memory-only',
    ciphertextBase64: persistInStorage ? base64 : undefined,
  }
}

/**
 * Decrypts a local encrypted attachment back to an in-memory `blob:` URL.
 */
export async function decryptLocalMediaAttachment(
  attachment: LocalEncryptedAttachment
): Promise<string | null> {
  const base64 = attachment.ciphertextBase64 ?? memoryCiphertextCache.get(attachment.id)
  if (!base64) return null
  const ciphertext = base64ToArrayBuffer(base64)
  const plaintext = await decryptMediaBuffer(ciphertext, attachment.encryptedFile)
  const blob = new Blob([plaintext], { type: attachment.mimeType })
  return URL.createObjectURL(blob)
}

export function listLocalMessages(spaceId: string): LocalMessage[] {
  const state = readStateFromStorage()
  const nowMs = Date.now()
  return (state.messagesBySpace[spaceId] ?? []).filter(
    (msg) => !msg.deleted && (msg.pinned || !msg.expiresAt || new Date(msg.expiresAt).getTime() > nowMs)
  )
}

export function pruneExpiredLocalMessages(spaceId: string): boolean {
  const state = readStateFromStorage()
  const list = state.messagesBySpace[spaceId] ?? []
  const nowMs = Date.now()
  const hasExpired = list.some(
    (msg) => !msg.pinned && msg.expiresAt && new Date(msg.expiresAt).getTime() <= nowMs
  )
  if (!hasExpired) return false
  mutateState((draft) => {
    draft.messagesBySpace[spaceId] = (draft.messagesBySpace[spaceId] ?? []).filter(
      (msg) => msg.pinned || !msg.expiresAt || new Date(msg.expiresAt).getTime() > nowMs
    )
  })
  return true
}

export function sendLocalMessage(
  spaceId: string,
  input: {
    text: string
    disappearing?: DisappearingPreset
    replyTo?: { id: string; text: string; senderName: string } | null
    attachment?: LocalEncryptedAttachment
    actor?: DemoActor
  }
): LocalMessage {
  const current = readStateFromStorage()
  const senderRole = input.actor ?? current.demoActor
  const disappearing = input.disappearing ?? 'off'
  const expiresAt =
    disappearing !== 'off' && disappearing !== 'just_seen'
      ? new Date(Date.now() + DISAPPEARING_MS[disappearing]).toISOString()
      : null

  const message: LocalMessage = {
    id: uid('msg'),
    spaceId,
    senderRole,
    senderName: actorDisplayName(current, senderRole, spaceId),
    text: input.text,
    createdAt: new Date().toISOString(),
    reactions: {},
    replyTo: input.replyTo ?? null,
    disappearing,
    expiresAt,
    attachment: input.attachment,
  }

  mutateState((draft) => {
    const existing = draft.messagesBySpace[spaceId] ?? []
    draft.messagesBySpace[spaceId] = [...existing, message]
  })
  return message
}

export function markLocalSpaceSeen(spaceId: string, viewerActor: DemoActor): void {
  const current = readStateFromStorage()
  const msgs = current.messagesBySpace[spaceId] ?? []
  const needsArming = msgs.some(
    (msg) => msg.disappearing === 'just_seen' && !msg.expiresAt && msg.senderRole !== viewerActor
  )
  if (!needsArming) return

  const expiryIso = new Date(Date.now() + DISAPPEARING_MS.just_seen).toISOString()
  mutateState((draft) => {
    for (const msg of draft.messagesBySpace[spaceId] ?? []) {
      if (msg.disappearing === 'just_seen' && !msg.expiresAt && msg.senderRole !== viewerActor) {
        msg.expiresAt = expiryIso
      }
    }
  })
}

export function editLocalMessage(spaceId: string, messageId: string, newText: string): void {
  const trimmed = newText.trim()
  if (!trimmed) return
  mutateState((draft) => {
    const msg = (draft.messagesBySpace[spaceId] ?? []).find((m) => m.id === messageId)
    if (msg) {
      msg.text = trimmed
      msg.edited = true
    }
  })
}

export function deleteLocalMessage(spaceId: string, messageId: string): void {
  mutateState((draft) => {
    draft.messagesBySpace[spaceId] = (draft.messagesBySpace[spaceId] ?? []).filter(
      (m) => m.id !== messageId
    )
  })
}

export function toggleLocalPin(spaceId: string, messageId: string): void {
  mutateState((draft) => {
    const msg = (draft.messagesBySpace[spaceId] ?? []).find((m) => m.id === messageId)
    if (msg) {
      msg.pinned = !msg.pinned
    }
  })
}

export function toggleLocalReaction(
  spaceId: string,
  messageId: string,
  emoji: string,
  actor?: DemoActor
): void {
  mutateState((draft) => {
    const who = actor ?? draft.demoActor
    const msg = (draft.messagesBySpace[spaceId] ?? []).find((m) => m.id === messageId)
    if (!msg) return
    const list = msg.reactions[emoji] ?? []
    if (list.includes(who)) {
      const next = list.filter((item) => item !== who)
      if (next.length === 0) {
        delete msg.reactions[emoji]
      } else {
        msg.reactions[emoji] = next
      }
    } else {
      msg.reactions[emoji] = [...list, who]
    }
  })
}

function deterministicQuestionForDate(spaceId: string, dateStr: string) {
  let hash = 0
  const seed = `${spaceId}:${dateStr}`
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return QUESTION_LIBRARY[hash % QUESTION_LIBRARY.length]
}

export interface LocalDailyView {
  id: string
  date: string
  questionId: string
  category: string
  prompt: string
  myAnswer: string | null
  hasPartnerAnswered: boolean
  partnerAnswer: string | null
  revealed: boolean
}

function formatDailyView(record: LocalDailyAnswerRecord, actor: DemoActor): LocalDailyView {
  const other: DemoActor = actor === 'self' ? 'partner' : 'self'
  const myAnswer = record.answers[actor] ?? null
  const otherAnswer = record.answers[other] ?? null
  const revealed = Boolean(myAnswer && otherAnswer)
  return {
    id: record.id,
    date: record.date,
    questionId: record.questionId,
    category: record.category,
    prompt: record.prompt,
    myAnswer,
    hasPartnerAnswered: Boolean(otherAnswer),
    partnerAnswer: revealed ? otherAnswer : null,
    revealed,
  }
}

export function getLocalDailyInquiry(spaceId: string): LocalDailyView {
  const state = readStateFromStorage()
  const dateStr = todayKey()
  const key = `${spaceId}:${dateStr}`
  let record = state.dailyBySpaceDate[key]

  if (!record) {
    const q = deterministicQuestionForDate(spaceId, dateStr)
    record = {
      id: `daily-${spaceId}-${dateStr}`,
      spaceId,
      date: dateStr,
      questionId: q.id,
      category: q.category,
      prompt: q.prompt,
      answers: {},
    }
    mutateState((draft) => {
      if (!draft.dailyBySpaceDate[key]) {
        draft.dailyBySpaceDate[key] = record
      }
    })
  }

  return formatDailyView(record, state.demoActor)
}

export function answerLocalDailyInquiry(
  spaceId: string,
  answer: string,
  actor?: DemoActor
): LocalDailyView {
  const dateStr = todayKey()
  const key = `${spaceId}:${dateStr}`
  const trimmed = answer.trim()

  const nextState = mutateState((draft) => {
    const who = actor ?? draft.demoActor
    if (!draft.dailyBySpaceDate[key]) {
      const q = deterministicQuestionForDate(spaceId, dateStr)
      draft.dailyBySpaceDate[key] = {
        id: `daily-${spaceId}-${dateStr}`,
        spaceId,
        date: dateStr,
        questionId: q.id,
        category: q.category,
        prompt: q.prompt,
        answers: {},
      }
    }
    if (trimmed) {
      draft.dailyBySpaceDate[key].answers[who] = trimmed
    }
  })

  return formatDailyView(nextState.dailyBySpaceDate[key], nextState.demoActor)
}

export function listLocalCustomQuestions(spaceId: string): LocalCustomQuestion[] {
  return readStateFromStorage().customQuestionsBySpace[spaceId] ?? []
}

export function addLocalCustomQuestion(
  spaceId: string,
  category: string,
  prompt: string
): LocalCustomQuestion {
  const state = readStateFromStorage()
  const item: LocalCustomQuestion = {
    id: uid('cq'),
    spaceId,
    category,
    prompt: prompt.trim(),
    createdBy: state.demoActor,
    createdAt: new Date().toISOString(),
  }
  mutateState((draft) => {
    const existing = draft.customQuestionsBySpace[spaceId] ?? []
    draft.customQuestionsBySpace[spaceId] = [item, ...existing]
  })
  return item
}

export function listSavedQuestionIds(): string[] {
  return readStateFromStorage().savedQuestionIds
}

export function toggleSavedQuestion(questionId: string): string[] {
  const next = mutateState((draft) => {
    if (draft.savedQuestionIds.includes(questionId)) {
      draft.savedQuestionIds = draft.savedQuestionIds.filter((id) => id !== questionId)
    } else {
      draft.savedQuestionIds = [...draft.savedQuestionIds, questionId]
    }
  })
  return next.savedQuestionIds
}

export function listLocalGames(spaceId: string): LocalGameSession[] {
  return readStateFromStorage().gamesBySpace[spaceId] ?? []
}

export function getLocalGameSession(spaceId: string, sessionId: string): LocalGameSession | null {
  return listLocalGames(spaceId).find((g) => g.id === sessionId) ?? null
}

export function createLocalGameSession(spaceId: string, templateId: string): LocalGameSession {
  const template = GAME_TEMPLATES.find((t) => t.id === templateId) ?? GAME_TEMPLATES[0]
  const nowIso = new Date().toISOString()
  const session: LocalGameSession = {
    id: uid('game'),
    spaceId,
    templateId: template.id,
    title: template.title,
    category: template.category,
    status: 'waiting_partner',
    currentQuestionIndex: 0,
    answersByQuestion: {},
    createdAt: nowIso,
    updatedAt: nowIso,
  }
  mutateState((draft) => {
    const existing = draft.gamesBySpace[spaceId] ?? []
    draft.gamesBySpace[spaceId] = [session, ...existing]
  })
  return session
}

export function submitLocalGameAnswer(
  spaceId: string,
  sessionId: string,
  questionId: string,
  answer: string,
  actor?: DemoActor
): LocalGameSession | null {
  const trimmed = answer.trim()
  if (!trimmed) return getLocalGameSession(spaceId, sessionId)

  let updated: LocalGameSession | null = null
  mutateState((draft) => {
    const who = actor ?? draft.demoActor
    const session = (draft.gamesBySpace[spaceId] ?? []).find((g) => g.id === sessionId)
    if (!session) return
    const existingRound = session.answersByQuestion[questionId] ?? {}
    session.answersByQuestion[questionId] = {
      ...existingRound,
      [who]: trimmed,
    }
    const template = GAME_TEMPLATES.find((t) => t.id === session.templateId)
    const totalQuestions = template?.questions.length ?? 0
    const allCompleted =
      totalQuestions > 0 &&
      template!.questions.every(
        (q) =>
          Boolean(session.answersByQuestion[q.id]?.self) &&
          Boolean(session.answersByQuestion[q.id]?.partner)
      )
    session.status = allCompleted ? 'completed' : 'active'
    session.updatedAt = new Date().toISOString()
    updated = session
  })
  return updated
}

export function advanceLocalGameRound(
  spaceId: string,
  sessionId: string,
  nextIndex: number
): LocalGameSession | null {
  let updated: LocalGameSession | null = null
  mutateState((draft) => {
    const session = (draft.gamesBySpace[spaceId] ?? []).find((g) => g.id === sessionId)
    if (!session) return
    const template = GAME_TEMPLATES.find((t) => t.id === session.templateId)
    const maxIndex = Math.max(0, (template?.questions.length ?? 1) - 1)
    session.currentQuestionIndex = Math.max(0, Math.min(maxIndex, nextIndex))
    session.updatedAt = new Date().toISOString()
    updated = session
  })
  return updated
}

export function listLocalMemories(spaceId: string, viewerActor?: DemoActor): LocalMemoryEntry[] {
  const state = readStateFromStorage()
  const viewer = viewerActor ?? state.demoActor
  const all = state.memoriesBySpace[spaceId] ?? []
  return all.filter(
    (entry) => entry.type !== 'journal' || entry.isShared || entry.authorRole === viewer
  )
}

export function createLocalMemory(
  spaceId: string,
  input: {
    type: 'memory' | 'letter' | 'journal'
    title: string
    content: string
    entryDate: string
    isShared: boolean
    actor?: DemoActor
  }
): LocalMemoryEntry {
  const state = readStateFromStorage()
  const nowIso = new Date().toISOString()
  const entry: LocalMemoryEntry = {
    id: uid('mem'),
    spaceId,
    type: input.type,
    title: input.title.trim(),
    content: input.content.trim(),
    entryDate: input.entryDate || todayKey(),
    isShared: input.type === 'journal' ? input.isShared : true,
    authorRole: input.actor ?? state.demoActor,
    createdAt: nowIso,
    updatedAt: nowIso,
  }
  mutateState((draft) => {
    const existing = draft.memoriesBySpace[spaceId] ?? []
    draft.memoriesBySpace[spaceId] = [entry, ...existing]
  })
  return entry
}

export function updateLocalMemory(
  spaceId: string,
  memoryId: string,
  patch: Partial<Pick<LocalMemoryEntry, 'title' | 'content' | 'entryDate' | 'isShared'>>
): LocalMemoryEntry | null {
  let updated: LocalMemoryEntry | null = null
  mutateState((draft) => {
    const entry = (draft.memoriesBySpace[spaceId] ?? []).find((m) => m.id === memoryId)
    if (!entry) return
    if (patch.title !== undefined) entry.title = patch.title.trim()
    if (patch.content !== undefined) entry.content = patch.content.trim()
    if (patch.entryDate !== undefined) entry.entryDate = patch.entryDate
    if (patch.isShared !== undefined) {
      entry.isShared = entry.type === 'journal' ? patch.isShared : true
    }
    entry.updatedAt = new Date().toISOString()
    updated = entry
  })
  return updated
}

export function deleteLocalMemory(spaceId: string, memoryId: string): void {
  mutateState((draft) => {
    draft.memoriesBySpace[spaceId] = (draft.memoriesBySpace[spaceId] ?? []).filter(
      (m) => m.id !== memoryId
    )
  })
}

export function listLocalCalendarEvents(spaceId: string): LocalCalendarEvent[] {
  return readStateFromStorage().calendarBySpace[spaceId] ?? []
}

export function createLocalCalendarEvent(
  spaceId: string,
  input: {
    title: string
    eventDate: string
    eventType: LocalCalendarEvent['eventType']
    recurringYearly: boolean
    notes?: string
  }
): LocalCalendarEvent {
  const event: LocalCalendarEvent = {
    id: uid('cal'),
    spaceId,
    title: input.title.trim(),
    eventDate: input.eventDate,
    eventType: input.eventType,
    recurringYearly: input.recurringYearly,
    notes: input.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  }
  mutateState((draft) => {
    const existing = draft.calendarBySpace[spaceId] ?? []
    draft.calendarBySpace[spaceId] = [...existing, event]
  })
  return event
}

export function updateLocalCalendarEvent(
  spaceId: string,
  eventId: string,
  patch: Partial<Omit<LocalCalendarEvent, 'id' | 'spaceId' | 'createdAt'>>
): LocalCalendarEvent | null {
  let updated: LocalCalendarEvent | null = null
  mutateState((draft) => {
    const ev = (draft.calendarBySpace[spaceId] ?? []).find((item) => item.id === eventId)
    if (!ev) return
    if (patch.title !== undefined) ev.title = patch.title.trim()
    if (patch.eventDate !== undefined) ev.eventDate = patch.eventDate
    if (patch.eventType !== undefined) ev.eventType = patch.eventType
    if (patch.recurringYearly !== undefined) ev.recurringYearly = patch.recurringYearly
    if (patch.notes !== undefined) ev.notes = patch.notes?.trim() || undefined
    updated = ev
  })
  return updated
}

export function deleteLocalCalendarEvent(spaceId: string, eventId: string): void {
  mutateState((draft) => {
    draft.calendarBySpace[spaceId] = (draft.calendarBySpace[spaceId] ?? []).filter(
      (item) => item.id !== eventId
    )
  })
}

export function listLocalCalls(spaceId: string): LocalCallRecord[] {
  return readStateFromStorage().callsBySpace[spaceId] ?? []
}

export function logLocalCall(
  spaceId: string,
  input: { callType: 'video' | 'voice'; durationSec: number }
): LocalCallRecord {
  const state = readStateFromStorage()
  const record: LocalCallRecord = {
    id: uid('call'),
    spaceId,
    callType: input.callType,
    status: 'ended',
    durationSec: Math.max(0, Math.round(input.durationSec)),
    startedAt: new Date(Date.now() - Math.max(0, input.durationSec) * 1000).toISOString(),
    initiatorRole: state.demoActor,
  }
  mutateState((draft) => {
    const existing = draft.callsBySpace[spaceId] ?? []
    draft.callsBySpace[spaceId] = [record, ...existing].slice(0, 30)
  })
  return record
}

