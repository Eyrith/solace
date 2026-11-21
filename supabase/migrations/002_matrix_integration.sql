-- =============================================================================
-- Migration: 002_matrix_integration
-- Strict Client-Side E2EE Matrix Mapping & Disappearing Media Metadata
--
-- SECURITY INVARIANTS:
-- 1. NEVER stores plaintext media content, unencrypted URLs, or original filenames.
-- 2. NEVER stores AES attachment keys (key.k), IVs, SHA-256 hashes, or 4S backup keys.
-- 3. Access controlled strictly via PostgreSQL RLS matching private_space_members.
-- =============================================================================

-- Maps Supabase auth/profiles users to opaque Matrix user IDs (@u_<hash>:server)
CREATE TABLE IF NOT EXISTS matrix_user_links (
  user_id         uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  matrix_user_id  text NOT NULL UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE matrix_user_links ENABLE ROW LEVEL SECURITY;

-- Users may read only their own link or co-members within their private 2-person spaces
CREATE POLICY "matrix_links_member_read" ON matrix_user_links
  FOR SELECT USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT psm_other.user_id
      FROM private_space_members psm_self
      JOIN private_space_members psm_other ON psm_self.space_id = psm_other.space_id
      WHERE psm_self.user_id = auth.uid()
    )
  );
-- Inserts/updates/deletes are performed strictly by Next.js server routes using SERVICE_ROLE_KEY.

-- Maps each 2-member private_space to its dedicated encrypted Matrix room
CREATE TABLE IF NOT EXISTS space_matrix_rooms (
  space_id              uuid PRIMARY KEY REFERENCES private_spaces(id) ON DELETE CASCADE,
  matrix_room_id        text NOT NULL UNIQUE,
  encryption_algorithm  text NOT NULL DEFAULT 'm.megolm.v1.aes-sha2'
                        CHECK (encryption_algorithm = 'm.megolm.v1.aes-sha2'),
  is_invite_locked      boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE space_matrix_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "space_matrix_rooms_member_read" ON space_matrix_rooms
  FOR SELECT USING (
    space_id IN (
      SELECT space_id FROM private_space_members WHERE user_id = auth.uid()
    )
  );

-- Metadata-only timer table for optional server-enforced Synapse media deletion/purge.
-- Contains ZERO decryption keys, ZERO IVs, ZERO hashes, ZERO plaintext filenames.
CREATE TABLE IF NOT EXISTS ephemeral_media_timers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id            uuid NOT NULL REFERENCES private_spaces(id) ON DELETE CASCADE,
  matrix_room_id      text NOT NULL,
  matrix_event_id     text NOT NULL,
  matrix_server_name  text,
  matrix_media_id     text,
  expires_at          timestamptz NOT NULL,
  purged_at           timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (matrix_room_id, matrix_event_id)
);

CREATE INDEX IF NOT EXISTS idx_ephemeral_media_due
  ON ephemeral_media_timers (expires_at)
  WHERE purged_at IS NULL;

ALTER TABLE ephemeral_media_timers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ephemeral_media_timers_member_read" ON ephemeral_media_timers
  FOR SELECT USING (
    space_id IN (
      SELECT space_id FROM private_space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ephemeral_media_timers_member_insert" ON ephemeral_media_timers
  FOR INSERT WITH CHECK (
    space_id IN (
      SELECT space_id FROM private_space_members WHERE user_id = auth.uid()
    )
  );

