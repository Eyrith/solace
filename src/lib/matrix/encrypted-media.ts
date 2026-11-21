import { decryptAttachment, encryptAttachment, type IEncryptedFile } from 'matrix-encrypt-attachment'
import { EventType, MsgType, type MatrixClient, type MatrixEvent, type UploadProgress } from 'matrix-js-sdk'
import type {
  AudioContent,
  EncryptedFile,
  FileContent,
  ImageContent,
  VideoContent,
} from 'matrix-js-sdk/lib/@types/media'

export type MediaSecurityErrorCode =
  | 'PLAINTEXT_MEDIA_FORBIDDEN'
  | 'INVALID_MXC_URI'
  | 'INVALID_ENCRYPTED_FILE'
  | 'UNENCRYPTED_ROOM'
  | 'UNVERIFIED_RECIPIENTS'
  | 'DECRYPTION_FAILED'
  | 'AUTH_REQUIRED'
  | 'CRYPTO_UNAVAILABLE'
  | 'ROOM_MEMBERSHIP_VIOLATION'
  | 'UPLOAD_FAILED'

/**
 * Typed fail-closed security exception thrown whenever any client-side E2EE
 * media invariant is violated or authentication/cryptography is missing.
 */
export class MediaSecurityError extends Error {
  readonly code: MediaSecurityErrorCode

  constructor(code: MediaSecurityErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'MediaSecurityError'
    this.code = code
  }
}

export type SupportedEncryptedMsgType =
  | MsgType.Image
  | MsgType.Video
  | MsgType.Audio
  | MsgType.File

export type EncryptedMediaEventContent = ImageContent | VideoContent | AudioContent | FileContent

export interface ParsedMxcUri {
  serverName: string
  mediaId: string
}

export interface RoomMediaSecurityReport {
  roomId: string
  encrypted: true
  memberCount: number
  verifiedPeers: string[]
  unverifiedPeers: string[]
  identityViolationPeers: string[]
  totalPeerDevices: number
  verifiedPeerDevices: number
}

export interface VerifyRoomMediaSecurityOptions {
  /** Reject sending if any peer has not been verified via cross-signing/SAS (default: true). */
  requireVerifiedRecipients?: boolean
  /** Enforce Sanctuary 1-on-1 room bound (<= 2 joined/invited members, default: true). */
  enforceMaxTwoMembers?: boolean
}

export interface UploadEncryptedMediaInput {
  roomId: string
  file: Blob
  filename: string
  mimeType: string
  caption?: string
  durationMs?: number
  width?: number
  height?: number
  generateThumbnail?: boolean
  requireVerifiedRecipients?: boolean
  enforceMaxTwoMembers?: boolean
  onProgress?: (progress: UploadProgress) => void
  onStageChange?: (stage: 'verifying' | 'encrypting' | 'uploading' | 'sending') => void
}

export interface UploadEncryptedMediaResult {
  eventId: string
  msgtype: SupportedEncryptedMsgType
  content: EncryptedMediaEventContent
  file: EncryptedFile
  thumbnailFile?: EncryptedFile
  mxcUrl: string
  mediaId: string
}

export interface DecryptedMediaPayload {
  blob: Blob
  byteLength: number
  mimeType: string
}

export interface ValidatedEncryptedMediaDescriptor {
  msgtype: SupportedEncryptedMsgType
  body: string
  filename: string
  mimeType: string
  size?: number
  width?: number
  height?: number
  durationMs?: number
  file: EncryptedFile
  thumbnailFile?: EncryptedFile
  thumbnailMimeType?: string
}

const MXC_PATTERN = /^mxc:\/\/([a-zA-Z0-9._:-]+)\/([a-zA-Z0-9._~-]+)$/

/**
 * Parses and validates an `mxc://<serverName>/<mediaId>` Matrix content URI.
 * Rejects HTTP/HTTPS/data/blob URLs and path-traversal segments.
 */
