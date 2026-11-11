-- =============================================================================
-- Migration: 001_initial_schema
-- Project00: Private communication platform with editorial public face
-- =============================================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ─── Profiles ─────────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 50),
  avatar_url    text,
  bio           text CHECK (char_length(bio) <= 300),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile on user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Private Spaces ───────────────────────────────────────────────────────────

CREATE TABLE private_spaces (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  created_by    uuid NOT NULL REFERENCES profiles(id),
  cover_url     text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE private_space_members (
  space_id      uuid NOT NULL REFERENCES private_spaces(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY   (space_id, user_id)
);

-- Enforce 2-member maximum
CREATE OR REPLACE FUNCTION check_space_member_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM private_space_members WHERE space_id = NEW.space_id
  ) >= 2 THEN
    RAISE EXCEPTION 'Space is full: maximum 2 members per space';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_space_member_limit
  BEFORE INSERT ON private_space_members
  FOR EACH ROW EXECUTE FUNCTION check_space_member_limit();

-- ─── Invitations ──────────────────────────────────────────────────────────────

CREATE TABLE invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id      uuid NOT NULL REFERENCES private_spaces(id) ON DELETE CASCADE,
  created_by    uuid NOT NULL REFERENCES profiles(id),
  token         text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64url'),
  expires_at    timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  used_at       timestamptz,
  used_by       uuid REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─── Conversations & Messages ─────────────────────────────────────────────────

CREATE TABLE conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id      uuid NOT NULL UNIQUE REFERENCES private_spaces(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  space_id          uuid NOT NULL REFERENCES private_spaces(id) ON DELETE CASCADE,
  sender_id         uuid NOT NULL REFERENCES profiles(id),
  content           text,
  message_type      text NOT NULL DEFAULT 'text'
                    CHECK (message_type IN ('text', 'image', 'video', 'voice', 'system')),
  reply_to_id       uuid REFERENCES messages(id) ON DELETE SET NULL,
  is_edited         boolean NOT NULL DEFAULT false,
  edited_at         timestamptz,
  is_deleted        boolean NOT NULL DEFAULT false,
  deleted_at        timestamptz,
  is_pinned         boolean NOT NULL DEFAULT false,
  pinned_at         timestamptz,
  pinned_by         uuid REFERENCES profiles(id),
  expires_mode      text CHECK (expires_mode IN (
                      'never', 'just_seen', '1_second', '5_minutes',
                      '1_hour', '24_hours', 'custom'
                    )) DEFAULT 'never',
  expires_duration  interval,
  expires_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_expires_at      ON messages(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_messages_sender_id       ON messages(sender_id);
CREATE INDEX idx_messages_created_at      ON messages(created_at DESC);

CREATE TABLE message_receipts (
  message_id    uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  delivered_at  timestamptz NOT NULL DEFAULT now(),
  viewed_at     timestamptz,
  PRIMARY KEY   (message_id, user_id)
);

CREATE TABLE message_reactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji         text NOT NULL CHECK (char_length(emoji) <= 8),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE        (message_id, user_id, emoji)
);

CREATE TABLE message_attachments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  storage_path    text NOT NULL,
  mime_type       text NOT NULL,
  file_size_bytes bigint NOT NULL,
  duration_ms     integer,
  width           integer,
  height          integer,
  thumbnail_path  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── Question Library & Games ─────────────────────────────────────────────────

CREATE TABLE question_library (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category      text NOT NULL CHECK (category IN (
                  'funny', 'romantic', 'personal', 'childhood',
                  'intellectual', 'hypothetical', 'future', 'intimacy',
                  'couple_trivia', 'compatibility', 'would_you_rather',
                  'truth_or_dare'
                )),
  content       text NOT NULL,
  is_custom     boolean NOT NULL DEFAULT false,
  created_by    uuid REFERENCES profiles(id),
  space_id      uuid REFERENCES private_spaces(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE question_saves (
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id   uuid NOT NULL REFERENCES question_library(id) ON DELETE CASCADE,
  saved_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY   (user_id, question_id)
);

CREATE TABLE daily_questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id      uuid NOT NULL REFERENCES private_spaces(id) ON DELETE CASCADE,
  question_id   uuid NOT NULL REFERENCES question_library(id),
  date          date NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE        (space_id, date)
);

CREATE TABLE game_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id      uuid NOT NULL REFERENCES private_spaces(id) ON DELETE CASCADE,
  game_type     text NOT NULL CHECK (game_type IN (
                  'couple_trivia', 'compatibility', 'would_you_rather',
                  'guess_partner', 'truth_or_dare', 'custom', 'personality',
                  'memory', 'intellectual'
                )),
  status        text NOT NULL DEFAULT 'waiting'
                CHECK (status IN ('waiting', 'active', 'revealing', 'complete')),
  question_ids  uuid[] NOT NULL DEFAULT '{}',
  current_q_idx integer NOT NULL DEFAULT 0,
  scores        jsonb NOT NULL DEFAULT '{}',
  started_at    timestamptz,
  completed_at  timestamptz,
  created_by    uuid NOT NULL REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE game_answers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  question_id   uuid NOT NULL REFERENCES question_library(id),
  user_id       uuid NOT NULL REFERENCES profiles(id),
  answer        text NOT NULL,
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE        (session_id, question_id, user_id)
);

-- ─── Shared Experiences ───────────────────────────────────────────────────────

CREATE TABLE memories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id      uuid NOT NULL REFERENCES private_spaces(id) ON DELETE CASCADE,
  created_by    uuid NOT NULL REFERENCES profiles(id),
  title         text NOT NULL,
  content       text,
  memory_date   date,
  media_paths   text[] DEFAULT '{}',
  tags          text[] DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE letters (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id      uuid NOT NULL REFERENCES private_spaces(id) ON DELETE CASCADE,
  author_id     uuid NOT NULL REFERENCES profiles(id),
  subject       text NOT NULL,
  body          text NOT NULL,
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'scheduled', 'sent')),
  scheduled_for timestamptz,
  sent_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE calendar_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id        uuid NOT NULL REFERENCES private_spaces(id) ON DELETE CASCADE,
  created_by      uuid NOT NULL REFERENCES profiles(id),
  title           text NOT NULL,
  description     text,
  event_date      date NOT NULL,
  event_time      time,
  is_recurring    boolean NOT NULL DEFAULT false,
  recurrence_rule text,
  is_anniversary  boolean NOT NULL DEFAULT false,
  reminder_days   integer[] DEFAULT '{1,7}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bucket_list_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id      uuid NOT NULL REFERENCES private_spaces(id) ON DELETE CASCADE,
  created_by    uuid NOT NULL REFERENCES profiles(id),
  title         text NOT NULL,
  description   text,
  is_completed  boolean NOT NULL DEFAULT false,
  completed_at  timestamptz,
  completed_by  uuid REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE shared_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id      uuid NOT NULL REFERENCES private_spaces(id) ON DELETE CASCADE,
  created_by    uuid NOT NULL REFERENCES profiles(id),
  title         text NOT NULL,
  content       text NOT NULL DEFAULT '',
  is_shared     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ─── Editorial (Public) ───────────────────────────────────────────────────────

CREATE TABLE editorial_sources (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  description   text,
  website_url   text NOT NULL,
  rss_url       text,
  logo_url      text,
  accent_color  text,
  is_active     boolean NOT NULL DEFAULT true,
  last_synced   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE editorial_articles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       uuid NOT NULL REFERENCES editorial_sources(id),
  external_id     text NOT NULL,
  title           text NOT NULL,
  author          text,
  excerpt         text CHECK (char_length(excerpt) <= 500),
  original_url    text NOT NULL,
  og_image_url    text,
  category        text,
  tags            text[] DEFAULT '{}',
  reading_time_min integer,
  published_at    timestamptz,
  ingested_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE          (source_id, external_id)
);

CREATE INDEX idx_articles_category     ON editorial_articles(category);
CREATE INDEX idx_articles_published_at ON editorial_articles(published_at DESC);
CREATE INDEX idx_articles_source_id    ON editorial_articles(source_id);

CREATE TABLE saved_articles (
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  article_id    uuid NOT NULL REFERENCES editorial_articles(id) ON DELETE CASCADE,
  saved_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY   (user_id, article_id)
);

CREATE TABLE reading_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  article_id    uuid NOT NULL REFERENCES editorial_articles(id) ON DELETE CASCADE,
  read_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE        (user_id, article_id)
);

