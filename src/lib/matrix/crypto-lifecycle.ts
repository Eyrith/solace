import {
  createClient,
  type ICreateClientOpts,
  type MatrixClient,
  type UIAuthCallback,
} from 'matrix-js-sdk'
import {
  OnlySignedDevicesIsolationMode,
  CryptoEvent,
  VerificationPhase,
  VerificationRequestEvent,
  VerifierEvent,
  decodeRecoveryKey,
  deriveRecoveryKeyFromPassphrase,
  type EmojiMapping,
  type GeneratedSecretStorageKey,
  type KeyBackupInfo,
  type KeyBackupRestoreResult,
  type ShowSasCallbacks,
  type VerificationRequest,
  type Verifier,
} from 'matrix-js-sdk/lib/crypto-api'

let wasmInitPromise: Promise<void> | null = null

/**
 * Loads `@matrix-org/matrix-sdk-crypto-wasm` cleanly from `/wasm/matrix_sdk_crypto_wasm_bg.wasm`
 * in browser environments so Next.js 16 Turbopack does not fail on `import.meta.url` WASM bundling.
 * Safe no-op on SSR / Node runtimes.
 */
export async function loadCryptoWasmOnce(
  wasmUrl = '/wasm/matrix_sdk_crypto_wasm_bg.wasm'
): Promise<void> {
  if (typeof window === 'undefined') return
  if (!wasmInitPromise) {
    wasmInitPromise = import('@matrix-org/matrix-sdk-crypto-wasm').then(async (wasmModule) => {
      if (typeof wasmModule.initAsync === 'function') {
        await wasmModule.initAsync(wasmUrl)
      }
    })
  }
  return wasmInitPromise
}

/**
 * Ephemeral in-memory Secret Storage key holder scoped to the active browser session.
 * Never persists raw recovery keys in `localStorage` or cookies.
 */
export class SecretKeyMemoryVault {
  private readonly keys = new Map<string, Uint8Array<ArrayBuffer>>()
  private pendingRecoveryKey: string | null = null
  private pendingPassphrase: string | null = null

  setPendingRecoveryInput(recoveryKeyOrPassphrase: string): void {
    const trimmed = recoveryKeyOrPassphrase.trim()
    this.pendingRecoveryKey = trimmed
    this.pendingPassphrase = trimmed
  }

  cacheKey(keyId: string, keyBytes: Uint8Array): void {
    const buf = new ArrayBuffer(keyBytes.byteLength)
    const copy = new Uint8Array(buf)
    copy.set(keyBytes)
    this.keys.set(keyId, copy)
  }

  getCachedKey(keyId: string): Uint8Array<ArrayBuffer> | undefined {
    return this.keys.get(keyId)
  }

  async resolveSecretStorageKey(opts: {
    keys: Record<
      string,
      {
        algorithm?: string
        passphrase?: {
          algorithm: string
          salt: string
          iterations: number
          bits?: number
        }
      }
    >
  }): Promise<[string, Uint8Array<ArrayBuffer>] | null> {
    const keyIds = Object.keys(opts.keys)
    for (const id of keyIds) {
      const cached = this.keys.get(id)
      if (cached) {
        return [id, cached]
      }
    }

    if (this.pendingRecoveryKey) {
      try {
        const decoded = decodeRecoveryKey(this.pendingRecoveryKey)
        const targetId = keyIds[0]
        if (targetId) {
          this.cacheKey(targetId, decoded)
          return [targetId, decoded]
        }
      } catch {
        // Input may be a user passphrase rather than a base58 recovery key
      }
    }

    if (this.pendingPassphrase) {
      for (const id of keyIds) {
        const desc = opts.keys[id]
        if (desc?.passphrase?.salt && desc.passphrase.iterations) {
          const derived = await deriveRecoveryKeyFromPassphrase(
            this.pendingPassphrase,
            desc.passphrase.salt,
            desc.passphrase.iterations
          )
          const buf = new ArrayBuffer(derived.byteLength)
          const copy = new Uint8Array(buf)
          copy.set(derived)
          this.cacheKey(id, copy)
          return [id, copy]
        }
      }
    }

    return null
  }

  /** Zeroizes all in-memory key bytes on lock / signout. */
  clear(): void {
    for (const bytes of this.keys.values()) {
      bytes.fill(0)
    }
    this.keys.clear()
    this.pendingRecoveryKey = null
    this.pendingPassphrase = null
  }
}