export function parseMxcUri(uri: string): ParsedMxcUri {
  if (typeof uri !== 'string') {
    throw new MediaSecurityError('INVALID_MXC_URI', 'Expected string mxc:// URI')
  }
  const match = MXC_PATTERN.exec(uri.trim())
  if (!match) {
    throw new MediaSecurityError(
      'INVALID_MXC_URI',
      `Invalid Matrix media URI: ${uri.slice(0, 64)}`
    )
  }
  const [, serverName, mediaId] = match
  if (
    serverName.includes('..') ||
    mediaId.includes('..') ||
    serverName.startsWith('.') ||
    mediaId.startsWith('.')
  ) {
    throw new MediaSecurityError('INVALID_MXC_URI', 'Unsafe path segment in mxc:// URI')
  }
  return { serverName, mediaId }
}

/**
 * Builds a Matrix Spec MSC3916 authenticated media download URL.
 * Never returns legacy unauthenticated `/_matrix/media/v3/download` URLs.
 */
export function toAuthenticatedDownloadUrl(homeserverUrl: string, mxcUrl: string): string {
  const { serverName, mediaId } = parseMxcUri(mxcUrl)
  const cleanBase = homeserverUrl.replace(/\/+$/, '')
  return `${cleanBase}/_matrix/client/v1/media/download/${encodeURIComponent(serverName)}/${encodeURIComponent(mediaId)}`
}

/**
 * Strictly validates a Matrix Spec `EncryptedFile` (`v2`, AES-256-CTR + SHA-256).
 * Fails closed on weak algorithms, missing JWK fields, missing IV, or missing SHA-256 digest.
 */
export function assertValidEncryptedFile(file: unknown): EncryptedFile {
  if (!file || typeof file !== 'object') {
    throw new MediaSecurityError('INVALID_ENCRYPTED_FILE', 'EncryptedFile metadata is missing')
  }
  const candidate = file as Record<string, unknown>

  if (typeof candidate.url !== 'string') {
    throw new MediaSecurityError('INVALID_ENCRYPTED_FILE', 'EncryptedFile.url is missing')
  }
  parseMxcUri(candidate.url)

  if (candidate.v !== 'v2') {
    throw new MediaSecurityError(
      'INVALID_ENCRYPTED_FILE',
      `Unsupported EncryptedFile version: ${String(candidate.v)}`
    )
  }

  const key = candidate.key as Record<string, unknown> | undefined
  if (
    !key ||
    typeof key !== 'object' ||
    key.kty !== 'oct' ||
    key.alg !== 'A256CTR' ||
    key.ext !== true ||
    typeof key.k !== 'string' ||
    key.k.length < 32 ||
    !Array.isArray(key.key_ops) ||
    !key.key_ops.includes('decrypt')
  ) {
    throw new MediaSecurityError(
      'INVALID_ENCRYPTED_FILE',
      'EncryptedFile.key must be an extractable A256CTR oct JWK supporting decrypt'
    )
  }

  if (typeof candidate.iv !== 'string' || candidate.iv.length < 16) {
    throw new MediaSecurityError('INVALID_ENCRYPTED_FILE', 'EncryptedFile.iv is missing or short')
  }

  const hashes = candidate.hashes as Record<string, unknown> | undefined
  if (!hashes || typeof hashes !== 'object' || typeof hashes.sha256 !== 'string' || hashes.sha256.length < 32) {
    throw new MediaSecurityError(
      'INVALID_ENCRYPTED_FILE',
      'EncryptedFile.hashes.sha256 integrity digest is required'
    )
  }

  return candidate as unknown as EncryptedFile
}

/**
 * Ensures a media event payload contains encrypted `file` metadata and ZERO
 * plaintext fallback URLs (`content.url` or `content.info.thumbnail_url`).
 */
