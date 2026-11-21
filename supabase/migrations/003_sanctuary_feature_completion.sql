-- =============================================================================
-- Migration: 003_sanctuary_feature_completion
-- Project00: Schema additions, question seed data, blind-reveal daily answers,
--            space moods, notification preference flags, and realtime sync.
-- =============================================================================

-- ─── 1. Space Moods (Soft Mood Pulse on Home Dashboard) ───────────────────────

CREATE TABLE IF NOT EXISTS space_moods (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id    uuid NOT NULL REFERENCES private_spaces(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mood        text NOT NULL CHECK (char_length(mood) BETWEEN 1 AND 80),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE      (space_id, user_id)
);

ALTER TABLE space_moods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "space_moods_member_read" ON space_moods
  FOR SELECT USING (
    space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  );

CREATE POLICY "space_moods_own_insert" ON space_moods
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  );

CREATE POLICY "space_moods_own_update" ON space_moods
  FOR UPDATE USING (
    user_id = auth.uid()
    AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  );

CREATE POLICY "space_moods_own_delete" ON space_moods
  FOR DELETE USING (
    user_id = auth.uid()
    AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  );

-- ─── 2. Daily Question Answers (Server & RLS-Enforced Blind Reveal) ───────────

CREATE TABLE IF NOT EXISTS daily_question_answers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_question_id uuid NOT NULL REFERENCES daily_questions(id) ON DELETE CASCADE,
  space_id          uuid NOT NULL REFERENCES private_spaces(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  answer            text NOT NULL CHECK (char_length(trim(answer)) BETWEEN 1 AND 2000),
  submitted_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE            (daily_question_id, user_id)
);

CREATE OR REPLACE FUNCTION is_daily_question_revealed(p_daily_question_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id) >= 2
  FROM daily_question_answers
  WHERE daily_question_id = p_daily_question_id;
$$;

ALTER TABLE daily_question_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_answers_blind_reveal_read" ON daily_question_answers
  FOR SELECT USING (
    space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
    AND (
      user_id = auth.uid()
      OR is_daily_question_revealed(daily_question_id)
    )
  );

CREATE POLICY "daily_answers_own_insert" ON daily_question_answers
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  );

CREATE POLICY "daily_answers_own_update" ON daily_question_answers
  FOR UPDATE USING (
    user_id = auth.uid()
    AND space_id IN (SELECT space_id FROM private_space_members WHERE user_id = auth.uid())
  );

-- ─── 3. User Preferences Extended Alert Controls ──────────────────────────────

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS sound_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS call_alerts   boolean NOT NULL DEFAULT true;

-- ─── 4. Author Delete Policies & Missing Bucket List Delete ───────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'letters' AND policyname = 'letters_author_delete'
  ) THEN
    CREATE POLICY "letters_author_delete" ON letters FOR DELETE USING (author_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'shared_notes' AND policyname = 'notes_delete'
  ) THEN
    CREATE POLICY "notes_delete" ON shared_notes FOR DELETE USING (created_by = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bucket_list_items' AND policyname = 'bucket_author_delete'
  ) THEN
    CREATE POLICY "bucket_author_delete" ON bucket_list_items FOR DELETE USING (created_by = auth.uid());
  END IF;
END $$;

-- ─── 5. Question Library Metadata & Canonical Global Seed ─────────────────────

ALTER TABLE question_library
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS game_template_id text,
  ADD COLUMN IF NOT EXISTS options jsonb;