-- ─── Personalisation & Calls ──────────────────────────────────────────────────

CREATE TABLE user_preferences (
  user_id                 uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  palette                 text NOT NULL DEFAULT 'ivory',
  color_mode              text NOT NULL DEFAULT 'light' CHECK (color_mode IN ('light', 'dark', 'system')),
  font_pairing            text NOT NULL DEFAULT 'editorial-1',
  font_scale              text NOT NULL DEFAULT 'md' CHECK (font_scale IN ('sm', 'md', 'lg', 'xl')),
  density                 text NOT NULL DEFAULT 'comfortable' CHECK (density IN ('compact', 'comfortable', 'spacious')),
  bubble_style            text NOT NULL DEFAULT 'soft' CHECK (bubble_style IN ('soft', 'editorial', 'pill', 'minimal')),
  chat_background         text NOT NULL DEFAULT 'none',
  reduced_motion          boolean NOT NULL DEFAULT false,
  discreet_notifs         boolean NOT NULL DEFAULT true,
  reading_history_enabled boolean NOT NULL DEFAULT false,
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE call_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id        uuid NOT NULL REFERENCES private_spaces(id) ON DELETE CASCADE,
  initiator_id    uuid NOT NULL REFERENCES profiles(id),
  call_type       text NOT NULL CHECK (call_type IN ('voice', 'video')),
  status          text NOT NULL DEFAULT 'ringing'
                  CHECK (status IN ('ringing', 'active', 'ended', 'missed', 'declined')),
  livekit_room    text,
  started_at      timestamptz,
  ended_at        timestamptz,
  duration_sec    integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── Stored Procedures ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION mark_message_viewed(
  p_message_id uuid,
  p_user_id    uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_expires_mode     text;
  v_expires_duration interval;
  v_new_expires_at   timestamptz;
BEGIN
  -- Security: verify caller is a space member
  IF NOT EXISTS (
    SELECT 1 FROM messages m
    JOIN private_space_members psm ON psm.space_id = m.space_id
    WHERE m.id = p_message_id AND psm.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Upsert delivery receipt
  INSERT INTO message_receipts (message_id, user_id, viewed_at)
  VALUES (p_message_id, p_user_id, now())
  ON CONFLICT (message_id, user_id)
  DO UPDATE SET viewed_at = LEAST(message_receipts.viewed_at, EXCLUDED.viewed_at);

  -- Compute expiry timestamp
  SELECT expires_mode, expires_duration
  INTO v_expires_mode, v_expires_duration
  FROM messages WHERE id = p_message_id;

  v_new_expires_at := CASE v_expires_mode
    WHEN 'just_seen'  THEN now()
    WHEN '1_second'   THEN now() + INTERVAL '1 second'
    WHEN '5_minutes'  THEN now() + INTERVAL '5 minutes'
    WHEN '1_hour'     THEN now() + INTERVAL '1 hour'
    WHEN '24_hours'   THEN now() + INTERVAL '24 hours'
    WHEN 'custom'     THEN now() + v_expires_duration
    ELSE NULL
  END;

  IF v_new_expires_at IS NOT NULL THEN
    UPDATE messages
    SET expires_at = v_new_expires_at
    WHERE id = p_message_id
      AND (expires_at IS NULL OR v_new_expires_at < expires_at);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION consume_invitation(
  p_token text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_invite invitations;
  v_member_count integer;
BEGIN
  SELECT * INTO v_invite
  FROM invitations
  WHERE token = p_token AND used_at IS NULL AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  SELECT COUNT(*) INTO v_member_count
  FROM private_space_members WHERE space_id = v_invite.space_id;

  IF v_member_count >= 2 THEN
    RAISE EXCEPTION 'Space is full (maximum 2 members)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM private_space_members
    WHERE space_id = v_invite.space_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Already a member of this space';
  END IF;

  INSERT INTO private_space_members (space_id, user_id, role)
  VALUES (v_invite.space_id, auth.uid(), 'member');

  UPDATE invitations
  SET used_at = now(), used_by = auth.uid()
  WHERE id = v_invite.id;

  RETURN v_invite.space_id;
END;
$$;

-- ─── RLS Policies ─────────────────────────────────────────────────────────────

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read"        ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE USING (id = auth.uid());

-- private_spaces
ALTER TABLE private_spaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spaces_member_read"   ON private_spaces FOR SELECT USING (
  id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
);
CREATE POLICY "spaces_owner_update"  ON private_spaces FOR UPDATE USING (created_by = auth.uid());

-- private_space_members
ALTER TABLE private_space_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_space_read"   ON private_space_members FOR SELECT USING (
  space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
);

-- invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invitations_owner_read"   ON invitations FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "invitations_owner_insert" ON invitations FOR INSERT WITH CHECK (
  created_by = auth.uid()
  AND space_id IN (
    SELECT space_id FROM private_space_members
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_member_read" ON conversations FOR SELECT USING (
  space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
);

-- messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_member_read" ON messages FOR SELECT USING (
  space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  AND (expires_at IS NULL OR expires_at > now())
  AND is_deleted = false
);
CREATE POLICY "messages_member_insert" ON messages FOR INSERT WITH CHECK (
  space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  AND sender_id = auth.uid()
);
CREATE POLICY "messages_sender_update" ON messages FOR UPDATE USING (sender_id = auth.uid());

-- message_receipts
ALTER TABLE message_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts_member_read" ON message_receipts FOR SELECT USING (
  message_id IN (
    SELECT id FROM messages
    WHERE space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  )
);

