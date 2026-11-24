-- =============================================================================
-- Migration: 008_performance_indexes
-- Database Indexing and Supabase Query Optimization
--
-- Adds targeted B-tree and composite indexes on all frequently-queried foreign keys,
-- filtering criteria, ordering clauses, and lookup columns to eliminate sequential scans,
-- optimize RLS evaluation, and minimize query latencies.
-- =============================================================================

BEGIN;

-- ─── 1. Sanctuary Messaging, Spaces & Conversations ──────────────────────────

-- Composite index for the primary messaging query: WHERE conversation_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
  ON public.messages(conversation_id, created_at DESC);

-- Space messaging query: WHERE space_id = ? AND is_deleted = false ORDER BY created_at ASC
CREATE INDEX IF NOT EXISTS idx_messages_space_created 
  ON public.messages(space_id, created_at ASC)
  WHERE is_deleted = false;

-- Sender lookup with created ordering
CREATE INDEX IF NOT EXISTS idx_messages_sender_created 
  ON public.messages(sender_id, created_at DESC);

-- Space members lookups (RLS membership checks and member listing)
CREATE INDEX IF NOT EXISTS idx_private_space_members_user_id 
  ON public.private_space_members(user_id);

CREATE INDEX IF NOT EXISTS idx_private_space_members_space_user 
  ON public.private_space_members(space_id, user_id);

-- Space ownership
CREATE INDEX IF NOT EXISTS idx_private_spaces_created_by 
  ON public.private_spaces(created_by);

-- Conversations space lookup
CREATE INDEX IF NOT EXISTS idx_conversations_space_id 
  ON public.conversations(space_id);

-- Space invitations by code and status
CREATE INDEX IF NOT EXISTS idx_invitations_space_status 
  ON public.invitations(space_id, status);

CREATE INDEX IF NOT EXISTS idx_invitations_code_status 
  ON public.invitations(code, status);

-- Message receipts and reactions
CREATE INDEX IF NOT EXISTS idx_message_receipts_message_user 
  ON public.message_receipts(message_id, user_id);

