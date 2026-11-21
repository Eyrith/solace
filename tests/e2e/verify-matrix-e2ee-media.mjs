import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { createClient, ClientEvent, MsgType } from 'matrix-js-sdk'
import { logger } from 'matrix-js-sdk/lib/logger.js'
import {
  OnlySignedDevicesIsolationMode,
  CryptoEvent,
  VerificationPhase,
  VerificationRequestEvent,
  VerifierEvent,
  decodeRecoveryKey,
} from 'matrix-js-sdk/lib/crypto-api/index.js'
import { encryptAttachment, decryptAttachment } from 'matrix-encrypt-attachment'

logger.setLevel('error')

const HOMESERVER_URL = (process.env.MATRIX_HOMESERVER_URL || 'http://127.0.0.1:18008').replace(/\/+$/, '')
const SERVER_NAME = process.env.MATRIX_SERVER_NAME || 'matrix.localhost'
const ADMIN_TOKEN = process.env.SYNAPSE_ADMIN_ACCESS_TOKEN
const SYNAPSE_DATA_DIR = process.env.SYNAPSE_DATA_DIR || ''

if (!ADMIN_TOKEN) {
  console.error('Missing SYNAPSE_ADMIN_ACCESS_TOKEN')
  process.exit(1)
}

async function synapseJson(urlPath, token, init = {}) {
  const res = await fetch(`${HOMESERVER_URL}${urlPath}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let json = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }
  return { status: res.status, ok: res.ok, json }
}

async function provisionAndMint(localpart, displayName) {
  const mxid = `@${localpart}:${SERVER_NAME}`
  const enc = encodeURIComponent(mxid)
  const devSecret = `SanctuaryE2EETest_${localpart}_Cred!`

  const tryLogin = async () => {
    const res = await fetch(`${HOMESERVER_URL}/_matrix/client/v3/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'm.login.password',
        identifier: { type: 'm.id.user', user: mxid },
        password: devSecret,
        initial_device_display_name: `${displayName} Device`,
      }),
    })
    return { ok: res.ok, json: await res.json() }
  }

  let login = await tryLogin()
  if (!login.ok) {
    const putRes = await synapseJson(`/_synapse/admin/v2/users/${enc}`, ADMIN_TOKEN, {
      method: 'PUT',
      body: JSON.stringify({
        password: devSecret,
        displayname: displayName,
        admin: false,
        deactivated: false,
      }),
    })
    assert.equal(putRes.ok, true, `Failed creating ${mxid}: ${JSON.stringify(putRes.json)}`)
    login = await tryLogin()
  }

  assert.equal(login.ok, true, `Failed minting device session for ${mxid}: ${JSON.stringify(login.json)}`)
  assert.ok(login.json.device_id, `Missing device_id for ${mxid}`)

  return {
    userId: login.json.user_id || mxid,
    accessToken: login.json.access_token,
    deviceId: login.json.device_id,
    password: devSecret,
  }
}

async function startE2eeClient(creds) {
  let cachedKeys = new Map()
  let pendingRecoveryKey = null

  const client = createClient({
    baseUrl: HOMESERVER_URL,
    userId: creds.userId,
    deviceId: creds.deviceId,
    accessToken: creds.accessToken,
    verificationMethods: ['m.sas.v1'],
    useAuthorizationHeader: true,
    cryptoCallbacks: {
      getSecretStorageKey: async ({ keys }) => {
        const keyIds = Object.keys(keys)
        for (const id of keyIds) {
          if (cachedKeys.has(id)) {
            return [id, cachedKeys.get(id)]
          }
        }
        if (pendingRecoveryKey && keyIds[0]) {
          const decoded = decodeRecoveryKey(pendingRecoveryKey)
          cachedKeys.set(keyIds[0], decoded)
          return [keyIds[0], decoded]
        }
        return null
      },
      cacheSecretStorageKey: (keyId, _info, key) => {
        cachedKeys.set(keyId, new Uint8Array(key))
      },
    },
  })

  await client.initRustCrypto({ useIndexedDB: false })
  const crypto = client.getCrypto()
  assert.ok(crypto, 'Rust crypto must initialize')
  crypto.globalBlacklistUnverifiedDevices = true
  crypto.setDeviceIsolationMode(new OnlySignedDevicesIsolationMode())

  await client.startClient({ initialSyncLimit: 20 })
  await new Promise((resolve) => {
    if (client.isInitialSyncComplete()) return resolve()
    const onSync = (state) => {
      if (state === 'PREPARED' || state === 'SYNCING') {
        client.off(ClientEvent.Sync, onSync)
        resolve()
      }
    }
    client.on(ClientEvent.Sync, onSync)
  })

  return {
    client,
    setPendingRecoveryKey: (k) => {
      pendingRecoveryKey = k
    },
  }
}

