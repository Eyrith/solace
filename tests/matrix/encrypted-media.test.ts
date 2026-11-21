import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import type { MatrixClient, MatrixEvent, Room } from 'matrix-js-sdk'
import { EventType, MsgType } from 'matrix-js-sdk'
import {
  assertNoPlaintextMediaFallback,
  assertValidEncryptedFile,
  decryptMediaBuffer,
  encryptMediaBuffer,
  extractValidatedEncryptedMediaContent,
  MediaSecurityError,
  parseMxcUri,
  toAuthenticatedDownloadUrl,
  uploadAndSendEncryptedMedia,
  verifyRoomMediaSecurity,
} from '@/lib/matrix/encrypted-media'

describe('Strict Client-Side E2EE Media Controls', () => {
  it('encrypts binary media with AES-256-CTR + SHA-256 without plaintext leakage and decrypts accurately', async () => {
    // Fake PNG signature + pixel payload
    const pngHeader = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const body = new TextEncoder().encode('TOP_SECRET_ANNIVERSARY_PHOTO_PIXEL_DATA')
    const plaintext = new Uint8Array(pngHeader.length + body.length)
    plaintext.set(pngHeader, 0)
    plaintext.set(body, pngHeader.length)

    const { ciphertext, info } = await encryptMediaBuffer(plaintext.buffer.slice(0))

    expect(info.v).toBe('v2')
    expect(info.key.alg).toBe('A256CTR')
    expect(info.key.kty).toBe('oct')
    expect(info.key.ext).toBe(true)
    expect(info.key.key_ops).toContain('decrypt')
    expect(info.hashes?.sha256).toBeTruthy()

    const cipherBytes = new Uint8Array(ciphertext)
    expect(cipherBytes.byteLength).toBe(plaintext.byteLength)
    // Ciphertext must not start with PNG magic bytes
    expect(Array.from(cipherBytes.slice(0, 8))).not.toEqual(Array.from(pngHeader))
    // Ciphertext must not contain plaintext ASCII substring
    expect(Buffer.from(cipherBytes).toString('utf8')).not.toContain('TOP_SECRET_ANNIVERSARY')

    // Decrypt back
    const encryptedFile = assertValidEncryptedFile({
      ...info,
      url: 'mxc://matrix.localhost/opaqueMediaId123',
    })
    const recovered = await decryptMediaBuffer(ciphertext, encryptedFile)
    expect(new Uint8Array(recovered)).toEqual(plaintext)
  })

  it('rejects any ciphertext tampering via SHA-256 integrity failure', async () => {
    const plaintext = new TextEncoder().encode('private voice message audio frames')
    const { ciphertext, info } = await encryptMediaBuffer(plaintext.buffer.slice(0))
    const encryptedFile = assertValidEncryptedFile({
      ...info,
      url: 'mxc://matrix.localhost/tamperCheckId',
    })

    const tampered = new Uint8Array(ciphertext.slice(0))
    tampered[0] ^= 0xff // Flip 1 byte in ciphertext

    await expect(decryptMediaBuffer(tampered.buffer, encryptedFile)).rejects.toMatchObject({
      name: 'MediaSecurityError',
      code: 'DECRYPTION_FAILED',
    })
  })

  it('enforces strict MSC3916 authenticated media download URLs and validates mxc:// URIs', () => {
    expect(parseMxcUri('mxc://matrix.localhost/abcDEF_123')).toEqual({
      serverName: 'matrix.localhost',
      mediaId: 'abcDEF_123',
    })

    const authUrl = toAuthenticatedDownloadUrl(
      'https://matrix.sanctuary.internal/',
      'mxc://matrix.sanctuary.internal/AbCd1234'
    )
    expect(authUrl).toBe(
      'https://matrix.sanctuary.internal/_matrix/client/v1/media/download/matrix.sanctuary.internal/AbCd1234'
    )
    expect(authUrl).not.toContain('/_matrix/media/v3/download')

    expect(() => parseMxcUri('https://example.com/photo.png')).toThrowError(MediaSecurityError)
    expect(() => parseMxcUri('mxc://matrix.localhost/../../etc/passwd')).toThrowError(
      MediaSecurityError
    )
  })

  it('rejects any plaintext URL, unencrypted thumbnail, or missing SHA-256 hash', async () => {
    const { info } = await encryptMediaBuffer(new TextEncoder().encode('hello').buffer.slice(0))
    const validFile = { ...info, url: 'mxc://matrix.localhost/validMedia' }

    // Reject plaintext top-level URL even if file also exists
    expect(() =>
      assertNoPlaintextMediaFallback({
        msgtype: MsgType.Image,
        body: 'photo.png',
        url: 'mxc://matrix.localhost/plaintextLeak',
        file: validFile,
      })
    ).toThrowError(/Plaintext content.url is forbidden/)

    // Reject plaintext thumbnail_url
    expect(() =>
      assertNoPlaintextMediaFallback({
        msgtype: MsgType.Image,
        body: 'photo.png',
        file: validFile,
        info: {
          mimetype: 'image/png',
          thumbnail_url: 'mxc://matrix.localhost/plaintextThumb',
        },
      })
    ).toThrowError(/Plaintext info.thumbnail_url is forbidden/)

    // Reject weak or missing SHA-256
    expect(() =>
      assertValidEncryptedFile({
        ...validFile,
        hashes: {},
      })
    ).toThrowError(/sha256 integrity digest is required/)

    // Reject unencrypted MatrixEvent even if structured like media
    const unencryptedEvent = {
      isEncrypted: () => false,
      getType: () => EventType.RoomMessage,
      getContent: () => ({
        msgtype: MsgType.Image,
        body: 'photo.png',
        file: validFile,
      }),
    } as unknown as MatrixEvent

    expect(extractValidatedEncryptedMediaContent(unencryptedEvent)).toBeNull()
  })

  it('blocks media uploads to unencrypted rooms, >2 member rooms, and unverified recipients', async () => {
    const mockClientBase = (opts: {
      encrypted: boolean
      members: string[]
      verified: boolean
      needsApproval?: boolean
    }): MatrixClient =>
      ({
        getUserId: () => '@u_alice:matrix.localhost',
        getCrypto: () => ({
          isEncryptionEnabledInRoom: vi.fn().mockResolvedValue(opts.encrypted),
          getUserDeviceInfo: vi.fn().mockResolvedValue(new Map()),
          getUserVerificationStatus: vi.fn().mockResolvedValue({
            known: true,
            needsUserApproval: Boolean(opts.needsApproval),
            isVerified: () => opts.verified,
          }),
          getDeviceVerificationStatus: vi.fn().mockResolvedValue(null),
        }),
        getRoom: () =>
          ({
            getMembersWithMembership: (membership: string) =>
              membership === 'join' ? opts.members.map((userId) => ({ userId })) : [],
          }) as unknown as Room,
      }) as unknown as MatrixClient

    // 1. Unencrypted room must fail closed
    await expect(
      verifyRoomMediaSecurity(
        mockClientBase({
          encrypted: false,
          members: ['@u_alice:matrix.localhost', '@u_bob:matrix.localhost'],
          verified: true,
        }),
        '!room1:matrix.localhost'
      )
    ).rejects.toMatchObject({ code: 'UNENCRYPTED_ROOM' })

    // 2. Room with >2 members must fail closed
    await expect(
      verifyRoomMediaSecurity(
        mockClientBase({
          encrypted: true,
          members: [
            '@u_alice:matrix.localhost',
            '@u_bob:matrix.localhost',
            '@eve:matrix.localhost',
          ],
          verified: true,
        }),
        '!room2:matrix.localhost'
      )
    ).rejects.toMatchObject({ code: 'ROOM_MEMBERSHIP_VIOLATION' })

    // 3. Unverified peer must fail closed
    await expect(
      verifyRoomMediaSecurity(
        mockClientBase({
          encrypted: true,
          members: ['@u_alice:matrix.localhost', '@u_bob:matrix.localhost'],
          verified: false,
        }),
        '!room3:matrix.localhost'
      )
    ).rejects.toMatchObject({ code: 'UNVERIFIED_RECIPIENTS' })

    // 4. Identity replacement alert must fail closed
    await expect(
      verifyRoomMediaSecurity(
        mockClientBase({
          encrypted: true,
          members: ['@u_alice:matrix.localhost', '@u_bob:matrix.localhost'],
          verified: true,
          needsApproval: true,
        }),
        '!room4:matrix.localhost'
      )
    ).rejects.toMatchObject({ code: 'UNVERIFIED_RECIPIENTS' })
  })

  it('uploads strictly ciphertext (application/octet-stream, includeFilename: false) before Megolm send', async () => {
    const uploadSpy = vi.fn().mockResolvedValue({
      content_uri: 'mxc://matrix.localhost/opaqueCipherBlob99',
    })
    const sendSpy = vi.fn().mockResolvedValue({ event_id: '$ev123' })

    const verifiedClient = {
      getUserId: () => '@u_alice:matrix.localhost',
      getCrypto: () => ({
        isEncryptionEnabledInRoom: vi.fn().mockResolvedValue(true),
        getUserDeviceInfo: vi.fn().mockResolvedValue(
          new Map([['@u_bob:matrix.localhost', new Map([['BOBDEV1', {}]])]])
        ),
        getUserVerificationStatus: vi.fn().mockResolvedValue({
          known: true,
          needsUserApproval: false,
          isVerified: () => true,
        }),
        getDeviceVerificationStatus: vi.fn().mockResolvedValue({
          isVerified: () => true,
        }),
      }),
      getRoom: () =>
        ({
          getMembersWithMembership: (m: string) =>
            m === 'join'
              ? [{ userId: '@u_alice:matrix.localhost' }, { userId: '@u_bob:matrix.localhost' }]
              : [],
        }) as unknown as Room,
      uploadContent: uploadSpy,
      sendMessage: sendSpy,
    } as unknown as MatrixClient

    const secretBytes = new TextEncoder().encode('SENSITIVE_VIDEO_CONTENT_MUST_NEVER_BE_PLAINTEXT')
    const blob = new Blob([secretBytes], { type: 'video/mp4' })

    const res = await uploadAndSendEncryptedMedia(verifiedClient, {
      roomId: '!couple:matrix.localhost',
      file: blob,
      filename: 'private-date-night.mp4',
      mimeType: 'video/mp4',
      durationMs: 4200,
    })

    expect(res.eventId).toBe('$ev123')
    expect(uploadSpy).toHaveBeenCalledTimes(1)

    const [uploadedBlob, uploadOpts] = uploadSpy.mock.calls[0]
    expect(uploadOpts).toMatchObject({
      type: 'application/octet-stream',
      includeFilename: false,
    })
    const uploadedBytes = new Uint8Array(await (uploadedBlob as Blob).arrayBuffer())
    expect(uploadedBytes).not.toEqual(secretBytes)
    expect(Buffer.from(uploadedBytes).toString('utf8')).not.toContain('SENSITIVE_VIDEO_CONTENT')

    const [, sentContent] = sendSpy.mock.calls[0]
    expect(sentContent.msgtype).toBe(MsgType.Video)
    expect(sentContent.url).toBeUndefined()
    expect(sentContent.file.url).toBe('mxc://matrix.localhost/opaqueCipherBlob99')
    expect(sentContent.file.v).toBe('v2')
    expect(sentContent.file.key.alg).toBe('A256CTR')
  })

  it('keeps public editorial layouts isolated from Matrix SDK and WASM crypto', () => {
    const rootDir = process.cwd()
    const rootLayout = fs.readFileSync(path.join(rootDir, 'src/app/layout.tsx'), 'utf8')
    const publicShell = fs.readFileSync(
      path.join(rootDir, 'src/components/editorial/public-shell.tsx'),
      'utf8'
    )

    expect(rootLayout).not.toContain('matrix')
    expect(rootLayout).not.toContain('MatrixProvider')
    expect(publicShell).not.toContain('matrix-js-sdk')
    expect(publicShell).not.toContain('matrix-encrypt-attachment')
  })
})