CREATE INDEX IF NOT EXISTS idx_message_receipts_user_id 
  ON public.message_receipts(user_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_user 
  ON public.message_reactions(message_id, user_id);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id 
  ON public.message_attachments(message_id);

-- ─── 2. Sanctuary Interactive Features ───────────────────────────────────────

-- Moods
CREATE INDEX IF NOT EXISTS idx_space_moods_space_created 
  ON public.space_moods(space_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_space_moods_user_created 
  ON public.space_moods(user_id, created_at DESC);

-- Call sessions
CREATE INDEX IF NOT EXISTS idx_call_sessions_space_created 
  ON public.call_sessions(space_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_call_sessions_status 
  ON public.call_sessions(status);

CREATE INDEX IF NOT EXISTS idx_call_sessions_livekit_room 
  ON public.call_sessions(livekit_room);

-- Game sessions & answers
CREATE INDEX IF NOT EXISTS idx_game_sessions_space_created 
  ON public.game_sessions(space_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_sessions_status 
  ON public.game_sessions(status);

CREATE INDEX IF NOT EXISTS idx_game_answers_session_question 
  ON public.game_answers(session_id, question_id);

CREATE INDEX IF NOT EXISTS idx_game_answers_user_id 
  ON public.game_answers(user_id);

-- Daily questions & answers
CREATE INDEX IF NOT EXISTS idx_daily_questions_space_scheduled 
  ON public.daily_questions(space_id, scheduled_for DESC);

CREATE INDEX IF NOT EXISTS idx_daily_question_answers_question_user 
  ON public.daily_question_answers(daily_question_id, user_id);

-- Question library & saves
CREATE INDEX IF NOT EXISTS idx_question_library_game_template 
  ON public.question_library(game_template_id);

CREATE INDEX IF NOT EXISTS idx_question_library_category 
  ON public.question_library(category);

CREATE INDEX IF NOT EXISTS idx_question_library_slug 
  ON public.question_library(slug);

CREATE INDEX IF NOT EXISTS idx_question_saves_user_question 
  ON public.question_saves(user_id, question_id);

-- Memories, Letters, Calendar & Notes
CREATE INDEX IF NOT EXISTS idx_memories_space_happened 
  ON public.memories(space_id, happened_at DESC);

CREATE INDEX IF NOT EXISTS idx_letters_space_reveal 
  ON public.letters(space_id, reveal_at, is_revealed);

CREATE INDEX IF NOT EXISTS idx_calendar_events_space_start 
  ON public.calendar_events(space_id, start_time ASC);

CREATE INDEX IF NOT EXISTS idx_shared_notes_space_updated 
  ON public.shared_notes(space_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_bucket_list_items_space_status 
  ON public.bucket_list_items(space_id, status);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
  ON public.user_preferences(user_id);

-- ─── 3. Editorial Articles & Reading History ──────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_reading_history_user_read_at 
  ON public.reading_history(user_id, read_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_articles_user_article 
  ON public.saved_articles(user_id, article_id);

CREATE INDEX IF NOT EXISTS idx_editorial_sources_active_name 
  ON public.editorial_sources(is_active, name);

CREATE INDEX IF NOT EXISTS idx_editorial_sources_slug 
  ON public.editorial_sources(slug);

CREATE INDEX IF NOT EXISTS idx_editorial_articles_category_published 
  ON public.editorial_articles(category, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_editorial_articles_source_published 
  ON public.editorial_articles(source_id, published_at DESC);

-- Solace first-party articles
CREATE INDEX IF NOT EXISTS idx_articles_status_published 
  ON public.articles(status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_articles_featured_published 
  ON public.articles(is_featured, published_at DESC) 
  WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_articles_author_id 
  ON public.articles(author_id);

CREATE INDEX IF NOT EXISTS idx_articles_category_status 
  ON public.articles(category_id, status);

CREATE INDEX IF NOT EXISTS idx_article_reading_progress_user 
  ON public.article_reading_progress(user_id, last_read_at DESC);

CREATE INDEX IF NOT EXISTS idx_article_reading_progress_user_article 
  ON public.article_reading_progress(user_id, article_id);

CREATE INDEX IF NOT EXISTS idx_article_tag_mappings_article_tag 
  ON public.article_tag_mappings(article_id, tag_id);

-- ─── 4. Academics, Discourse & Learning Tools ────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_academic_degrees_active_code 
  ON public.academic_degrees(is_active, code);

CREATE INDEX IF NOT EXISTS idx_academic_specialisations_degree 
  ON public.academic_specialisations(degree_id, is_active);

CREATE INDEX IF NOT EXISTS idx_academic_specialisations_slug 
  ON public.academic_specialisations(slug);

CREATE INDEX IF NOT EXISTS idx_academic_semesters_spec 
  ON public.academic_semesters(specialisation_id, semester_number);

CREATE INDEX IF NOT EXISTS idx_academic_subjects_semester 
  ON public.academic_subjects(semester_id, code);

CREATE INDEX IF NOT EXISTS idx_academic_modules_subject 
  ON public.academic_modules(subject_id, module_number);

CREATE INDEX IF NOT EXISTS idx_academic_lessons_module 
  ON public.academic_lessons(module_id, lesson_number);

CREATE INDEX IF NOT EXISTS idx_academic_lessons_slug 
  ON public.academic_lessons(slug);

CREATE INDEX IF NOT EXISTS idx_academic_lesson_progress_user_lesson 
  ON public.academic_lesson_progress(user_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_content_thoughts_user_created 
  ON public.content_thoughts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_thoughts_content 
  ON public.content_thoughts(content_type, content_id, is_private);

CREATE INDEX IF NOT EXISTS idx_discourse_threads_content 
  ON public.discourse_threads(content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_discourse_threads_participants_status 
  ON public.discourse_threads(author_id, recipient_id, status);

CREATE INDEX IF NOT EXISTS idx_discourse_messages_thread_created 
  ON public.discourse_messages(thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_academic_notebooks_user_updated 
  ON public.academic_notebooks(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_academic_notebooks_lesson 
  ON public.academic_notebooks(lesson_id);

CREATE INDEX IF NOT EXISTS idx_academic_quizzes_lesson 
  ON public.academic_quizzes(lesson_id);

CREATE INDEX IF NOT EXISTS idx_academic_quizzes_subject 
  ON public.academic_quizzes(subject_id);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_order 
  ON public.quiz_questions(quiz_id, order_index);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_user 
  ON public.quiz_attempts(quiz_id, user_id);

CREATE INDEX IF NOT EXISTS idx_flashcard_decks_subject 
  ON public.flashcard_decks(subject_id);

CREATE INDEX IF NOT EXISTS idx_flashcards_deck_order 
  ON public.flashcards(deck_id, order_index);

CREATE INDEX IF NOT EXISTS idx_academic_assignments_subject 
  ON public.academic_assignments(subject_id);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assign_user 
  ON public.assignment_submissions(assignment_id, user_id);

COMMIT;