export interface InitSanctuaryMatrixClientOpts {
  homeserverUrl: string
  userId: string
  accessToken: string
  deviceId: string
  vault?: SecretKeyMemoryVault
  cryptoDatabasePrefix?: string
  useIndexedDB?: boolean
  initialSyncLimit?: number
  wasmUrl?: string
}

export interface SanctuaryMatrixSession {
  client: MatrixClient
  vault: SecretKeyMemoryVault
}

/**
 * Initializes a strict E2EE MatrixClient powered by matrix-sdk-crypto Rust WASM:
 * - Forces `OnlySignedDevicesIsolationMode` (MSC4153 / excludes unverified/unsigned devices)
 * - Enables `globalBlacklistUnverifiedDevices = true`
 * - Enforces Bearer authentication on media downloads (MSC3916)
 */
export async function initSanctuaryMatrixClient(
  opts: InitSanctuaryMatrixClientOpts
): Promise<SanctuaryMatrixSession> {
  await loadCryptoWasmOnce(opts.wasmUrl)

  const vault = opts.vault ?? new SecretKeyMemoryVault()

  const clientOpts: ICreateClientOpts = {
    baseUrl: opts.homeserverUrl.replace(/\/+$/, ''),
    userId: opts.userId,
    deviceId: opts.deviceId,
    accessToken: opts.accessToken,
    verificationMethods: ['m.sas.v1'],
    useAuthorizationHeader: true,
    cryptoCallbacks: {
      getSecretStorageKey: async (sssOpts) => {
        return vault.resolveSecretStorageKey(
          sssOpts as Parameters<SecretKeyMemoryVault['resolveSecretStorageKey']>[0]
        )
      },
      cacheSecretStorageKey: (keyId, _keyInfo, key) => {
        vault.cacheKey(keyId, key)
      },
    },
  }

  const client = createClient(clientOpts)

  const useIdb = (opts.useIndexedDB ?? true) && typeof indexedDB !== 'undefined'
  await client.initRustCrypto({
    useIndexedDB: useIdb,
    cryptoDatabasePrefix: opts.cryptoDatabasePrefix ?? `sanctuary_crypto_${opts.userId}`,
  })

  const crypto = client.getCrypto()
  if (!crypto) {
    throw new Error('Matrix Rust Crypto failed to initialize')
  }

  crypto.globalBlacklistUnverifiedDevices = true
  crypto.setDeviceIsolationMode(new OnlySignedDevicesIsolationMode())

  await client.startClient({
    initialSyncLimit: opts.initialSyncLimit ?? 25,
  })

  return { client, vault }
}

export interface BootstrapIdentityResult {
  recoveryKey: string
  backupVersion: string | null
  backupInfo: KeyBackupInfo | null
  crossSigningReady: boolean
  secretStorageReady: boolean
}

/**
 * Bootstraps user Cross-Signing, Matrix Secret Storage (4S), and encrypted Megolm Key Backup.
 * Returns the one-time Recovery Key string so the client UI can display it to the user
 * (never transmitted to Synapse plaintext endpoints or Supabase).
 */
export async function bootstrapEncryptedIdentityAndBackup(
  client: MatrixClient,
  vault: SecretKeyMemoryVault,
  options?: {
    passphrase?: string
    forceReset?: boolean
    uiAuthCallback?: UIAuthCallback<void>
  }
): Promise<BootstrapIdentityResult> {
  const crypto = client.getCrypto()
  if (!crypto) {
    throw new Error('Matrix Rust Crypto is not initialized')
  }

  const authCallback: UIAuthCallback<void> =
    options?.uiAuthCallback ??
    (async (makeRequest) => {
      return makeRequest({ type: 'm.login.dummy' })
    })

  await crypto.bootstrapCrossSigning({
    setupNewCrossSigning: options?.forceReset ?? false,
    authUploadDeviceSigningKeys: authCallback,
  })

  const recoveryKeyObj: GeneratedSecretStorageKey = await crypto.createRecoveryKeyFromPassphrase(
    options?.passphrase
  )
  const recoveryKeyEncoded = recoveryKeyObj.encodedPrivateKey
  if (!recoveryKeyEncoded) {
    throw new Error('Failed to encode Matrix recovery key')
  }

  vault.setPendingRecoveryInput(recoveryKeyEncoded)

  await crypto.bootstrapSecretStorage({
    createSecretStorageKey: async () => recoveryKeyObj,
    setupNewSecretStorage: options?.forceReset ?? false,
    setupNewKeyBackup: true,
  })

  await crypto.checkKeyBackupAndEnable()
  const backupVersion = await crypto.getActiveSessionBackupVersion()
  const backupInfo = await crypto.getKeyBackupInfo()

  return {
    recoveryKey: recoveryKeyEncoded,
    backupVersion,
    backupInfo,
    crossSigningReady: await crypto.isCrossSigningReady(),
    secretStorageReady: await crypto.isSecretStorageReady(),
  }
}