export function assertNoPlaintextMediaFallback(content: Record<string, unknown>): void {
  if ('url' in content && content.url !== undefined && content.url !== null) {
    throw new MediaSecurityError(
      'PLAINTEXT_MEDIA_FORBIDDEN',
      'Plaintext content.url is forbidden for private Sanctuary media'
    )
  }

  if (!content.file) {
    throw new MediaSecurityError(
      'PLAINTEXT_MEDIA_FORBIDDEN',
      'Encrypted media event must include content.file EncryptedFile descriptor'
    )
  }
  assertValidEncryptedFile(content.file)

  const info = content.info as Record<string, unknown> | undefined
  if (info && typeof info === 'object') {
    if ('thumbnail_url' in info && info.thumbnail_url !== undefined && info.thumbnail_url !== null) {
      throw new MediaSecurityError(
        'PLAINTEXT_MEDIA_FORBIDDEN',
        'Plaintext info.thumbnail_url is forbidden for private Sanctuary media'
      )
    }
    if (info.thumbnail_file !== undefined) {
      assertValidEncryptedFile(info.thumbnail_file)
    } else if (info.thumbnail_info !== undefined) {
      throw new MediaSecurityError(
        'PLAINTEXT_MEDIA_FORBIDDEN',
        'thumbnail_info present without encrypted thumbnail_file'
      )
    }
  }
}

/**
 * Maps a MIME type to the standard Matrix media `msgtype`.
 */
export function inferMatrixMediaMsgType(mimeType: string): SupportedEncryptedMsgType {
  const normalized = (mimeType || '').toLowerCase()
  if (normalized.startsWith('image/')) return MsgType.Image
  if (normalized.startsWith('video/')) return MsgType.Video
  if (normalized.startsWith('audio/')) return MsgType.Audio
  return MsgType.File
}

/**
 * Encrypts plaintext media bytes client-side using Matrix's AES-256-CTR + SHA-256 scheme.
 */
export async function encryptMediaBuffer(
  plaintextBuffer: ArrayBuffer
): Promise<{ ciphertext: ArrayBuffer; info: IEncryptedFile }> {
  const { data, info } = await encryptAttachment(plaintextBuffer)
  if (info.v !== 'v2' || !info.hashes?.sha256) {
    throw new MediaSecurityError(
      'INVALID_ENCRYPTED_FILE',
      'matrix-encrypt-attachment did not produce valid v2 SHA-256 output'
    )
  }
  return { ciphertext: data, info }
}

/**
 * Verifies ciphertext SHA-256 digest and decrypts AES-256-CTR payload in memory.
 * Throws MediaSecurityError on any bit flip, key mismatch, or missing metadata.
 */
export async function decryptMediaBuffer(
  ciphertextBuffer: ArrayBuffer,
  encryptedFile: EncryptedFile
): Promise<ArrayBuffer> {
  const validated = assertValidEncryptedFile(encryptedFile)
  try {
    return await decryptAttachment(ciphertextBuffer, validated)
  } catch (err) {
    throw new MediaSecurityError(
      'DECRYPTION_FAILED',
      'Ciphertext integrity check or AES-256-CTR decryption failed',
      { cause: err }
    )
  }
}

/**
 * Verifies E2EE preconditions for a Matrix room prior to uploading or sending media:
 * - Rust crypto backend initialized
 * - Room has encryption enabled (`m.room.encryption`)
 * - 1-on-1 member cap respected (`<= 2` joined/invited users when enabled)
 * - No identity key reset warnings on any recipient
 * - All peer recipients verified via cross-signing (when `requireVerifiedRecipients` is true)
 */