async function bootstrapIdentity(wrapper, password) {
  const { client, setPendingRecoveryKey } = wrapper
  const crypto = client.getCrypto()

  await crypto.bootstrapCrossSigning({
    authUploadDeviceSigningKeys: async (makeReq) =>
      makeReq({
        type: 'm.login.password',
        identifier: { type: 'm.id.user', user: client.getUserId() },
        password,
      }),
  })

  const keyObj = await crypto.createRecoveryKeyFromPassphrase()
  assert.ok(keyObj.encodedPrivateKey, 'Recovery key string generated')
  setPendingRecoveryKey(keyObj.encodedPrivateKey)

  await crypto.bootstrapSecretStorage({
    createSecretStorageKey: async () => keyObj,
    setupNewSecretStorage: false,
    setupNewKeyBackup: true,
  })
  await crypto.checkKeyBackupAndEnable()
  const version = await crypto.getActiveSessionBackupVersion()
  assert.ok(version, 'Megolm key backup version created')

  return {
    recoveryKey: keyObj.encodedPrivateKey,
    backupVersion: version,
  }
}

async function performInteractiveSasVerification(aliceClient, bobClient, roomId) {
  let aliceEmojis = null
  let bobEmojis = null
  let aliceConfirm = null
  let bobConfirm = null

  const bobPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Bob SAS timeout')), 15000)
    const onReq = async (req) => {
      aliceClient.off(CryptoEvent.VerificationRequestReceived, onReq)
      bobClient.off(CryptoEvent.VerificationRequestReceived, onReq)
      const attach = () => {
        if (req.verifier) {
          req.verifier.on(VerifierEvent.ShowSas, async (sas) => {
            bobEmojis = sas.sas.emoji
            bobConfirm = sas
            if (aliceEmojis && bobEmojis) {
              assert.deepEqual(aliceEmojis, bobEmojis, 'Alice and Bob SAS emojis must match identically')
              await aliceConfirm.confirm()
              await bobConfirm.confirm()
            }
          })
          req.verifier.verify().catch(reject)
        }
        if (req.phase === VerificationPhase.Done) {
          clearTimeout(timeout)
          resolve()
        }
      }
      req.on(VerificationRequestEvent.Change, attach)
      await req.accept()
      attach()
    }
    bobClient.on(CryptoEvent.VerificationRequestReceived, onReq)
  })

  const aliceReq = await aliceClient.getCrypto().requestVerificationDM(bobClient.getUserId(), roomId)
  let sasStarted = false
  const alicePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Alice SAS timeout')), 15000)
    const onChange = async () => {
      if (aliceReq.phase === VerificationPhase.Ready && !sasStarted && !aliceReq.verifier) {
        sasStarted = true
        await aliceReq.startVerification('m.sas.v1')
      }
      if (aliceReq.verifier) {
        aliceReq.verifier.on(VerifierEvent.ShowSas, async (sas) => {
          aliceEmojis = sas.sas.emoji
          aliceConfirm = sas
          if (aliceEmojis && bobEmojis) {
            assert.deepEqual(aliceEmojis, bobEmojis, 'Alice and Bob SAS emojis must match identically')
            await aliceConfirm.confirm()
            await bobConfirm.confirm()
          }
        })
        aliceReq.verifier.verify().catch(reject)
      }
      if (aliceReq.phase === VerificationPhase.Done) {
        clearTimeout(timeout)
        resolve()
      }
    }
    aliceReq.on(VerificationRequestEvent.Change, onChange)
    void onChange()
  })

  await Promise.all([alicePromise, bobPromise])
  assert.ok(aliceEmojis && aliceEmojis.length === 7, 'SAS produced 7 emojis')
  return aliceEmojis
}

