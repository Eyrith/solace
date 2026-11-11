# Security Plan — Project00

> Division 01 output.
> This document defines all Row Level Security policies, authentication rules, and data access controls.
> Every policy here must be implemented verbatim in the migration files.

---

## 1. Security Principles

1. **Default deny.** Every private table has `ALTER TABLE x ENABLE ROW LEVEL SECURITY`. Without an explicit GRANT via policy, no row is accessible.
2. **Space membership is the trust boundary.** The check `space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())` is repeated across all private tables.
3. **No service-role key on the client.** Only anon key is used in browser code. Service-role key is used exclusively in server-side Next.js Route Handlers and Edge Functions.
4. **Private storage.** The `sanctuary-media` bucket is private. URLs are signed server-side, expire in 1 hour, and are never cached.
5. **No security through obscurity.** We do not rely on "hard to guess" URLs or hidden routes for security.

---

## 2. RLS Policies by Table

### `profiles`

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read profiles (needed for displaying partner's avatar/name)
CREATE POLICY "profiles_read" ON profiles
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());
```

---

### `private_spaces`

```sql
ALTER TABLE private_spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spaces_member_read" ON private_spaces
  FOR SELECT USING (
    id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  );

CREATE POLICY "spaces_owner_update" ON private_spaces
  FOR UPDATE USING (created_by = auth.uid());

-- Spaces are created via server-side function (service role) — no direct INSERT policy
```

---

### `private_space_members`

```sql
ALTER TABLE private_space_members ENABLE ROW LEVEL SECURITY;

-- Members can see who else is in their spaces
CREATE POLICY "members_space_read" ON private_space_members
  FOR SELECT USING (
    space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  );

-- No direct INSERT/DELETE — handled via RPC functions (consume_invitation, leave_space)
```

---

### `invitations`

```sql
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Only space owner can see invitations for their space
CREATE POLICY "invitations_owner_read" ON invitations
  FOR SELECT USING (created_by = auth.uid());

-- Space owner can create invitations
CREATE POLICY "invitations_owner_insert" ON invitations
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND space_id IN (
      SELECT space_id FROM private_space_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Token validation and consumption done via SECURITY DEFINER RPC
```

---

### `conversations`

```sql
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_member_read" ON conversations
  FOR SELECT USING (
    space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  );
```

---

### `messages`

```sql
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Read: space member AND message is not expired AND not hard-deleted
CREATE POLICY "messages_member_read" ON messages
  FOR SELECT USING (
    space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
    AND (expires_at IS NULL OR expires_at > now())
    AND is_deleted = false
  );

-- Insert: must be a space member, sender must be self
CREATE POLICY "messages_member_insert" ON messages
  FOR INSERT WITH CHECK (
    space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
    AND sender_id = auth.uid()
  );

-- Update: only sender can edit their own messages (content, is_edited, edited_at)
-- Pinning is done via RPC (space member privilege, not sender-only)
CREATE POLICY "messages_sender_update" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Soft delete: only sender can soft-delete their own message
-- Hard delete: only via background Edge Function (service role)
```

---

### `message_receipts`

```sql
ALTER TABLE message_receipts ENABLE ROW LEVEL SECURITY;

-- Only space members can read receipts for messages in their space
CREATE POLICY "receipts_member_read" ON message_receipts
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM messages
      WHERE space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
    )
  );

-- Receipts are only inserted/updated via mark_message_viewed RPC (SECURITY DEFINER)
-- No direct INSERT policy needed
```

---

### `message_reactions`

```sql
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_member_read" ON message_reactions
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM messages
      WHERE space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "reactions_member_insert" ON message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND message_id IN (
      SELECT id FROM messages
      WHERE space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "reactions_own_delete" ON message_reactions
  FOR DELETE USING (user_id = auth.uid());
```

---

### `message_attachments`

```sql
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments_member_read" ON message_attachments
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM messages
      WHERE space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
        AND (expires_at IS NULL OR expires_at > now())
        AND is_deleted = false
    )
  );
-- Note: expired message → expired attachment. No signed URL will be issued.
```

---

### `game_sessions`

```sql
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_sessions_member_read" ON game_sessions
  FOR SELECT USING (
    space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  );

CREATE POLICY "game_sessions_member_insert" ON game_sessions
  FOR INSERT WITH CHECK (
    space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "game_sessions_member_update" ON game_sessions
  FOR UPDATE USING (
    space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  );
```

---

### `game_answers` — Blind Reveal Policy

```sql
ALTER TABLE game_answers ENABLE ROW LEVEL SECURITY;

-- INSERT: space member can submit their own answer
CREATE POLICY "answers_member_insert" ON game_answers
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND session_id IN (
      SELECT id FROM game_sessions
      WHERE space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
    )
  );

-- SELECT: answers only readable when game is in 'revealing' or 'complete' state
-- This enforces the blind reveal — you cannot read partner's answer until both submit
CREATE POLICY "answers_reveal_read" ON game_answers
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM game_sessions
      WHERE status IN ('revealing', 'complete')
        AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
    )
  );
```

---

### `question_library`

```sql
ALTER TABLE question_library ENABLE ROW LEVEL SECURITY;