-- message_reactions
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions_member_read"   ON message_reactions FOR SELECT USING (
  message_id IN (
    SELECT id FROM messages
    WHERE space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  )
);
CREATE POLICY "reactions_member_insert" ON message_reactions FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND message_id IN (
    SELECT id FROM messages
    WHERE space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  )
);
CREATE POLICY "reactions_own_delete"    ON message_reactions FOR DELETE USING (user_id = auth.uid());

-- message_attachments
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attachments_member_read" ON message_attachments FOR SELECT USING (
  message_id IN (
    SELECT id FROM messages
    WHERE space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
      AND (expires_at IS NULL OR expires_at > now())
      AND is_deleted = false
  )
);

-- game_sessions
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "game_sessions_member_read"   ON game_sessions FOR SELECT USING (
  space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
);
CREATE POLICY "game_sessions_member_insert" ON game_sessions FOR INSERT WITH CHECK (
  space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  AND created_by = auth.uid()
);
CREATE POLICY "game_sessions_member_update" ON game_sessions FOR UPDATE USING (
  space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
);

-- game_answers (blind reveal enforced)
ALTER TABLE game_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answers_member_insert" ON game_answers FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND session_id IN (
    SELECT id FROM game_sessions
    WHERE space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  )
);
CREATE POLICY "answers_reveal_read" ON game_answers FOR SELECT USING (
  session_id IN (
    SELECT id FROM game_sessions
    WHERE status IN ('revealing', 'complete')
      AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  )
);