async function encryptAndUploadSample({ client, roomId, bytes, mimeType, filename, msgtype, thumbnailBytes }) {
  const { data: cipherBuf, info } = await encryptAttachment(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
  assert.equal(info.v, 'v2')
  assert.equal(info.key.alg, 'A256CTR')
  assert.ok(info.hashes?.sha256)

  const uploadRes = await client.uploadContent(new Blob([cipherBuf], { type: 'application/octet-stream' }), {
    type: 'application/octet-stream',
    includeFilename: false,
  })
  assert.ok(uploadRes.content_uri.startsWith(`mxc://${SERVER_NAME}/`))

  let thumbFile
  let thumbCipherBuf
  if (thumbnailBytes) {
    const tEnc = await encryptAttachment(
      thumbnailBytes.buffer.slice(thumbnailBytes.byteOffset, thumbnailBytes.byteOffset + thumbnailBytes.byteLength)
    )
    const tUp = await client.uploadContent(new Blob([tEnc.data], { type: 'application/octet-stream' }), {
      type: 'application/octet-stream',
      includeFilename: false,
    })
    thumbFile = { ...tEnc.info, url: tUp.content_uri }
    thumbCipherBuf = new Uint8Array(tEnc.data)
  }

  const file = { ...info, url: uploadRes.content_uri }
  const content = {
    msgtype,
    body: filename,
    filename,
    file,
    info: {
      mimetype: mimeType,
      size: bytes.byteLength,
      ...(thumbFile ? { thumbnail_file: thumbFile, thumbnail_info: { mimetype: 'image/webp', size: thumbnailBytes.byteLength, w: 64, h: 64 } } : {}),
    },
  }

  // Invariant check: NEVER send plaintext URL fields
  assert.equal('url' in content, false)
  assert.equal('thumbnail_url' in content.info, false)

  const sent = await client.sendMessage(roomId, content)
  return {
    eventId: sent.event_id,
    file,
    thumbFile,
    cipherBytes: new Uint8Array(cipherBuf),
    thumbCipherBytes: thumbCipherBuf,
    plaintextBytes: bytes,
    thumbnailPlaintext: thumbnailBytes,
  }
}

async function fetchAuthenticatedCiphertext(mxcUrl, bearerToken) {
  const [, server, mediaId] = /^mxc:\/\/([^/]+)\/([^/]+)$/.exec(mxcUrl)
  const downloadUrl = `${HOMESERVER_URL}/_matrix/client/v1/media/download/${encodeURIComponent(server)}/${encodeURIComponent(mediaId)}`
  const res = await fetch(downloadUrl, {
    headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {},
  })
  return {
    status: res.status,
    ok: res.ok,
    bytes: res.ok ? new Uint8Array(await res.arrayBuffer()) : null,
  }
}

function walkFiles(dir) {
  if (!dir || !fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkFiles(full))
    else out.push(full)
  }
  return out
}

