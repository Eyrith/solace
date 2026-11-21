/**
 * Supabase Database Types — Project00
 *
 * Generated manually from docs/database-schema.md.
 * Run `supabase gen types typescript` to regenerate from live schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Enums ───────────────────────────────────────────────────────────────────

export type ColorMode = 'light' | 'dark' | 'system'
export type FontScale = 'sm' | 'md' | 'lg' | 'xl'
export type Density = 'compact' | 'comfortable' | 'spacious'
export type BubbleStyle = 'soft' | 'editorial' | 'pill' | 'minimal'

export type MessageType = 'text' | 'image' | 'video' | 'voice' | 'system'
export type ExpiresMode =
  | 'never'
  | 'just_seen'
  | '1_second'
  | '5_minutes'
  | '1_hour'
  | '24_hours'
  | 'custom'

export type SpaceRole = 'owner' | 'member'

export type GameType =
  | 'couple_trivia'
  | 'compatibility'
  | 'would_you_rather'
  | 'guess_partner'
  | 'truth_or_dare'
  | 'custom'
  | 'personality'
  | 'memory'
  | 'intellectual'

export type GameStatus = 'waiting' | 'active' | 'revealing' | 'complete'

export type QuestionCategory =
  | 'funny'
  | 'romantic'
  | 'personal'
  | 'childhood'
  | 'intellectual'
  | 'hypothetical'
  | 'future'
  | 'intimacy'
  | 'couple_trivia'
  | 'compatibility'
  | 'would_you_rather'
  | 'truth_or_dare'

export type CallType = 'voice' | 'video'
export type CallStatus = 'ringing' | 'active' | 'ended' | 'missed' | 'declined'
export type LetterStatus = 'draft' | 'scheduled' | 'sent'

// ─── Table Row Types ──────────────────────────────────────────────────────────

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface PrivateSpace {
  id: string
  name: string
  created_by: string
  cover_url: string | null
  created_at: string
  updated_at: string
}

export interface PrivateSpaceMember {
  space_id: string
  user_id: string
  role: SpaceRole
  joined_at: string
}

export interface Invitation {
  id: string
  space_id: string
  created_by: string
  token: string
  expires_at: string
  used_at: string | null
  used_by: string | null
  created_at: string
}

export interface Conversation {
  id: string
  space_id: string
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  space_id: string
  sender_id: string
  content: string | null
  message_type: MessageType
  reply_to_id: string | null
  is_edited: boolean
  edited_at: string | null
  is_deleted: boolean
  deleted_at: string | null
  is_pinned: boolean
  pinned_at: string | null
  pinned_by: string | null
  expires_mode: ExpiresMode
  expires_duration: string | null  // PostgreSQL interval as string
  expires_at: string | null
  created_at: string
}

export interface MessageReceipt {
  message_id: string
  user_id: string
  delivered_at: string
  viewed_at: string | null
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface MessageAttachment {
  id: string
  message_id: string
  storage_path: string
  mime_type: string
  file_size_bytes: number
  duration_ms: number | null
  width: number | null
  height: number | null
  thumbnail_path: string | null
  created_at: string
}

export interface QuestionLibraryItem {
  id: string
  slug: string | null
  game_template_id: string | null
  category: QuestionCategory
  content: string
  options: string[] | null
  is_custom: boolean
  created_by: string | null
  space_id: string | null
  created_at: string
}

export interface DailyQuestion {
  id: string
  space_id: string
  question_id: string
  date: string  // ISO date string (YYYY-MM-DD)
  created_at: string
}

export interface DailyQuestionAnswer {
  id: string
  daily_question_id: string
  space_id: string
  user_id: string
  answer: string
  submitted_at: string
}

export interface SpaceMood {
  id: string
  space_id: string
  user_id: string
  mood: string
  updated_at: string
}

export interface GameSession {
  id: string
  space_id: string
  game_type: GameType
  status: GameStatus
  question_ids: string[]
  current_q_idx: number
  scores: Record<string, number>
  started_at: string | null
  completed_at: string | null
  created_by: string
  created_at: string
}

export interface GameAnswer {
  id: string
  session_id: string
  question_id: string
  user_id: string
  answer: string
  submitted_at: string
}

export interface Memory {
  id: string
  space_id: string
  created_by: string
  title: string
  content: string | null
  memory_date: string | null
  media_paths: string[]
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Letter {
  id: string
  space_id: string
  author_id: string
  subject: string
  body: string
  status: LetterStatus
  scheduled_for: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id: string
  space_id: string
  created_by: string
  title: string
  description: string | null
  event_date: string
  event_time: string | null
  is_recurring: boolean
  recurrence_rule: string | null
  is_anniversary: boolean
  reminder_days: number[]
  created_at: string
}

export interface BucketListItem {
  id: string
  space_id: string
  created_by: string
  title: string
  description: string | null
  is_completed: boolean
  completed_at: string | null
  completed_by: string | null
  created_at: string
}

export interface SharedNote {
  id: string
  space_id: string
  created_by: string
  title: string
  content: string
  is_shared: boolean
  created_at: string
  updated_at: string
}

export interface EditorialSource {
  id: string
  name: string
  slug: string
  description: string | null
  website_url: string
  rss_url: string | null
  logo_url: string | null
  accent_color: string | null
  is_active: boolean
  last_synced: string | null
  created_at: string
}

export interface EditorialArticle {
  id: string
  source_id: string
  external_id: string
  title: string
  author: string | null
  excerpt: string | null
  original_url: string
  og_image_url: string | null
  category: string | null
  tags: string[]
  reading_time_min: number | null
  published_at: string | null
  ingested_at: string
}

export interface SavedArticle {
  user_id: string
  article_id: string
  saved_at: string
}

export interface ReadingHistoryEntry {
  id: string
  user_id: string
  article_id: string
  read_at: string
}

export interface UserPreferences {
  user_id: string
  palette: string
  color_mode: ColorMode
  font_pairing: string
  font_scale: FontScale
  density: Density
  bubble_style: BubbleStyle
  chat_background: string
  reduced_motion: boolean
  discreet_notifs: boolean
  sound_enabled: boolean
  call_alerts: boolean
  reading_history_enabled: boolean
  updated_at: string
}

export interface CallSession {
  id: string
  space_id: string
  initiator_id: string
  call_type: CallType
  status: CallStatus
  livekit_room: string | null
  started_at: string | null
  ended_at: string | null
  duration_sec: number | null
  created_at: string
}

// ─── Composite / Joined Types (used by queries) ───────────────────────────────

/** Message with sender profile and optional attachments */
export interface MessageWithDetails extends Message {
  sender: Profile
  reply_to?: Message & { sender: Profile } | null
  attachments: MessageAttachment[]
  reactions: MessageReaction[]
  receipt?: MessageReceipt | null
}

/** Article with its source details */
export interface ArticleWithSource extends EditorialArticle {
  source: EditorialSource
}

/** Space with both member profiles */
export interface SpaceWithMembers extends PrivateSpace {
  members: Array<PrivateSpaceMember & { profile: Profile }>
}

// ─── Default Values ───────────────────────────────────────────────────────────

export const DEFAULT_USER_PREFERENCES: Omit<UserPreferences, 'user_id' | 'updated_at'> = {
  palette: 'ivory',
  color_mode: 'light',
  font_pairing: 'editorial-1',
  font_scale: 'md',
  density: 'comfortable',
  bubble_style: 'soft',
  chat_background: 'none',
  reduced_motion: false,
  discreet_notifs: true,
  sound_enabled: true,
  call_alerts: true,
  reading_history_enabled: false,
}