export async function verifyRoomMediaSecurity(
  client: MatrixClient,
  roomId: string,
  options: VerifyRoomMediaSecurityOptions = {}
): Promise<RoomMediaSecurityReport> {
  const requireVerifiedRecipients = options.requireVerifiedRecipients ?? true
  const enforceMaxTwoMembers = options.enforceMaxTwoMembers ?? true

  const crypto = client.getCrypto()
  if (!crypto) {
    throw new MediaSecurityError(
      'CRYPTO_UNAVAILABLE',
      'Matrix Rust E2EE engine is not initialized on this client'
    )
  }

  const roomEncrypted = await crypto.isEncryptionEnabledInRoom(roomId)
  if (!roomEncrypted) {
    throw new MediaSecurityError(
      'UNENCRYPTED_ROOM',
      `Room ${roomId} does not have encryption enabled; plaintext rooms cannot receive private media`
    )
  }

  const room = client.getRoom(roomId)
  if (!room) {
    throw new MediaSecurityError('ROOM_MEMBERSHIP_VIOLATION', `Room ${roomId} is not loaded`)
  }

  const joinedMembers = room.getMembersWithMembership('join')
  const invitedMembers = room.getMembersWithMembership('invite')
  const activeUserIds = Array.from(
    new Set([...joinedMembers, ...invitedMembers].map((m) => m.userId))
  )

  if (enforceMaxTwoMembers && activeUserIds.length > 2) {
    throw new MediaSecurityError(
      'ROOM_MEMBERSHIP_VIOLATION',
      `Sanctuary rooms are restricted to at most 2 participants (found ${activeUserIds.length})`
    )
  }

  const ownUserId = client.getUserId()
  const peerUserIds = activeUserIds.filter((uid) => uid !== ownUserId)

  const verifiedPeers: string[] = []
  const unverifiedPeers: string[] = []
  const identityViolationPeers: string[] = []
  let totalPeerDevices = 0
  let verifiedPeerDevices = 0

  if (peerUserIds.length > 0) {
    const deviceMap = await crypto.getUserDeviceInfo(peerUserIds, true)

    for (const peerId of peerUserIds) {
      const trust = await crypto.getUserVerificationStatus(peerId)
      if (trust.needsUserApproval) {
        identityViolationPeers.push(peerId)
      }
      if (trust.isVerified()) {
        verifiedPeers.push(peerId)
      } else {
        unverifiedPeers.push(peerId)
      }

      const peerDevices = deviceMap.get(peerId)
      if (peerDevices) {
        for (const [deviceId] of peerDevices) {
          totalPeerDevices += 1
          const devStatus = await crypto.getDeviceVerificationStatus(peerId, deviceId)
          if (devStatus?.isVerified()) {
            verifiedPeerDevices += 1
          }
        }
      }
    }
  }

  if (identityViolationPeers.length > 0) {
    throw new MediaSecurityError(
      'UNVERIFIED_RECIPIENTS',
      `Security alert: cryptographic identity changed for ${identityViolationPeers.join(', ')}. Re-verify partner devices before sending media.`
    )
  }

  if (requireVerifiedRecipients && unverifiedPeers.length > 0) {
    throw new MediaSecurityError(
      'UNVERIFIED_RECIPIENTS',
      `Refusing to share media keys with unverified partner(s): ${unverifiedPeers.join(', ')}. Complete emoji device verification first.`
    )
  }

  return {
    roomId,
    encrypted: true,
    memberCount: activeUserIds.length,
    verifiedPeers,
    unverifiedPeers,
    identityViolationPeers,
    totalPeerDevices,
    verifiedPeerDevices,
  }
}

interface GeneratedThumbnailBytes {
  buffer: ArrayBuffer
  width: number
  height: number
  mimeType: string
}

async function canvasToBuffer(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          resolve(null)
          return
        }
        resolve(await blob.arrayBuffer())
      },
      mimeType,
      quality
    )
  })
}

async function loadImageSource(blob: Blob): Promise<{
  source: CanvasImageSource
  width: number
  height: number
  cleanup: () => void
} | null> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob)
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    }
  }

  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Image load failed'))
      el.src = url
    })
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      cleanup: () => URL.revokeObjectURL(url),
    }
  } catch {
    URL.revokeObjectURL(url)
    return null
  }
}