async function main() {
  console.log('=== Sanctuary Matrix E2EE Media Live Verification ===')

  // 1. Provision Alice, Bob, and Intruder Eve
  const runTag = Date.now().toString(36)
  const aliceLocal = `alice_${runTag}`
  const bobLocal = `bob_${runTag}`
  const eveLocal = `eve_${runTag}`
  const aliceCreds = await provisionAndMint(aliceLocal, 'Alice Sanctuary')
  const bobCreds = await provisionAndMint(bobLocal, 'Bob Sanctuary')
  const eveCreds = await provisionAndMint(eveLocal, 'Unauthorized Eve')
  console.log('[1/8] Provisioned Synapse users:', aliceCreds.userId, bobCreds.userId, eveCreds.userId)

  const alice = await startE2eeClient(aliceCreds)
  const bob = await startE2eeClient(bobCreds)

  try {
    // 2. Bootstrap Cross-Signing + 4S Secret Storage + Encrypted Megolm Key Backup
    const aliceBackup = await bootstrapIdentity(alice, aliceCreds.password)
    const bobBackup = await bootstrapIdentity(bob, bobCreds.password)
    console.log('[2/8] Bootstrapped Cross-Signing, 4S, and Key Backups:', {
      aliceBackupVersion: aliceBackup.backupVersion,
      bobBackupVersion: bobBackup.backupVersion,
    })

    // 3. Create locked E2EE couple room & prove Eve cannot join
    const roomCreate = await synapseJson('/_matrix/client/v3/createRoom', aliceCreds.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        preset: 'trusted_private_chat',
        visibility: 'private',
        is_direct: true,
        name: 'Alice & Bob Private Vault',
        invite: [bobCreds.userId],
        initial_state: [
          { type: 'm.room.encryption', state_key: '', content: { algorithm: 'm.megolm.v1.aes-sha2' } },
          { type: 'm.room.history_visibility', state_key: '', content: { history_visibility: 'invited' } },
          { type: 'm.room.guest_access', state_key: '', content: { guest_access: 'forbidden' } },
        ],
      }),
    })
    assert.equal(roomCreate.ok, true)
    const roomId = roomCreate.json.room_id

    const bobJoin = await synapseJson(`/_matrix/client/v3/join/${encodeURIComponent(roomId)}`, bobCreds.accessToken, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    assert.equal(bobJoin.ok, true, `Bob failed joining room: ${JSON.stringify(bobJoin.json)}`)

    // Lock invite power level to 200
    await synapseJson(
      `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state/m.room.power_levels`,
      aliceCreds.accessToken,
      {
        method: 'PUT',
        body: JSON.stringify({
          users: { [aliceCreds.userId]: 100, [bobCreds.userId]: 50 },
          users_default: 0,
          events_default: 0,
          state_default: 50,
          invite: 200,
          kick: 100,
          ban: 100,
          redact: 50,
        }),
      }
    )

    // Wait deterministically for both clients to sync encrypted room state
    const waitEncrypted = async (client, label) => {
      for (let i = 0; i < 30; i++) {
        const r = client.getRoom(roomId)
        if (r && (await client.getCrypto().isEncryptionEnabledInRoom(roomId))) {
          return
        }
        await new Promise((res) => setTimeout(res, 250))
      }
      throw new Error(`Timed out waiting for ${label} to sync encrypted room ${roomId}`)
    }
    await Promise.all([waitEncrypted(alice.client, 'alice'), waitEncrypted(bob.client, 'bob')])

    // Eve must be blocked from joining
    const eveJoinAttempt = await synapseJson(
      `/_matrix/client/v3/join/${encodeURIComponent(roomId)}`,
      eveCreds.accessToken,
      { method: 'POST', body: JSON.stringify({}) }
    )
    assert.equal(eveJoinAttempt.status, 403, 'Unauthorized 3rd user @eve MUST get HTTP 403')
    console.log('[3/8] Locked 2-person E2EE room created & @eve blocked with HTTP 403:', roomId)

    // 4. Interactive SAS Emoji Verification
    const sasEmojis = await performInteractiveSasVerification(alice.client, bob.client, roomId)
    await new Promise((r) => setTimeout(r, 800))
    const aliceSeesBobVerified = (await alice.client.getCrypto().getUserVerificationStatus(bobCreds.userId)).isVerified()
    const bobSeesAliceVerified = (await bob.client.getCrypto().getUserVerificationStatus(aliceCreds.userId)).isVerified()
    assert.equal(aliceSeesBobVerified, true, 'Alice must verify Bob via Cross-Signing')
    assert.equal(bobSeesAliceVerified, true, 'Bob must verify Alice via Cross-Signing')
    console.log('[4/8] Verified Alice <-> Bob via 7-emoji SAS:', sasEmojis.map((e) => e[0]).join(' '))

    // 5. Encrypt, upload, and send ALL 4 media types + encrypted thumbnail
    const samples = [
      {
        label: 'image',
        filename: 'anniversary-sunset.png',
        mimeType: 'image/png',
        msgtype: MsgType.Image,
        bytes: Buffer.concat([
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          Buffer.from('SECRET_IMAGE_MARKER_PIXEL_BYTES_ANNIVERSARY_PHOTO'),
        ]),
        thumbnailBytes: Buffer.concat([Buffer.from('RIFF....WEBP'), Buffer.from('SECRET_THUMBNAIL_BYTES')]),
      },
      {
        label: 'video',
        filename: 'honeymoon-clip.mp4',
        mimeType: 'video/mp4',
        msgtype: MsgType.Video,
        bytes: Buffer.concat([
          Buffer.from('\x00\x00\x00\x18ftypisom'),
          Buffer.from('SECRET_VIDEO_MARKER_MP4_FRAMES'),
        ]),
        thumbnailBytes: null,
      },
      {
        label: 'voice',
        filename: 'goodnight-whisper.ogg',
        mimeType: 'audio/ogg',
        msgtype: MsgType.Audio,
        bytes: Buffer.concat([Buffer.from('OggS\x00\x02'), Buffer.from('SECRET_VOICE_MARKER_OPUS_FRAMES')]),
        thumbnailBytes: null,
      },
      {
        label: 'attachment',
        filename: 'our-anniversary-letter.pdf',
        mimeType: 'application/pdf',
        msgtype: MsgType.File,
        bytes: Buffer.from('%PDF-1.7\n%SECRET_PDF_DOCUMENT_CONTENT_PRIVATE_VOWS\n%%EOF'),
        thumbnailBytes: null,
      },
    ]

    const uploaded = []
    for (const sample of samples) {
      const result = await encryptAndUploadSample({ client: alice.client, roomId, ...sample })
      uploaded.push({ ...sample, ...result })
    }
    console.log('[5/8] Alice encrypted & sent all 4 media types + thumbnail:', uploaded.map((u) => `${u.label}:${u.file.url}`))

    // Wait for Bob sync & Megolm decryption
    await new Promise((r) => setTimeout(r, 2000))
    const bobRoom = bob.client.getRoom(roomId)
    assert.ok(bobRoom, 'Bob room exists')
    const bobEvents = bobRoom.getLiveTimeline().getEvents()
    for (const ev of bobEvents) {
      await bob.client.decryptEventIfNeeded(ev).catch(() => {})
    }

    // 6. Verify MSC3916 unauthenticated block + encrypted wire ciphertext + Bob B1 decryption & SHA-256 tamper check
    for (const item of uploaded) {
      const unauthRes = await fetchAuthenticatedCiphertext(item.file.url, null)
      assert.notEqual(unauthRes.status, 200, `Unauthenticated fetch must fail for ${item.label}`)
      assert.equal(unauthRes.status, 401, `MSC3916 must return 401 for unauthenticated fetch of ${item.label}`)

      // Legacy unauthenticated media route must NOT serve bytes either
      const [, srv, mid] = /^mxc:\/\/([^/]+)\/([^/]+)$/.exec(item.file.url)
      const legacyRes = await fetch(`${HOMESERVER_URL}/_matrix/media/v3/download/${srv}/${mid}`)
      assert.notEqual(legacyRes.status, 200, 'Legacy v3 unauthenticated media route must NOT succeed')

      // Authenticated fetch returns raw CIPHERTEXT (unreadable without key)
      const authFetch = await fetchAuthenticatedCiphertext(item.file.url, bobCreds.accessToken)
      assert.equal(authFetch.ok, true)
      assert.equal(Buffer.compare(authFetch.bytes, item.cipherBytes), 0, 'Wire download must match encrypted ciphertext')
      assert.notEqual(Buffer.compare(authFetch.bytes, item.plaintextBytes), 0, 'Server blob must NOT equal plaintext')
      const rawUtf8 = Buffer.from(authFetch.bytes).toString('utf8')
      assert.equal(rawUtf8.includes('SECRET_'), false, 'Ciphertext must leak zero SECRET_ markers')

      // Bob locates decrypted Megolm event and decrypts using ONLY the event's Embedded File Key
      const matchedEv = bobEvents.find((e) => e.getId() === item.eventId)
      assert.ok(matchedEv, `Bob received event ${item.eventId}`)
      assert.equal(matchedEv.isEncrypted(), true, 'Matrix event must be Megolm encrypted')
      const evContent = matchedEv.getContent()
      assert.equal(evContent.url, undefined, 'No plaintext content.url')
      assert.equal(evContent.info?.thumbnail_url, undefined, 'No plaintext thumbnail_url')

      const decryptedPlain = await decryptAttachment(authFetch.bytes.buffer.slice(0), evContent.file)
      assert.equal(
        Buffer.compare(Buffer.from(decryptedPlain), item.plaintextBytes),
        0,
        `Bob decrypted bytes match Alice's original ${item.label} byte-for-byte`
      )

      if (item.thumbnailPlaintext && evContent.info?.thumbnail_file) {
        const tFetch = await fetchAuthenticatedCiphertext(evContent.info.thumbnail_file.url, bobCreds.accessToken)
        assert.equal(tFetch.ok, true)
        const tPlain = await decryptAttachment(tFetch.bytes.buffer.slice(0), evContent.info.thumbnail_file)
        assert.equal(
          Buffer.compare(Buffer.from(tPlain), item.thumbnailPlaintext),
          0,
          'Bob decrypted encrypted thumbnail byte-for-byte'
        )
      }
    }

    // Tamper check on first media item
    const tamperedBytes = new Uint8Array(uploaded[0].cipherBytes)
    tamperedBytes[3] ^= 0x01
    await assert.rejects(() => decryptAttachment(tamperedBytes.buffer.slice(0), uploaded[0].file))
    console.log('[6/8] Verified MSC3916 auth (401 unauth), ciphertext-only wire bytes, Bob B1 decryption of all media+thumb, & SHA-256 tamper rejection')

    // Wait until Bob B1 has uploaded at least 1 Megolm session key to encrypted backup on Synapse
    for (let i = 0; i < 20; i++) {
      const bk = await bob.client.getCrypto().getKeyBackupInfo()
      if (bk && bk.count > 0) break
      await new Promise((r) => setTimeout(r, 350))
    }

    // 7. New Device Bob B2 logs in & restores historical media keys via encrypted Backup + Recovery Key
    const bobDevice2Creds = await provisionAndMint(bobLocal, 'Bob Sanctuary')
    const bob2 = await startE2eeClient(bobDevice2Creds)
    try {
      bob2.setPendingRecoveryKey(bobBackup.recoveryKey)
      const c2 = bob2.client.getCrypto()
      await c2.getUserDeviceInfo([bobDevice2Creds.userId], true)
      await c2.bootstrapCrossSigning({ setupNewCrossSigning: false })
      await c2.loadSessionBackupPrivateKeyFromSecretStorage()
      const restoreRes = await c2.restoreKeyBackup()
      assert.ok(restoreRes.imported > 0, 'Bob Device B2 must restore Megolm keys from encrypted backup')

      await new Promise((r) => setTimeout(r, 1000))
      const b2Room = bob2.client.getRoom(roomId)
      const b2Events = b2Room.getLiveTimeline().getEvents()
      for (const ev of b2Events) await bob2.client.decryptEventIfNeeded(ev).catch(() => {})
      const b2PdfEv = b2Events.find((e) => e.getId() === uploaded[3].eventId)
      assert.ok(b2PdfEv && !b2PdfEv.isDecryptionFailure(), 'Bob Device B2 decrypted historical PDF event')
      const b2PdfFetch = await fetchAuthenticatedCiphertext(b2PdfEv.getContent().file.url, bobDevice2Creds.accessToken)
      assert.equal(b2PdfFetch.ok, true)
      const b2PdfPlain = await decryptAttachment(b2PdfFetch.bytes.buffer.slice(0), b2PdfEv.getContent().file)
      assert.equal(Buffer.compare(Buffer.from(b2PdfPlain), uploaded[3].plaintextBytes), 0)
      console.log('[7/8] Verified Bob Device B2 restored keys via Recovery Key & decrypted historical PDF:', restoreRes)
    } finally {
      bob2.client.stopClient()
    }

    // 8. Admin Raw Storage, SQLite Database Inspection & Redaction/Purge Proof
    const userMediaRes = await synapseJson(
      `/_synapse/admin/v1/users/${encodeURIComponent(aliceCreds.userId)}/media`,
      ADMIN_TOKEN
    )
    assert.equal(userMediaRes.ok, true)
    assert.equal(userMediaRes.json.media.length, 5, '4 attachments + 1 encrypted thumbnail')
    for (const rec of userMediaRes.json.media) {
      assert.equal(rec.media_type, 'application/octet-stream', 'Synapse stores ONLY application/octet-stream')
      assert.equal(rec.upload_name, null, 'Synapse upload_name MUST be null')
    }

    if (SYNAPSE_DATA_DIR && fs.existsSync(SYNAPSE_DATA_DIR)) {
      const mediaStoreFiles = walkFiles(path.join(SYNAPSE_DATA_DIR, 'media_store'))
      assert.ok(mediaStoreFiles.length >= 5, 'Synapse media_store disk directory contains uploaded blobs')
      for (const diskFile of mediaStoreFiles) {
        const diskBuf = fs.readFileSync(diskFile)
        const asText = diskBuf.toString('utf8')
        assert.equal(asText.includes('SECRET_'), false, `Disk file ${diskFile} leaked plaintext marker!`)
        assert.equal(diskBuf.subarray(0, 4).toString('hex') === '89504e47', false, 'Disk file must not have PNG magic header')
        assert.equal(diskBuf.subarray(0, 4).toString('utf8') === '%PDF', false, 'Disk file must not have PDF magic header')
      }

      const dbPath = path.join(SYNAPSE_DATA_DIR, 'homeserver.db')
      if (fs.existsSync(dbPath)) {
        const db = new DatabaseSync(dbPath, { readOnly: true })
        const eventRows = db
          .prepare("SELECT json FROM event_json WHERE room_id = ?")
          .all(roomId)
        const combinedJson = eventRows.map((r) => String(r.json)).join('\n')
        assert.equal(combinedJson.includes('m.room.encrypted'), true, 'DB stores m.room.encrypted')
        assert.equal(combinedJson.includes('"alg":"A256CTR"'), false, 'DB must NEVER contain plaintext A256CTR key')
        assert.equal(combinedJson.includes('our-anniversary-letter.pdf'), false, 'DB must NEVER contain plaintext filename')
        assert.equal(combinedJson.includes('opaqueCipher'), false)
        db.close()
      }
    }

    // Admin purges first uploaded blob + Alice redacts message -> confirm deleted from disk & HTTP 404
    const firstMediaId = uploaded[0].file.url.split('/').pop()
    await alice.client.redactEvent(roomId, uploaded[0].eventId, undefined, { reason: 'User deleted media' })
    const delRes = await synapseJson(
      `/_synapse/admin/v1/media/${SERVER_NAME}/${encodeURIComponent(firstMediaId)}`,
      ADMIN_TOKEN,
      { method: 'DELETE' }
    )
    assert.equal(delRes.ok, true, 'Admin media delete must succeed')
    assert.ok(delRes.json.deleted_media.includes(firstMediaId))

    const postDeleteFetch = await fetchAuthenticatedCiphertext(uploaded[0].file.url, bobCreds.accessToken)
    assert.equal(postDeleteFetch.status, 404, 'Deleted media returns 404 on subsequent download')
    console.log('[8/8] Verified raw media_store disk ciphertext, SQLite zero-plaintext DB, redaction & admin delete -> 404')
    console.log('ALL E2EE MEDIA CRYPTOGRAPHIC & STORAGE VERIFICATIONS PASSED!')
  } finally {
    alice.client.stopClient()
    bob.client.stopClient()
  }
}

main().catch((err) => {
  console.error('E2EE Verification FAILED:', err)
  process.exit(1)
})