-- question_library
ALTER TABLE question_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "library_global_read" ON question_library FOR SELECT USING (
  is_custom = false
  OR (
    is_custom = true
    AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  )
);
CREATE POLICY "library_custom_insert" ON question_library FOR INSERT WITH CHECK (
  is_custom = true
  AND created_by = auth.uid()
  AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
);

-- question_saves, daily_questions
ALTER TABLE question_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saves_own" ON question_saves FOR ALL USING (user_id = auth.uid());

ALTER TABLE daily_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_q_member_read" ON daily_questions FOR SELECT USING (
  space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
);

-- memories, calendar_events, bucket_list_items (same pattern)
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memories_member_read"   ON memories FOR SELECT USING (
  space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
);
CREATE POLICY "memories_member_insert" ON memories FOR INSERT WITH CHECK (
  space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  AND created_by = auth.uid()
);
CREATE POLICY "memories_author_update" ON memories FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "memories_author_delete" ON memories FOR DELETE USING (created_by = auth.uid());

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cal_member_read"   ON calendar_events FOR SELECT USING (
  space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
);
CREATE POLICY "cal_member_insert" ON calendar_events FOR INSERT WITH CHECK (
  space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  AND created_by = auth.uid()
);
CREATE POLICY "cal_author_update" ON calendar_events FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "cal_author_delete" ON calendar_events FOR DELETE USING (created_by = auth.uid());