export interface RestoreFromRecoveryResult {
  crossSigningReady: boolean
  secretStorageReady: boolean
  backupVersion: string | null
  restored: KeyBackupRestoreResult | null
}

/**
 * Unlocks Secret Storage using a user-supplied Recovery Key or passphrase, caches the
 * private key solely in memory for this session, self-signs the current device, and
 * restores encrypted Megolm room keys from backup.
 */
export async function unlockAndRestoreFromRecoveryKey(
  client: MatrixClient,
  vault: SecretKeyMemoryVault,
  recoveryKeyOrPassphrase: string
): Promise<RestoreFromRecoveryResult> {
  const crypto = client.getCrypto()
  if (!crypto) {
    throw new Error('Matrix Rust Crypto is not initialized')
  }

  vault.setPendingRecoveryInput(recoveryKeyOrPassphrase)

  const ownUserId = client.getUserId()
  if (ownUserId) {
    // Ensure own public cross-signing keys are loaded into OlmMachine before importing secrets from 4S
    await crypto.getUserDeviceInfo([ownUserId], true)
  }

  await crypto.bootstrapCrossSigning({
    setupNewCrossSigning: false,
  })

  const ownDeviceId = client.getDeviceId()
  if (ownDeviceId) {
    await crypto.crossSignDevice(ownDeviceId).catch(() => {
      // Device may already be cross-signed or require interactive verification
    })
  }

  await crypto.loadSessionBackupPrivateKeyFromSecretStorage()
  const backupCheck = await crypto.checkKeyBackupAndEnable()
  const backupVersion =
    (await crypto.getActiveSessionBackupVersion()) ?? backupCheck?.backupInfo.version ?? null

  let restored: KeyBackupRestoreResult | null = null
  if (backupVersion) {
    restored = await crypto.restoreKeyBackup()
  }

  return {
    crossSigningReady: await crypto.isCrossSigningReady(),
    secretStorageReady: await crypto.isSecretStorageReady(),
    backupVersion,
    restored,
  }
}

export interface DeviceSummary {
  deviceId: string
  displayName?: string
  verified: boolean
  crossSigningVerified: boolean
  signedByOwner: boolean
  blocked: boolean
}

export interface PeerTrustSummary {
  userId: string
  known: boolean
  verified: boolean
  needsUserApproval: boolean
  devices: DeviceSummary[]
}

export interface EncryptionSecurityStatus {
  userId: string | null
  deviceId: string | null
  crossSigningReady: boolean
  secretStorageReady: boolean
  backupVersion: string | null
  backupTrusted: boolean
  isolationMode: 'only_signed_devices'
  ownDevices: DeviceSummary[]
  peers: PeerTrustSummary[]
}

/**
 * Inspects full client encryption posture: cross-signing, 4S secret storage,
 * encrypted backup state, own device signatures, and partner trust statuses.
 */