INSERT INTO question_library (id, slug, game_template_id, category, content, options, is_custom)
VALUES
  -- Global Question Library
  ('00000000-0000-4000-8000-000000000101', 'fun-1', NULL, 'funny', 'If our life together were a low-budget sitcom, what would be our recurring running gag?', NULL, false),
  ('00000000-0000-4000-8000-000000000102', 'fun-2', NULL, 'funny', 'What is the absolute weirdest food combination that you secretly love eating when no one is watching?', NULL, false),
  ('00000000-0000-4000-8000-000000000103', 'fun-3', NULL, 'funny', 'If we were recruited for a heist, which one of us is getting caught first and what ridiculous mistake caused it?', NULL, false),
  ('00000000-0000-4000-8000-000000000104', 'fun-4', NULL, 'funny', 'What is an irrational, trivial pet peeve that you know makes zero sense, but drives you crazy anyway?', NULL, false),

  ('00000000-0000-4000-8000-000000000105', 'rom-1', NULL, 'romantic', 'What was the exact moment or look from me that first made you realize you had feelings for me?', NULL, false),
  ('00000000-0000-4000-8000-000000000106', 'rom-2', NULL, 'romantic', 'If you had to describe the feeling of our relationship in three distinct sensory memories, what would they be?', NULL, false),
  ('00000000-0000-4000-8000-000000000107', 'rom-3', NULL, 'romantic', 'What is a quiet, unspoken gesture I do that always makes you feel deeply loved without saying a word?', NULL, false),
  ('00000000-0000-4000-8000-000000000108', 'rom-4', NULL, 'romantic', 'If we could freeze one exact hour from our past to relive whenever we want, which hour are you picking?', NULL, false),

  ('00000000-0000-4000-8000-000000000109', 'per-1', NULL, 'personal', 'What is an emotional insecurity you rarely talk about because you feel you should have outgrown it by now?', NULL, false),
  ('00000000-0000-4000-8000-000000000110', 'per-2', NULL, 'personal', 'How has your definition of a successful, peaceful life changed over the last three years?', NULL, false),
  ('00000000-0000-4000-8000-000000000111', 'per-3', NULL, 'personal', 'When you look at yourself in the mirror during quiet moments, what part of your heart are you proudest of?', NULL, false),
  ('00000000-0000-4000-8000-000000000112', 'per-4', NULL, 'personal', 'What is something you wish people understood about you without you having to explain it?', NULL, false),

  ('00000000-0000-4000-8000-000000000113', 'chi-1', NULL, 'childhood', 'What was your favourite safe hiding spot or comforting refuge when you were little?', NULL, false),
  ('00000000-0000-4000-8000-000000000114', 'chi-2', NULL, 'childhood', 'What was a belief or misconception you held as a young child that is hilarious to remember now?', NULL, false),
  ('00000000-0000-4000-8000-000000000115', 'chi-3', NULL, 'childhood', 'Who was the first teacher or adult outside your family that truly made you feel smart and worthy?', NULL, false),

  ('00000000-0000-4000-8000-000000000116', 'int-1', NULL, 'intellectual', 'Do you believe human beings are inherently wired for cooperation, or is empathy a fragile cultural achievement?', NULL, false),
  ('00000000-0000-4000-8000-000000000117', 'int-2', NULL, 'intellectual', 'If you could know the absolute, definitive truth to one unsolved mystery of the universe or history, what would you ask?', NULL, false),
  ('00000000-0000-4000-8000-000000000118', 'int-3', NULL, 'intellectual', 'What is an intellectual opinion or belief you used to hold passionately, but completely changed your mind about?', NULL, false),

  ('00000000-0000-4000-8000-000000000119', 'hyp-1', NULL, 'hypothetical', 'If we could pause time for the rest of the world for 7 days, what would we do with those private 168 hours?', NULL, false),
  ('00000000-0000-4000-8000-000000000120', 'hyp-2', NULL, 'hypothetical', 'If we were given a small, secluded house anywhere on Earth where nobody could ever disturb us, where would it stand?', NULL, false),
  ('00000000-0000-4000-8000-000000000121', 'hyp-3', NULL, 'hypothetical', 'If you could download one master-level skill into your brain in an instant, what would you choose?', NULL, false),

  ('00000000-0000-4000-8000-000000000122', 'fut-1', NULL, 'future', 'When we are 70 years old, sitting on a porch watching the sunset, what do you think we will laugh about the most?', NULL, false),
  ('00000000-0000-4000-8000-000000000123', 'fut-2', NULL, 'future', 'What is a dream or project you want us to accomplish together that feels slightly terrifying but thrilling?', NULL, false),
  ('00000000-0000-4000-8000-000000000124', 'fut-3', NULL, 'future', 'What kind of home atmosphere do you want us to have ten years from now?', NULL, false),

  ('00000000-0000-4000-8000-000000000125', 'itm-1', NULL, 'intimacy', 'What is something sweet, subtle, or intimate you love when I do, but you’ve never specifically told me?', NULL, false),
  ('00000000-0000-4000-8000-000000000126', 'itm-2', NULL, 'intimacy', 'When during the day or week do you feel closest to me emotionally?', NULL, false),
  ('00000000-0000-4000-8000-000000000127', 'itm-3', NULL, 'intimacy', 'What does unconditional acceptance feel like in your body when we hold each other?', NULL, false),

  -- Game Templates Seed Questions
  ('00000000-0000-4000-8000-000000000201', 'q1', 'game-trivia-01', 'couple_trivia', 'What was the exact meal or drink we shared on our very first meaningful date?', NULL, false),
  ('00000000-0000-4000-8000-000000000202', 'q2', 'game-trivia-01', 'couple_trivia', 'When I am having a rough day, what is the single comfort food or action that soothes me fastest?', NULL, false),
  ('00000000-0000-4000-8000-000000000203', 'q3', 'game-trivia-01', 'couple_trivia', 'Which song or melody instantly transports you back to a specific moment with me?', NULL, false),
  ('00000000-0000-4000-8000-000000000204', 'q4', 'game-trivia-01', 'couple_trivia', 'What is my most ridiculous, endearing everyday habit that always makes you smile?', NULL, false),
  ('00000000-0000-4000-8000-000000000205', 'q5', 'game-trivia-01', 'couple_trivia', 'Where in the world were we when we shared our most unexpected, uncontrollable fit of laughter?', NULL, false),

  ('00000000-0000-4000-8000-000000000206', 'wyr-1', 'game-wyr-01', 'would_you_rather', 'Would you rather spend an entire rainy Sunday reading aloud in bed or baking an ambitious pastry together from scratch?', '["Reading aloud under warm blankets","Baking pastries in the warm kitchen"]'::jsonb, false),
  ('00000000-0000-4000-8000-000000000207', 'wyr-2', 'game-wyr-01', 'would_you_rather', 'Would you rather receive a handwritten 4-page love letter or an unannounced surprise weekend getaway to a mountain cabin?', '["Handwritten 4-page love letter","Surprise mountain cabin weekend"]'::jsonb, false),
  ('00000000-0000-4000-8000-000000000208', 'wyr-3', 'game-wyr-01', 'would_you_rather', 'Would you rather have a telepathic connection with each other for 1 hour or reliving our favorite day together on repeat for 24 hours?', '["Telepathic connection for 1 hour","Reliving our favorite day for 24 hours"]'::jsonb, false),
  ('00000000-0000-4000-8000-000000000209', 'wyr-4', 'game-wyr-01', 'would_you_rather', 'Would you rather star-gaze in complete silence in the desert or have a 3 AM deep conversation over midnight tea?', '["Star-gaze in silent awe","3 AM deep midnight tea conversation"]'::jsonb, false),

  ('00000000-0000-4000-8000-000000000210', 'c1', 'game-compat-01', 'compatibility', 'When I feel misunderstood during a disagreement, the best thing you can do is:', '["Give me 10 minutes of quiet space, then return gently","Hold my hands and reassure me you still love me first","Ask thoughtful questions to help me articulate what I feel","Make us a warm drink and suggest a fresh start"]'::jsonb, false),
  ('00000000-0000-4000-8000-000000000211', 'c2', 'game-compat-01', 'compatibility', 'I feel most cherished and safe when you:', '["Notice small details about my day without me asking","Give unhurried, gentle physical affection","Tell me specifically why you admire who I am","Take care of a stressful chore so I can rest"]'::jsonb, false),
  ('00000000-0000-4000-8000-000000000212', 'c3', 'game-compat-01', 'compatibility', 'Our ideal low-stress Friday evening involves:', '["Zero devices, ambient jazz, and candlelit conversation","Ordering our favorite comfort takeout and watching a thoughtful film","A long twilight walk through quiet neighborhoods","Cooking an elaborate dinner together with wine or tea"]'::jsonb, false),
  ('00000000-0000-4000-8000-000000000213', 'c4', 'game-compat-01', 'compatibility', 'The highest virtue in our shared relationship is:', '["Emotional honesty without fear of judgement","Unconditional loyalty and dependability","Playful laughter and keeping life lighthearted","Mutual growth and inspiring each other"]'::jsonb, false),

  ('00000000-0000-4000-8000-000000000214', 'tod-1', 'game-tod-01', 'truth_or_dare', 'Truth: What was the exact moment you realized you had completely fallen for me?', NULL, false),
  ('00000000-0000-4000-8000-000000000215', 'tod-2', 'game-tod-01', 'truth_or_dare', 'Dare: Send a 15-second voice note describing 3 physical details about me that take your breath away.', NULL, false),
  ('00000000-0000-4000-8000-000000000216', 'tod-3', 'game-tod-01', 'truth_or_dare', 'Truth: What is one secret romantic fantasy or dream trip you’ve been shy to mention?', NULL, false),
  ('00000000-0000-4000-8000-000000000217', 'tod-4', 'game-tod-01', 'truth_or_dare', 'Dare: Close your eyes right now for 30 seconds and write the first sentence that comes to your mind when you think of us.', NULL, false)
ON CONFLICT (slug) DO NOTHING;

-- ─── 6. Supabase Realtime Publication ─────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE game_answers; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE space_moods; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE call_sessions; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE daily_question_answers; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

