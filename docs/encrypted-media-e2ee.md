# Strict Client-Side E2EE for Private Media

This document describes the architecture, cryptographic primitives, key management, authenticated access controls, deletion/retention policies, and administrator storage workflows for private Sanctuary media (photos, thumbnails, videos, voice notes, and attachments).

Every mechanism builds on Matrix's audited, standardized protocols (`matrix-encrypt-attachment`, `matrix-js-sdk` Rust crypto WASM, Olm/Megolm, Cross-Signing, 4S Secret Storage, and MSC3916 Authenticated Media). No custom encryption algorithms are introduced.

---

## 1. End-to-End Architecture & Trust Boundaries

```
+-------------------------------------------------------------------------+
| Sender Browser / Next.js (app) Sanctuary (MatrixProvider)               |
|  1. Verify room is m.room.encryption, <= 2 members, partner cross-signed|
|  2. Strip EXIF via <canvas> -> Thumbnail bytes -> AES-256-CTR + SHA-256 |
|  3. Main file bytes -> AES-256-CTR (256-bit ephemeral key) + SHA-256    |
|  4. Upload opaque blobs (application/octet-stream, includeFilename:false|
|  5. Put {url: mxc://, key.k, iv, hashes.sha256} ONLY inside Megolm event|
+------------------------------------+------------------------------------+
                                     |
          HTTPS / TLS                | (Ciphertext blobs + m.room.encrypted)
                                     v
+-------------------------------------------------------------------------+
| Self-Hosted Matrix Synapse Homeserver (Federation & Registration OFF)  |
|  - Disk (media_store/): opaque ciphertext bytes, NO original filename,   |
|    NO real MIME type, NO EXIF metadata, NO plaintext thumbnails         |
|  - DB (event_json): Megolm ciphertext; server NEVER sees key.k or iv    |
|  - Admin APIs: can inspect media_id/byte-size, quarantine, purge/delete |
|  - MSC3916: requires Bearer access token on every media download        |
+------------------------------------+------------------------------------+
                                     |
          HTTPS + Bearer Token       | (MSC3916 download + Megolm /sync)
                                     v
+-------------------------------------------------------------------------+
| Recipient Browser / Authorized Verified Device                          |
|  1. Megolm decrypts m.room.message -> asserts NO plaintext url fallback |
|  2. Fetches ciphertext via /_matrix/client/v1/media/download/...        |
|  3. Verifies ciphertext SHA-256 == hashes.sha256                       |
|  4. Decrypts AES-256-CTR in RAM -> Blob -> URL.createObjectURL(...)     |
|  5. Revokes ObjectURL on delete/redaction/disconnect/unmount            |
+-------------------------------------------------------------------------+
```

**Separation of Duties:**
- **Supabase**: User authentication, RLS-protected couples spaces, games, questions, memories, preferences, opaque ID mappings (`matrix_user_links`, `space_matrix_rooms`). **Never stores encryption keys, IVs, recovery keys, or media blobs.**
- **Public Portal (`www` / `(public)`)**: Never imports `matrix-js-sdk`, WASM crypto binaries, or `MatrixProvider`.
- **Legacy Upload Endpoint (`/api/media/upload`)**: Permanently fails closed (`HTTP 410 Gone`, `PLAINTEXT_MEDIA_FORBIDDEN`).

---

## 2. Cryptographic Workflow (Step-by-Step)

### A. Encryption & Anonymous Upload (`src/lib/matrix/encrypted-media.ts`)
1. **Fail-Closed Pre-Flight (`verifyRoomMediaSecurity`)**:
   - Asserts Rust Crypto WASM is active (`client.getCrypto()`).
   - Asserts `crypto.isEncryptionEnabledInRoom(roomId)` is `true` (`UNENCRYPTED_ROOM`).
   - Enforces maximum 2 room members (`joined` + `invited`) for couples rooms (`ROOM_MEMBERSHIP_VIOLATION`).
   - Checks `crypto.getUserVerificationStatus(peerUserId)` — blocks if `needsUserApproval` (identity reset alert) or if the partner has not completed cross-signing/SAS verification (`UNVERIFIED_RECIPIENTS`).
2. **Client Thumbnail Sanitization (`generateClientThumbnailBytes`)**:
   - For `image/*` or `video/*`, renders an offscreen `<canvas>` frame (`maxDimension: 480`, `image/webp`), stripping EXIF GPS/device metadata and camera thumbnails.
   - Calls `encryptAttachment(thumbBuffer)` from `matrix-encrypt-attachment` (`v2`, random 256-bit `AES-CTR` key, 128-bit IV with zero-initialized lower 64 counter bits, SHA-256 digest of ciphertext).
3. **Main Attachment Encryption (`encryptMediaBuffer`)**:
   - Generates a fresh per-attachment 256-bit AES key + IV via `encryptAttachment(plaintextBuffer)` (Web Crypto CSPRNG). Even two uploads of an identical photo yield completely distinct ciphertexts and keys.
4. **Opaque Upload (`uploadEncryptedBlob`)**:
   - Uploads both ciphertext buffers via `client.uploadContent(new Blob([ciphertext], { type: 'application/octet-stream' }), { type: 'application/octet-stream', includeFilename: false })`.
   - `upload_name` in Synapse DB remains `NULL`; `media_type` on Synapse is strictly `application/octet-stream`.