-- Global questions: readable by all authenticated users
CREATE POLICY "library_global_read" ON question_library
  FOR SELECT USING (
    is_custom = false
    OR (
      is_custom = true
      AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
    )
  );

-- Custom questions: space members can insert
CREATE POLICY "library_custom_insert" ON question_library
  FOR INSERT WITH CHECK (
    is_custom = true
    AND created_by = auth.uid()
    AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  );
```

---

### `memories`, `calendar_events`, `bucket_list_items`

```sql
-- Pattern is identical for all three. Example for memories:
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memories_member_read" ON memories
  FOR SELECT USING (
    space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  );

CREATE POLICY "memories_member_insert" ON memories
  FOR INSERT WITH CHECK (
    space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "memories_author_update" ON memories
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "memories_author_delete" ON memories
  FOR DELETE USING (created_by = auth.uid());
```

---

### `letters` — Draft Privacy Policy

```sql
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

-- Drafts visible only to author; sent letters visible to all space members
CREATE POLICY "letters_read" ON letters
  FOR SELECT USING (
    (status = 'draft' AND author_id = auth.uid())
    OR (
      status IN ('scheduled', 'sent')
      AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "letters_author_insert" ON letters
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  );

CREATE POLICY "letters_author_update" ON letters
  FOR UPDATE USING (author_id = auth.uid());
```

---

### `shared_notes` — Private Journal Policy

```sql
ALTER TABLE shared_notes ENABLE ROW LEVEL SECURITY;

-- Private notes (is_shared = false): author only
-- Shared notes: all space members
CREATE POLICY "notes_read" ON shared_notes
  FOR SELECT USING (
    (is_shared = false AND created_by = auth.uid())
    OR (
      is_shared = true
      AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "notes_insert" ON shared_notes
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  );

CREATE POLICY "notes_update" ON shared_notes
  FOR UPDATE USING (created_by = auth.uid());
```

---

### `editorial_articles`, `editorial_sources`

```sql
-- Public read — no authentication required (anon role can read)
ALTER TABLE editorial_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "articles_public_read" ON editorial_articles FOR SELECT USING (true);

ALTER TABLE editorial_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sources_public_read" ON editorial_sources FOR SELECT USING (true);

-- Write access: service role only (Edge Function feed syncer)
-- No INSERT/UPDATE/DELETE policy for anon or authenticated role
```

---

### `saved_articles`, `reading_history`

```sql
ALTER TABLE saved_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_own_read" ON saved_articles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "saved_own_write" ON saved_articles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_own_delete" ON saved_articles
  FOR DELETE USING (user_id = auth.uid());

-- reading_history: same pattern
```

---

### `user_preferences`

```sql
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prefs_own" ON user_preferences
  FOR ALL USING (user_id = auth.uid());
```

---

### `call_sessions`

```sql
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calls_member_read" ON call_sessions
  FOR SELECT USING (
    space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  );

-- INSERT/UPDATE via LiveKit webhook handler (service role)
```

---

## 3. Storage Bucket Policies

### `sanctuary-media` (private bucket)

```sql
-- Only space members can upload to their space's folder
CREATE POLICY "media_member_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'sanctuary-media'
    AND (storage.foldername(name))[1] IN (
      SELECT space_id::text FROM private_space_members WHERE user_id = auth.uid()
    )
  );

-- Only space members can read their space's media
CREATE POLICY "media_member_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'sanctuary-media'
    AND (storage.foldername(name))[1] IN (
      SELECT space_id::text FROM private_space_members WHERE user_id = auth.uid()
    )
  );

-- Deletion handled by cleanup Edge Function (service role)
```

### `editorial-og-images` (public bucket)

Standard Supabase public bucket. No RLS needed. Used to cache Open Graph images from publishers. No personal data stored here.

---

## 4. API Endpoint Security

| Endpoint | Auth Required | Access Control |
|---|---|---|
| `GET /api/feeds/sync` | Cron secret header | Rejects if `Authorization: Bearer {CRON_SECRET}` absent |
| `POST /api/livekit/token` | Supabase session | Verifies user is space member before minting token |
| `POST /api/webhooks/supabase` | Webhook secret | Verifies `x-supabase-signature` header |
| All `(app)/` pages | Supabase session cookie | Middleware redirects to /auth/login if no valid session |
| All `(public)/` pages | None required | Public read; personal features (save, history) require session |

---

## 5. What This Architecture Cannot Prevent

| Threat | Status | Note |
|---|---|---|
| Screenshot / screen recording | ❌ Cannot prevent | OS-level feature; we acknowledge this limitation to users |
| Device seizure / forensics | ❌ Cannot prevent | No E2EE in MVP; encrypted at rest by Supabase (AES-256) |
| Partner sharing screenshots externally | ❌ Cannot prevent | Social/trust problem, not technical |
| Supabase infrastructure breach | ⚠️ Mitigated | Supabase encrypts data at rest; we cannot control their infra |
| Rubber-hose / legal compelled access | ❌ Cannot prevent | No zero-knowledge architecture in MVP |

We document these limitations honestly. We do not falsely advertise E2EE or privacy guarantees beyond what the architecture provides.

---

*See `docs/database-schema.md` for table definitions.*
*See `supabase/migrations/` for the actual migration SQL.*