async function loadVideoFrameSource(blob: Blob): Promise<{
  source: CanvasImageSource
  width: number
  height: number
  cleanup: () => void
} | null> {
  const url = URL.createObjectURL(blob)
  try {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Video frame timeout')), 5000)
      video.onloadeddata = () => {
        window.clearTimeout(timeout)
        resolve()
      }
      video.onerror = () => {
        window.clearTimeout(timeout)
        reject(new Error('Video decode error'))
      }
      video.src = url
    })

    if (video.duration && video.duration > 0.2) {
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked)
          resolve()
        }
        video.addEventListener('seeked', onSeeked)
        video.currentTime = Math.min(0.25, video.duration / 4)
      })
    }

    return {
      source: video,
      width: video.videoWidth || 480,
      height: video.videoHeight || 270,
      cleanup: () => {
        video.removeAttribute('src')
        video.load()
        URL.revokeObjectURL(url)
      },
    }
  } catch {
    URL.revokeObjectURL(url)
    return null
  }
}

/**
 * Generates a downscaled, EXIF-stripped preview thumbnail purely in the browser
 * before encryption. Returns `null` outside browser DOM environments or for non-visual media.
 */
export async function generateClientThumbnailBytes(
  file: Blob,
  mimeType: string,
  maxDimension = 480
): Promise<GeneratedThumbnailBytes | null> {
  if (typeof document === 'undefined') return null
  const normalized = mimeType.toLowerCase()
  const isImage = normalized.startsWith('image/')
  const isVideo = normalized.startsWith('video/')
  if (!isImage && !isVideo) return null

  const loaded = isImage
    ? await loadImageSource(file)
    : await loadVideoFrameSource(file)
  if (!loaded) return null

  try {
    const srcW = Math.max(1, loaded.width)
    const srcH = Math.max(1, loaded.height)
    const scale = Math.min(1, maxDimension / Math.max(srcW, srcH))
    const targetW = Math.max(1, Math.round(srcW * scale))
    const targetH = Math.max(1, Math.round(srcH * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(loaded.source, 0, 0, targetW, targetH)

    const preferredType = 'image/webp'
    let buffer = await canvasToBuffer(canvas, preferredType, 0.78)
    let outMime = preferredType
    if (!buffer || buffer.byteLength === 0) {
      outMime = 'image/jpeg'
      buffer = await canvasToBuffer(canvas, outMime, 0.8)
    }
    if (!buffer || buffer.byteLength === 0) return null

    return {
      buffer,
      width: targetW,
      height: targetH,
      mimeType: outMime,
    }
  } finally {
    loaded.cleanup()
  }
}

/**
 * Uploads an already-encrypted ciphertext buffer as an anonymous binary blob
 * (`application/octet-stream`, `includeFilename: false`) so Synapse stores zero
 * plaintext filenames or MIME hints on disk or object storage.
 */
export async function uploadEncryptedBlob(
  client: MatrixClient,
  ciphertext: ArrayBuffer,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ content_uri: string } & ParsedMxcUri> {
  const opaqueBlob = new Blob([ciphertext], { type: 'application/octet-stream' })
  let response: { content_uri: string }
  try {
    response = await client.uploadContent(opaqueBlob, {
      type: 'application/octet-stream',
      includeFilename: false,
      progressHandler: onProgress,
    })
  } catch (err) {
    throw new MediaSecurityError('UPLOAD_FAILED', 'Encrypted media upload to Synapse failed', {
      cause: err,
    })
  }

  const parsed = parseMxcUri(response.content_uri)
  return {
    content_uri: response.content_uri,
    ...parsed,
  }
}

/**
 * Complete strict client-side E2EE upload & send workflow:
 * 1. Fail-closed verification of room encryption, participant cap & recipient cross-signing trust.
 * 2. Optional EXIF-stripped client thumbnail generation + separate AES-256-CTR encryption & anonymous upload.
 * 3. AES-256-CTR + SHA-256 encryption of main attachment bytes in memory.
 * 4. Anonymous `application/octet-stream` upload (`includeFilename: false`).
 * 5. Megolm-encrypted `m.room.message` containing ONLY `file` (no plaintext `url` or `thumbnail_url`).
 */
export async function uploadAndSendEncryptedMedia(
  client: MatrixClient,
  input: UploadEncryptedMediaInput
): Promise<UploadEncryptedMediaResult> {
  input.onStageChange?.('verifying')
  await verifyRoomMediaSecurity(client, input.roomId, {
    requireVerifiedRecipients: input.requireVerifiedRecipients ?? true,
    enforceMaxTwoMembers: input.enforceMaxTwoMembers ?? true,
  })

  input.onStageChange?.('encrypting')
  const plaintextBuffer = await input.file.arrayBuffer()
  const encryptedMain = await encryptMediaBuffer(plaintextBuffer)

  let encryptedThumb:
    | {
        ciphertext: ArrayBuffer
        info: IEncryptedFile
        width: number
        height: number
        mimeType: string
        size: number
      }
    | undefined

  if (input.generateThumbnail !== false) {
    const thumbRaw = await generateClientThumbnailBytes(input.file, input.mimeType)
    if (thumbRaw) {
      const thumbEnc = await encryptMediaBuffer(thumbRaw.buffer)
      encryptedThumb = {
        ciphertext: thumbEnc.ciphertext,
        info: thumbEnc.info,
        width: thumbRaw.width,
        height: thumbRaw.height,
        mimeType: thumbRaw.mimeType,
        size: thumbRaw.buffer.byteLength,
      }
    }
  }

  input.onStageChange?.('uploading')
  let thumbnailFile: EncryptedFile | undefined
  if (encryptedThumb) {
    const thumbUpload = await uploadEncryptedBlob(client, encryptedThumb.ciphertext)
    thumbnailFile = assertValidEncryptedFile({
      ...encryptedThumb.info,
      url: thumbUpload.content_uri,
    })
  }

  const mainUpload = await uploadEncryptedBlob(client, encryptedMain.ciphertext, input.onProgress)
  const encryptedFile = assertValidEncryptedFile({
    ...encryptedMain.info,
    url: mainUpload.content_uri,
  })

  const msgtype = inferMatrixMediaMsgType(input.mimeType)
  const sanitizedName = input.filename?.trim() || 'attachment'

  const baseInfo: Record<string, unknown> = {
    mimetype: input.mimeType || 'application/octet-stream',
    size: plaintextBuffer.byteLength,
  }
  if (typeof input.width === 'number' && input.width > 0) baseInfo.w = input.width
  if (typeof input.height === 'number' && input.height > 0) baseInfo.h = input.height
  if (typeof input.durationMs === 'number' && input.durationMs >= 0) {
    baseInfo.duration = Math.round(input.durationMs)
  }
  if (thumbnailFile && encryptedThumb) {
    baseInfo.thumbnail_file = thumbnailFile
    baseInfo.thumbnail_info = {
      mimetype: encryptedThumb.mimeType,
      w: encryptedThumb.width,
      h: encryptedThumb.height,
      size: encryptedThumb.size,
    }
  }

  const content = {
    msgtype,
    body: input.caption?.trim() || sanitizedName,
    filename: sanitizedName,
    info: baseInfo,
    file: encryptedFile,
  } as unknown as EncryptedMediaEventContent

  assertNoPlaintextMediaFallback(content as unknown as Record<string, unknown>)

  input.onStageChange?.('sending')
  const sendResponse = await client.sendMessage(input.roomId, content)

  return {
    eventId: sendResponse.event_id,
    msgtype,
    content,
    file: encryptedFile,
    thumbnailFile,
    mxcUrl: mainUpload.content_uri,
    mediaId: mainUpload.mediaId,
  }
}

/**
 * Downloads encrypted ciphertext using authenticated MSC3916 media retrieval
 * and decrypts + SHA-256-verifies exclusively in memory on the recipient device.
 */
export async function fetchAndDecryptMedia(
  client: MatrixClient,
  encryptedFile: EncryptedFile,
  expectedMimeType = 'application/octet-stream'
): Promise<DecryptedMediaPayload> {
  const validatedFile = assertValidEncryptedFile(encryptedFile)
  const accessToken = client.getAccessToken()
  if (!accessToken) {
    throw new MediaSecurityError(
      'AUTH_REQUIRED',
      'Authenticated Matrix access token is required for MSC3916 media download'
    )
  }

  const downloadUrl = toAuthenticatedDownloadUrl(client.baseUrl, validatedFile.url)
  const response = await fetch(downloadUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new MediaSecurityError(
      response.status === 401 || response.status === 403 ? 'AUTH_REQUIRED' : 'DECRYPTION_FAILED',
      `Authenticated media download failed with HTTP ${response.status}`
    )
  }

  const ciphertextBuffer = await response.arrayBuffer()
  const plaintextBuffer = await decryptMediaBuffer(ciphertextBuffer, validatedFile)

  return {
    blob: new Blob([plaintextBuffer], { type: expectedMimeType }),
    byteLength: plaintextBuffer.byteLength,
    mimeType: expectedMimeType,
  }
}

/**
 * Extracts and strictly validates an encrypted media payload from a decrypted `MatrixEvent`.
 * Fails closed if the event was unencrypted in transit or contains plaintext URLs.
 */
export function extractValidatedEncryptedMediaContent(
  event: MatrixEvent
): ValidatedEncryptedMediaDescriptor | null {
  if (!event.isEncrypted()) {
    return null
  }
  if (event.getType() !== EventType.RoomMessage) {
    return null
  }
  const content = event.getContent() as Record<string, unknown>
  const msgtype = content.msgtype
  if (
    msgtype !== MsgType.Image &&
    msgtype !== MsgType.Video &&
    msgtype !== MsgType.Audio &&
    msgtype !== MsgType.File
  ) {
    return null
  }

  assertNoPlaintextMediaFallback(content)
  const file = assertValidEncryptedFile(content.file)
  const info = (content.info as Record<string, unknown> | undefined) || {}
  const thumbnailFile = info.thumbnail_file
    ? assertValidEncryptedFile(info.thumbnail_file)
    : undefined
  const thumbInfo = (info.thumbnail_info as Record<string, unknown> | undefined) || {}

  return {
    msgtype,
    body: typeof content.body === 'string' ? content.body : 'Encrypted media',
    filename:
      typeof content.filename === 'string'
        ? content.filename
        : typeof content.body === 'string'
          ? content.body
          : 'attachment',
    mimeType: typeof info.mimetype === 'string' ? info.mimetype : 'application/octet-stream',
    size: typeof info.size === 'number' ? info.size : undefined,
    width: typeof info.w === 'number' ? info.w : undefined,
    height: typeof info.h === 'number' ? info.h : undefined,
    durationMs: typeof info.duration === 'number' ? info.duration : undefined,
    file,
    thumbnailFile,
    thumbnailMimeType: typeof thumbInfo.mimetype === 'string' ? thumbInfo.mimetype : undefined,
  }
}

/**
 * Redacts a Matrix message event so clients drop references and decryption keys,
 * while room/server retention jobs reclaim unreferenced encrypted blobs.
 */
export async function redactEncryptedMediaEvent(
  client: MatrixClient,
  roomId: string,
  eventId: string,
  reason = 'Deleted by Sanctuary participant'
): Promise<string> {
  const res = await client.redactEvent(roomId, eventId, undefined, { reason })
  return res.event_id
}