5. **Megolm Key Delivery (`m.room.encrypted`)**:
   - Constructs a Matrix `RoomMessageEventContent` containing ONLY `file: EncryptedFile` (with `url: mxc://...`, `v: "v2"`, `key.alg: "A256CTR"`, `iv`, `hashes.sha256`) and `info.thumbnail_file: EncryptedFile`.
   - Runs `assertNoPlaintextMediaFallback` rejecting any top-level `url` or `info.thumbnail_url`.
   - Sends via `client.sendMessage(roomId, content)`, which Rust Crypto encrypts with the room's active Megolm session (`m.megolm.v1.aes-sha2`) under `OnlySignedDevicesIsolationMode`.

### B. Retrieval & In-Memory Decryption (`fetchAndDecryptMedia` & `MatrixProvider`)
1. **Strict Event Inspection (`extractValidatedEncryptedMediaContent`)**:
   - Rejects any timeline event where `event.isEncrypted()` is `false`, or containing `content.url` / `info.thumbnail_url`.
   - Validates `EncryptedFile` (`v === "v2"`, `key.kty === "oct"`, `key.alg === "A256CTR"`, `key.ext === true`, non-empty `hashes.sha256`, valid `mxc://` URI).
2. **MSC3916 Authenticated Media Retrieval**:
   - Constructs `/_matrix/client/v1/media/download/<server>/<mediaId>` (`toAuthenticatedDownloadUrl`) and includes `Authorization: Bearer <accessToken>`. Never calls legacy `/_matrix/media/v3/download/...`.
3. **Integrity Verification & RAM Decryption**:
   - Passes ciphertext + `EncryptedFile` to `decryptAttachment(ciphertext, file)`.
   - `decryptAttachment` verifies `SHA-256(ciphertext) === hashes.sha256` before decrypting AES-256-CTR; any single bit flip throws `MediaSecurityError('DECRYPTION_FAILED')`.
   - Wraps decrypted bytes in an in-memory `Blob` and creates a temporary `blob:` ObjectURL (`URL.createObjectURL`). Components (`EncryptedMediaBubble`, `VoiceNotePlayer`) validate `src.startsWith('blob:')` before rendering. Plaintext media is never written to `localStorage` or Service Worker caches.

---

## 3. Key Management, Encrypted Backups & Device Verification

Implemented in `src/lib/matrix/crypto-lifecycle.ts` and `src/components/providers/matrix-provider.tsx`:

1. **Device Isolation (`OnlySignedDevicesIsolationMode` & `globalBlacklistUnverifiedDevices = true`)**:
   - Enabled immediately after `client.initRustCrypto(...)` using Matrix MSC4153 device isolation.
   - Unsigned / unverified logins of even a known account cannot receive Megolm room keys from verified Sanctuary senders.
2. **Cross-Signing & 4S Secret Storage**:
   - `bootstrapEncryptedIdentityAndBackup` initializes Master, Self-Signing, and User-Signing keys, creates a Matrix Security Recovery Key (`EsT...`), stores encrypted secrets inside Synapse `account_data` (`m.secret_storage.*` encrypted via `AES-CTR + HMAC-SHA256`), and enables `m.megolm_backup.v1.curve25519-aes-sha2`.
   - Recovery keys are shown once to the user and held only inside an ephemeral `SecretKeyMemoryVault` (zeroized via `.fill(0)` on disconnect/unmount).
3. **Cross-Device Restore (`unlockAndRestoreFromRecoveryKey`)**:
   - A new browser/device imports the Recovery Key -> decrypts private cross-signing keys & Megolm backup key in RAM -> self-signs the new device (`crossSignDevice`) -> restores historical media & room keys via `crypto.restoreKeyBackup()`.
4. **Interactive SAS Verification**:
   - `startPartnerVerification` + `attachVerificationFlowHandlers` runs `m.sas.v1` emoji verification in-room, presenting the 7 Matrix verification emojis inside Sanctuary before partners confirm mutual trust.

---

## 4. Server Storage Governance, Retention & Honest Limitations

### Server Administrator Controls (`/api/matrix/media/admin` & `backend/app/services/synapse_admin.py`)
- FastAPI (`backend/app/routers/matrix.py` + `backend/app/services/synapse_admin.py` + `backend/app/services/retention.py`) manages opaque session provisioning, storage quotas, quarantine, and `ephemeral_media_timers` cleanup via `/_synapse/admin/v1/users/<mxid>/media`, `/_synapse/admin/v1/room/<roomId>/media`, `/_synapse/admin/v1/media/quarantine/...`, and `DELETE /_synapse/admin/v1/media/...` (backed by `homeserver.yaml.template` `media_retention` + `retention.enabled: true` purge jobs).
- Admins inspect ONLY `media_id`, byte length, timestamps, `quarantined_by`, `mimeType: "application/octet-stream"`, and `uploadName: null`.
- Admins **cannot** view images, play voice notes/videos, read filenames, or decrypt `m.room.encrypted` event payloads.

### Honest Client-Side Retention Boundary
- Redacting an event (`redactEvent`) + running Synapse retention / media deletion removes server ciphertext blobs and room references from well-behaved clients.
- However, once an authorized recipient device has decrypted media into its display framebuffer, audio hardware, or OS downloads, cryptographic systems cannot retroactively prevent screenshots, local downloads, or analog capture by that authorized recipient.