ALTER TABLE bucket_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bucket_member_read"   ON bucket_list_items FOR SELECT USING (
  space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
);
CREATE POLICY "bucket_member_insert" ON bucket_list_items FOR INSERT WITH CHECK (
  space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  AND created_by = auth.uid()
);
CREATE POLICY "bucket_member_update" ON bucket_list_items FOR UPDATE USING (
  space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
);

-- letters (draft privacy)
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "letters_read" ON letters FOR SELECT USING (
  (status = 'draft' AND author_id = auth.uid())
  OR (
    status IN ('scheduled', 'sent')
    AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  )
);
CREATE POLICY "letters_author_insert" ON letters FOR INSERT WITH CHECK (
  author_id = auth.uid()
  AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
);
CREATE POLICY "letters_author_update" ON letters FOR UPDATE USING (author_id = auth.uid());

-- shared_notes (private journal policy)
ALTER TABLE shared_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_read" ON shared_notes FOR SELECT USING (
  (is_shared = false AND created_by = auth.uid())
  OR (
    is_shared = true
    AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  )
);
CREATE POLICY "notes_insert" ON shared_notes FOR INSERT WITH CHECK (
  created_by = auth.uid()
  AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
);
CREATE POLICY "notes_update" ON shared_notes FOR UPDATE USING (created_by = auth.uid());

-- editorial tables (public read)
ALTER TABLE editorial_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sources_public_read" ON editorial_sources FOR SELECT USING (true);

ALTER TABLE editorial_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "articles_public_read" ON editorial_articles FOR SELECT USING (true);

ALTER TABLE saved_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_own" ON saved_articles FOR ALL USING (user_id = auth.uid());

ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history_own" ON reading_history FOR ALL USING (user_id = auth.uid());

-- user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs_own" ON user_preferences FOR ALL USING (user_id = auth.uid());

-- call_sessions
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calls_member_read" ON call_sessions FOR SELECT USING (
  space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
);

-- ─── Background Cleanup Job ───────────────────────────────────────────────────
-- Scheduled via pg_cron (enable in Supabase dashboard: Database → Extensions → pg_cron)
-- This runs every 60 seconds and hard-deletes expired messages.
-- Media deletion is handled separately by the cleanup Edge Function.

-- SELECT cron.schedule(
--   'cleanup-expired-messages',
--   '* * * * *',
--   $$
--     DELETE FROM messages
--     WHERE expires_at IS NOT NULL AND expires_at < now();
--   $$
-- );

-- ─── Seed: Editorial Sources ──────────────────────────────────────────────────

INSERT INTO editorial_sources (name, slug, description, website_url, rss_url, accent_color) VALUES
  ('Psyche', 'psyche', 'A digital magazine exploring the human mind and flourishing', 'https://psyche.co', 'https://psyche.co/feed', '#6B73A8'),
  ('Aeon', 'aeon', 'A magazine of ideas and culture', 'https://aeon.co', 'https://aeon.co/feed.rss', '#1A1A2E'),
  ('Greater Good Magazine', 'greater-good', 'Science-based insights for a meaningful life', 'https://greatergood.berkeley.edu', 'https://greatergood.berkeley.edu/feeds/articles', '#4A7C59'),
  ('The Marginalian', 'marginalian', 'An inventory of the cross-disciplinary interestingness of the world', 'https://www.themarginalian.org', 'https://www.themarginalian.org/feed/', '#8B5E3C'),
  ('The School of Life', 'school-of-life', 'Developing emotional intelligence', 'https://www.theschooloflife.com', NULL, '#C8A96E');