export async function getEncryptionSecurityStatus(
  client: MatrixClient,
  peerUserIds: string[] = []
): Promise<EncryptionSecurityStatus> {
  const crypto = client.getCrypto()
  const ownUserId = client.getUserId()
  const ownDeviceId = client.getDeviceId()

  if (!crypto || !ownUserId) {
    return {
      userId: ownUserId,
      deviceId: ownDeviceId,
      crossSigningReady: false,
      secretStorageReady: false,
      backupVersion: null,
      backupTrusted: false,
      isolationMode: 'only_signed_devices',
      ownDevices: [],
      peers: [],
    }
  }

  const [crossSigningReady, secretStorageReady, backupVersion, backupCheck] = await Promise.all([
    crypto.isCrossSigningReady(),
    crypto.isSecretStorageReady(),
    crypto.getActiveSessionBackupVersion(),
    crypto.checkKeyBackupAndEnable().catch(() => null),
  ])

  const targetUsers = Array.from(new Set([ownUserId, ...peerUserIds]))
  const deviceMap = await crypto.getUserDeviceInfo(targetUsers, true)

  const summarizeUserDevices = async (targetUserId: string): Promise<DeviceSummary[]> => {
    const map = deviceMap.get(targetUserId)
    if (!map) return []
    const list: DeviceSummary[] = []
    for (const [devId, dev] of map) {
      const st = await crypto.getDeviceVerificationStatus(targetUserId, devId)
      list.push({
        deviceId: devId,
        displayName: dev.displayName,
        verified: st?.isVerified() ?? false,
        crossSigningVerified: st?.crossSigningVerified ?? false,
        signedByOwner: st?.signedByOwner ?? false,
        blocked: st?.blocked ?? false,
      })
    }
    return list
  }

  const ownDevices = await summarizeUserDevices(ownUserId)
  const peers: PeerTrustSummary[] = []
  for (const peerId of peerUserIds) {
    if (peerId === ownUserId) continue
    const trust = await crypto.getUserVerificationStatus(peerId)
    peers.push({
      userId: peerId,
      known: trust.known,
      verified: trust.isVerified(),
      needsUserApproval: Boolean(trust.needsUserApproval),
      devices: await summarizeUserDevices(peerId),
    })
  }

  return {
    userId: ownUserId,
    deviceId: ownDeviceId,
    crossSigningReady,
    secretStorageReady,
    backupVersion,
    backupTrusted: backupCheck?.trustInfo.trusted ?? false,
    isolationMode: 'only_signed_devices',
    ownDevices,
    peers,
  }
}

export interface InteractiveSasHandlers {
  onPhaseChange: (phase: VerificationPhase) => void
  onShowSas: (emojis: EmojiMapping[], callbacks: ShowSasCallbacks) => void
  onCancelled: (reason: string) => void
  onCompleted: () => void
}

/**
 * Initiates an in-room Matrix SAS (emoji) verification request with a partner.
 */
export async function startPartnerVerification(
  client: MatrixClient,
  peerUserId: string,
  roomId: string
): Promise<VerificationRequest> {
  const crypto = client.getCrypto()
  if (!crypto) {
    throw new Error('Matrix Rust Crypto is not initialized')
  }
  const existing = crypto.findVerificationRequestDMInProgress(roomId, peerUserId)
  if (existing) return existing
  return crypto.requestVerificationDM(peerUserId, roomId)
}

/**
 * Attaches listeners to an incoming or outgoing `VerificationRequest` to surface
 * the 7-emoji SAS confirmation prompt and clean up automatically when finished.
 */
export function attachVerificationFlowHandlers(
  request: VerificationRequest,
  handlers: InteractiveSasHandlers
): () => void {
  let activeVerifier: Verifier | null = null
  let verifierStarted = false

  const attachVerifier = (verifier: Verifier) => {
    if (activeVerifier === verifier) return
    activeVerifier = verifier

    const onShowSas = (sasCallbacks: ShowSasCallbacks) => {
      if (sasCallbacks.sas.emoji) {
        handlers.onShowSas(sasCallbacks.sas.emoji, sasCallbacks)
      }
    }
    const onCancel = (err: unknown) => {
      handlers.onCancelled(err instanceof Error ? err.message : 'Verification cancelled')
    }

    verifier.on(VerifierEvent.ShowSas, onShowSas)
    verifier.on(VerifierEvent.Cancel, onCancel)

    const existingSas = verifier.getShowSasCallbacks()
    if (existingSas?.sas.emoji) {
      handlers.onShowSas(existingSas.sas.emoji, existingSas)
    }

    if (!verifierStarted) {
      verifierStarted = true
      verifier.verify().catch((err) => {
        if (!verifier.hasBeenCancelled) {
          handlers.onCancelled(err instanceof Error ? err.message : 'Verification failed')
        }
      })
    }
  }

  const onChange = () => {
    handlers.onPhaseChange(request.phase)
    if (request.verifier) {
      attachVerifier(request.verifier)
    }
    if (request.phase === VerificationPhase.Done) {
      handlers.onCompleted()
    } else if (request.phase === VerificationPhase.Cancelled) {
      handlers.onCancelled('Verification cancelled')
    }
  }

  request.on(VerificationRequestEvent.Change, onChange)
  onChange()

  return () => {
    request.off(VerificationRequestEvent.Change, onChange)
  }
}

export { CryptoEvent, VerificationPhase }
