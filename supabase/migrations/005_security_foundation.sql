-- =============================================================================
-- Migration: 005_security_foundation
-- Solace Phase 1 — fix RLS recursion, close profile enumeration, add roles,
-- audit events, and the shared conversation-participant substrate.
--
-- SECURITY MODEL
-- 1. Membership/participant checks are performed by SECURITY DEFINER helper
--    functions. This avoids recursive RLS policies (the cause of the live
--    `42P17` failures) and keeps policy expressions readable.
-- 2. Helpers are owned by the migration role (postgres), which bypasses RLS.
--    They are explicitly revoked from PUBLIC and granted only to authenticated.
-- 3. Profiles are no longer globally readable. A user can read their own
--    profile and the profiles of people they share a space or conversation with.
-- 4. Service-role access remains server-only and is never used by the browser.
-- =============================================================================

begin;

-- ─── 1. Roles and audit ──────────────────────────────────────────────────────

create table if not exists public.user_roles (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null check (role in ('reader', 'student', 'editor', 'admin')),
  granted_by  uuid references public.profiles(id) on delete set null,
  granted_at  timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.user_roles enable row level security;

create index if not exists idx_user_roles_user_id on public.user_roles (user_id);
create index if not exists idx_user_roles_role on public.user_roles (role);

create table if not exists public.audit_events (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   uuid,
  metadata    jsonb not null default '{}'::jsonb,
  ip_hash     text,
  created_at  timestamptz not null default now()
);

alter table public.audit_events enable row level security;

create index if not exists idx_audit_events_created_at on public.audit_events (created_at desc);
create index if not exists idx_audit_events_actor_id on public.audit_events (actor_id);

-- 001 used encode(..., 'base64url'), which PostgreSQL does not implement.
-- The table was created, but every invitation insert would fail at runtime.
-- Hex is URL-safe and preserves 256 bits of entropy.
alter table public.invitations
  alter column token set default encode(gen_random_bytes(32), 'hex');

-- ─── 2. Conversation participants ───────────────────────────────────────────
-- Created before the helper functions below, which query it. Creating the
-- table after a SQL-language function that references it would fail because
-- PostgreSQL validates SQL function bodies at definition time.

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  role            text not null default 'member' check (role in ('owner', 'member')),
  joined_at       timestamptz not null default now(),
  last_read_at    timestamptz,
  muted_at        timestamptz,
  left_at         timestamptz,
  primary key (conversation_id, user_id)
);

alter table public.conversation_participants enable row level security;

create index if not exists idx_conversation_participants_user_id
  on public.conversation_participants (user_id);
create index if not exists idx_conversation_participants_conversation_id
  on public.conversation_participants (conversation_id);

-- ─── 3. Access helpers ───────────────────────────────────────────────────────

create or replace function public.is_space_member(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.private_space_members
    where space_id = p_space_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_space_owner(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.private_space_members
    where space_id = p_space_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.conversation_participants
    where conversation_id = p_conversation_id
      and user_id = auth.uid()
      and left_at is null
  )
  or exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and c.space_id is not null
      and public.is_space_member(c.space_id)
  );
$$;

create or replace function public.can_read_message(p_message_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.messages m
    where m.id = p_message_id
      and m.is_deleted = false
      and (m.expires_at is null or m.expires_at > now())
      and public.is_conversation_participant(m.conversation_id)
  );
$$;

create or replace function public.can_view_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_profile_id = auth.uid()
  or exists (
    select 1
    from public.private_space_members me
    join public.private_space_members them on them.space_id = me.space_id
    where me.user_id = auth.uid()
      and them.user_id = p_profile_id
  )
  or exists (
    select 1
    from public.conversation_participants me
    join public.conversation_participants them
      on them.conversation_id = me.conversation_id
    where me.user_id = auth.uid()
      and them.user_id = p_profile_id
      and me.left_at is null
      and them.left_at is null
  );
$$;

create or replace function public.has_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = p_role
  );
$$;

create or replace function public.can_access_game_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.game_sessions
    where id = p_session_id
      and public.is_space_member(space_id)
  );
$$;

create or replace function public.is_game_session_revealed(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.game_sessions
    where id = p_session_id
      and status in ('revealing', 'complete')
  );
$$;

revoke all on function public.is_space_member(uuid) from public;
revoke all on function public.is_space_owner(uuid) from public;
revoke all on function public.is_conversation_participant(uuid) from public;
revoke all on function public.can_read_message(uuid) from public;
revoke all on function public.can_view_profile(uuid) from public;
revoke all on function public.has_role(text) from public;
revoke all on function public.can_access_game_session(uuid) from public;
revoke all on function public.is_game_session_revealed(uuid) from public;

grant execute on function public.is_space_member(uuid) to authenticated;
grant execute on function public.is_space_owner(uuid) to authenticated;
grant execute on function public.is_conversation_participant(uuid) to authenticated;
grant execute on function public.can_read_message(uuid) to authenticated;
grant execute on function public.can_view_profile(uuid) to authenticated;
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.can_access_game_session(uuid) to authenticated;
grant execute on function public.is_game_session_revealed(uuid) to authenticated;
grant execute on function public.is_space_member(uuid) to service_role;
grant execute on function public.is_space_owner(uuid) to service_role;
grant execute on function public.is_conversation_participant(uuid) to service_role;
grant execute on function public.can_read_message(uuid) to service_role;
grant execute on function public.can_view_profile(uuid) to service_role;
grant execute on function public.has_role(text) to service_role;
grant execute on function public.can_access_game_session(uuid) to service_role;
grant execute on function public.is_game_session_revealed(uuid) to service_role;

-- ─── 4. Default reader role ─────────────────────────────────────────────────

create or replace function public.assign_default_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'reader')
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;

drop trigger if exists assign_default_role_on_profile on public.profiles;
create trigger assign_default_role_on_profile
  after insert on public.profiles
  for each row execute function public.assign_default_role();

insert into public.user_roles (user_id, role)
select id, 'reader' from public.profiles
on conflict (user_id, role) do nothing;

-- ─── 5. Conversation metadata and legacy backfill ───────────────────────────

alter table public.conversations
  add column if not exists kind text not null default 'direct'
    check (kind in ('direct', 'group', 'discourse')),
  add column if not exists title text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists context_type text
    check (context_type in ('article', 'lesson', 'assignment', 'note')),
  add column if not exists context_id uuid;

-- Legacy spaces remain a valid conversation container, but new conversations
-- may be direct/group/discourse threads without a private_space.
alter table public.conversations alter column space_id drop not null;
alter table public.messages alter column space_id drop not null;

-- Backfill participants for any existing legacy conversations.
insert into public.conversation_participants (conversation_id, user_id, role)
select c.id, psm.user_id, psm.role
from public.conversations c
join public.private_space_members psm on psm.space_id = c.space_id
on conflict (conversation_id, user_id) do nothing;

-- A message must never point at a conversation in a different space. The old
-- RLS policy checked space membership independently of conversation_id, which
-- allowed inconsistent records. Derive the legacy space from the conversation
-- and reject mismatches.
create or replace function public.enforce_message_conversation_space()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_space_id uuid;
begin
  select space_id into v_space_id
  from public.conversations
  where id = new.conversation_id;

  if not found then
    raise exception 'Conversation does not exist';
  end if;

  if v_space_id is null then
    if new.space_id is not null then
      raise exception 'Message space_id must be null for a space-less conversation';
    end if;
  else
    if new.space_id is not null and new.space_id is distinct from v_space_id then
      raise exception 'Message space_id does not match its conversation';
    end if;
    new.space_id := v_space_id;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_message_conversation_space on public.messages;
create trigger enforce_message_conversation_space
  before insert or update of conversation_id, space_id on public.messages
  for each row execute function public.enforce_message_conversation_space();

create or replace function public.sync_conversation_participants_for_space()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.conversation_participants (conversation_id, user_id, role)
  select c.id, new.user_id, new.role
  from public.conversations c
  where c.space_id = new.space_id
  on conflict (conversation_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists sync_conversation_participants_on_member on public.private_space_members;
create trigger sync_conversation_participants_on_member
  after insert on public.private_space_members
  for each row execute function public.sync_conversation_participants_for_space();

create or replace function public.sync_conversation_participants_for_conversation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.space_id is not null then
    insert into public.conversation_participants (conversation_id, user_id, role)
    select new.id, psm.user_id, psm.role
    from public.private_space_members psm
    where psm.space_id = new.space_id
    on conflict (conversation_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_conversation_participants_on_conversation on public.conversations;
create trigger sync_conversation_participants_on_conversation
  after insert on public.conversations
  for each row execute function public.sync_conversation_participants_for_conversation();

-- ─── 6. Replace recursive / over-broad policies ─────────────────────────────

-- profiles: self + people you already share a space or conversation with.
drop policy if exists "profiles_read" on public.profiles;
drop policy if exists "profiles_visible_read" on public.profiles;
create policy "profiles_visible_read" on public.profiles
  for select using (public.can_view_profile(id));

-- private_spaces
drop policy if exists "spaces_member_read" on public.private_spaces;
create policy "spaces_member_read" on public.private_spaces
  for select using (public.is_space_member(id));

-- private_space_members: own row, plus co-members of spaces you belong to.
drop policy if exists "members_space_read" on public.private_space_members;
create policy "members_space_read" on public.private_space_members
  for select using (
    user_id = auth.uid()
    or public.is_space_member(space_id)
  );

-- invitations
drop policy if exists "invitations_owner_insert" on public.invitations;
create policy "invitations_owner_insert" on public.invitations
  for insert with check (
    created_by = auth.uid()
    and public.is_space_owner(space_id)
  );

-- conversations
drop policy if exists "conversations_member_read" on public.conversations;
drop policy if exists "conversations_participant_read" on public.conversations;
create policy "conversations_participant_read" on public.conversations
  for select using (public.is_conversation_participant(id));

-- conversation participants: visible to participants only.
drop policy if exists "conversation_participants_read" on public.conversation_participants;
create policy "conversation_participants_read" on public.conversation_participants
  for select using (public.is_conversation_participant(conversation_id));

-- messages
drop policy if exists "messages_member_read" on public.messages;
create policy "messages_member_read" on public.messages
  for select using (
    public.is_conversation_participant(conversation_id)
    and (expires_at is null or expires_at > now())
    and is_deleted = false
  );

drop policy if exists "messages_member_insert" on public.messages;
create policy "messages_member_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
    and (space_id is null or public.is_space_member(space_id))
  );

drop policy if exists "messages_sender_update" on public.messages;
create policy "messages_sender_update" on public.messages
  for update using (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
  );

-- receipts / reactions / attachments
drop policy if exists "receipts_member_read" on public.message_receipts;
create policy "receipts_member_read" on public.message_receipts
  for select using (public.can_read_message(message_id));

drop policy if exists "reactions_member_read" on public.message_reactions;
create policy "reactions_member_read" on public.message_reactions
  for select using (public.can_read_message(message_id));

drop policy if exists "reactions_member_insert" on public.message_reactions;
create policy "reactions_member_insert" on public.message_reactions
  for insert with check (
    user_id = auth.uid()
    and public.can_read_message(message_id)
  );

drop policy if exists "attachments_member_read" on public.message_attachments;
create policy "attachments_member_read" on public.message_attachments
  for select using (public.can_read_message(message_id));

drop policy if exists "attachments_member_insert" on public.message_attachments;
create policy "attachments_member_insert" on public.message_attachments
  for insert with check (public.can_read_message(message_id));

-- games
drop policy if exists "game_sessions_member_read" on public.game_sessions;
create policy "game_sessions_member_read" on public.game_sessions
  for select using (public.is_space_member(space_id));

drop policy if exists "game_sessions_member_insert" on public.game_sessions;
create policy "game_sessions_member_insert" on public.game_sessions
  for insert with check (
    created_by = auth.uid()
    and public.is_space_member(space_id)
  );

drop policy if exists "game_sessions_member_update" on public.game_sessions;
create policy "game_sessions_member_update" on public.game_sessions
  for update using (public.is_space_member(space_id));

drop policy if exists "answers_member_insert" on public.game_answers;
create policy "answers_member_insert" on public.game_answers
  for insert with check (
    user_id = auth.uid()
    and public.can_access_game_session(session_id)
  );

drop policy if exists "answers_reveal_read" on public.game_answers;
create policy "answers_reveal_read" on public.game_answers
  for select using (
    public.can_access_game_session(session_id)
    and public.is_game_session_revealed(session_id)
  );

-- question library
drop policy if exists "library_global_read" on public.question_library;
create policy "library_global_read" on public.question_library
  for select using (
    is_custom = false
    or (is_custom = true and public.is_space_member(space_id))
  );

drop policy if exists "library_custom_insert" on public.question_library;
create policy "library_custom_insert" on public.question_library
  for insert with check (
    is_custom = true
    and created_by = auth.uid()
    and public.is_space_member(space_id)
  );

-- daily questions
drop policy if exists "daily_q_member_read" on public.daily_questions;
create policy "daily_q_member_read" on public.daily_questions
  for select using (public.is_space_member(space_id));

drop policy if exists "daily_answers_blind_reveal_read" on public.daily_question_answers;
create policy "daily_answers_blind_reveal_read" on public.daily_question_answers
  for select using (
    public.is_space_member(space_id)
    and (
      user_id = auth.uid()
      or public.is_daily_question_revealed(daily_question_id)
    )
  );

drop policy if exists "daily_answers_own_insert" on public.daily_question_answers;
create policy "daily_answers_own_insert" on public.daily_question_answers
  for insert with check (
    user_id = auth.uid()
    and public.is_space_member(space_id)
  );

drop policy if exists "daily_answers_own_update" on public.daily_question_answers;
create policy "daily_answers_own_update" on public.daily_question_answers
  for update using (
    user_id = auth.uid()
    and public.is_space_member(space_id)
  );

-- memories
drop policy if exists "memories_member_read" on public.memories;
create policy "memories_member_read" on public.memories
  for select using (public.is_space_member(space_id));

drop policy if exists "memories_member_insert" on public.memories;
create policy "memories_member_insert" on public.memories
  for insert with check (
    created_by = auth.uid()
    and public.is_space_member(space_id)
  );

drop policy if exists "memories_author_update" on public.memories;
create policy "memories_author_update" on public.memories
  for update using (
    created_by = auth.uid()
    and public.is_space_member(space_id)
  );

drop policy if exists "memories_author_delete" on public.memories;
create policy "memories_author_delete" on public.memories
  for delete using (
    created_by = auth.uid()
    and public.is_space_member(space_id)
  );

-- calendar
drop policy if exists "cal_member_read" on public.calendar_events;
create policy "cal_member_read" on public.calendar_events
  for select using (public.is_space_member(space_id));

drop policy if exists "cal_member_insert" on public.calendar_events;
create policy "cal_member_insert" on public.calendar_events
  for insert with check (
    created_by = auth.uid()
    and public.is_space_member(space_id)
  );

drop policy if exists "cal_author_update" on public.calendar_events;
create policy "cal_author_update" on public.calendar_events
  for update using (
    created_by = auth.uid()
    and public.is_space_member(space_id)
  );

drop policy if exists "cal_author_delete" on public.calendar_events;
create policy "cal_author_delete" on public.calendar_events
  for delete using (
    created_by = auth.uid()
    and public.is_space_member(space_id)
  );

-- bucket list
drop policy if exists "bucket_member_read" on public.bucket_list_items;
create policy "bucket_member_read" on public.bucket_list_items
  for select using (public.is_space_member(space_id));

drop policy if exists "bucket_member_insert" on public.bucket_list_items;
create policy "bucket_member_insert" on public.bucket_list_items
  for insert with check (
    created_by = auth.uid()
    and public.is_space_member(space_id)
  );

drop policy if exists "bucket_member_update" on public.bucket_list_items;
create policy "bucket_member_update" on public.bucket_list_items
  for update using (
    public.is_space_member(space_id)
    and (
      created_by = auth.uid()
      or completed_by = auth.uid()
    )
  );

drop policy if exists "bucket_author_delete" on public.bucket_list_items;
create policy "bucket_author_delete" on public.bucket_list_items
  for delete using (
    created_by = auth.uid()
    and public.is_space_member(space_id)
  );

-- letters
drop policy if exists "letters_read" on public.letters;
create policy "letters_read" on public.letters
  for select using (
    (status = 'draft' and author_id = auth.uid())
    or (status in ('scheduled', 'sent') and public.is_space_member(space_id))
  );

drop policy if exists "letters_author_insert" on public.letters;
create policy "letters_author_insert" on public.letters
  for insert with check (
    author_id = auth.uid()
    and public.is_space_member(space_id)
  );

drop policy if exists "letters_author_update" on public.letters;
create policy "letters_author_update" on public.letters
  for update using (
    author_id = auth.uid()
    and public.is_space_member(space_id)
  );

drop policy if exists "letters_author_delete" on public.letters;
create policy "letters_author_delete" on public.letters
  for delete using (
    author_id = auth.uid()
    and public.is_space_member(space_id)
  );

-- shared notes
drop policy if exists "notes_read" on public.shared_notes;
create policy "notes_read" on public.shared_notes
  for select using (
    (is_shared = false and created_by = auth.uid())
    or (is_shared = true and public.is_space_member(space_id))
  );

drop policy if exists "notes_insert" on public.shared_notes;
create policy "notes_insert" on public.shared_notes
  for insert with check (
    created_by = auth.uid()
    and public.is_space_member(space_id)
  );

drop policy if exists "notes_update" on public.shared_notes;
create policy "notes_update" on public.shared_notes
  for update using (
    created_by = auth.uid()
    and public.is_space_member(space_id)
  );

drop policy if exists "notes_delete" on public.shared_notes;
create policy "notes_delete" on public.shared_notes
  for delete using (
    created_by = auth.uid()
    and public.is_space_member(space_id)
  );

-- calls
drop policy if exists "calls_member_read" on public.call_sessions;
create policy "calls_member_read" on public.call_sessions
  for select using (public.is_space_member(space_id));

-- matrix links / rooms / media timers
drop policy if exists "matrix_links_member_read" on public.matrix_user_links;
create policy "matrix_links_member_read" on public.matrix_user_links
  for select using (
    user_id = auth.uid()
    or public.can_view_profile(user_id)
  );

drop policy if exists "space_matrix_rooms_member_read" on public.space_matrix_rooms;
create policy "space_matrix_rooms_member_read" on public.space_matrix_rooms
  for select using (public.is_space_member(space_id));

drop policy if exists "ephemeral_media_timers_member_read" on public.ephemeral_media_timers;
create policy "ephemeral_media_timers_member_read" on public.ephemeral_media_timers
  for select using (public.is_space_member(space_id));

drop policy if exists "ephemeral_media_timers_member_insert" on public.ephemeral_media_timers;
create policy "ephemeral_media_timers_member_insert" on public.ephemeral_media_timers
  for insert with check (public.is_space_member(space_id));

-- space moods
drop policy if exists "space_moods_member_read" on public.space_moods;
create policy "space_moods_member_read" on public.space_moods
  for select using (public.is_space_member(space_id));

drop policy if exists "space_moods_own_insert" on public.space_moods;
create policy "space_moods_own_insert" on public.space_moods
  for insert with check (
    user_id = auth.uid()
    and public.is_space_member(space_id)
  );

drop policy if exists "space_moods_own_update" on public.space_moods;
create policy "space_moods_own_update" on public.space_moods
  for update using (
    user_id = auth.uid()
    and public.is_space_member(space_id)
  );

drop policy if exists "space_moods_own_delete" on public.space_moods;
create policy "space_moods_own_delete" on public.space_moods
  for delete using (
    user_id = auth.uid()
    and public.is_space_member(space_id)
  );

-- ─── 7. Roles / audit policies ──────────────────────────────────────────────

drop policy if exists "user_roles_self_read" on public.user_roles;
create policy "user_roles_self_read" on public.user_roles
  for select using (
    user_id = auth.uid()
    or public.has_role('admin')
  );

drop policy if exists "user_roles_admin_write" on public.user_roles;
create policy "user_roles_admin_write" on public.user_roles
  for all using (public.has_role('admin'))
  with check (public.has_role('admin'));

drop policy if exists "audit_events_admin_read" on public.audit_events;
create policy "audit_events_admin_read" on public.audit_events
  for select using (public.has_role('admin'));

-- ─── 8. Harden message helpers and viewer ───────────────────────────────────

-- The original helper returned whether two answers existed without checking
-- that the caller belongs to the question's space. That leaked a boolean about
-- another space. Scope it to the caller's own space.
create or replace function public.is_daily_question_revealed(p_daily_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.daily_questions dq
    where dq.id = p_daily_question_id
      and public.is_space_member(dq.space_id)
  )
  and (
    select count(distinct a.user_id) >= 2
    from public.daily_question_answers a
    where a.daily_question_id = p_daily_question_id
  );
$$;

revoke all on function public.is_daily_question_revealed(uuid) from public;
grant execute on function public.is_daily_question_revealed(uuid) to authenticated;
grant execute on function public.is_daily_question_revealed(uuid) to service_role;

create or replace function public.mark_message_viewed(
  p_message_id uuid,
  p_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expires_mode     text;
  v_expires_duration interval;
  v_new_expires_at   timestamptz;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Access denied';
  end if;

  if not public.can_read_message(p_message_id) then
    raise exception 'Access denied';
  end if;

  insert into public.message_receipts (message_id, user_id, viewed_at)
  values (p_message_id, p_user_id, now())
  on conflict (message_id, user_id)
  do update set viewed_at = least(public.message_receipts.viewed_at, excluded.viewed_at);

  select expires_mode, expires_duration
  into v_expires_mode, v_expires_duration
  from public.messages
  where id = p_message_id;

  v_new_expires_at := case v_expires_mode
    when 'just_seen'  then now()
    when '1_second'   then now() + interval '1 second'
    when '5_minutes'  then now() + interval '5 minutes'
    when '1_hour'     then now() + interval '1 hour'
    when '24_hours'   then now() + interval '24 hours'
    when 'custom'     then now() + v_expires_duration
    else null
  end;

  if v_new_expires_at is not null then
    update public.messages
    set expires_at = v_new_expires_at
    where id = p_message_id
      and (expires_at is null or v_new_expires_at < expires_at);
  end if;
end;
$$;

revoke all on function public.mark_message_viewed(uuid, uuid) from public;
grant execute on function public.mark_message_viewed(uuid, uuid) to authenticated;

-- ─── 9. Safe conversation creation paths ────────────────────────────────────
-- Direct INSERTs into conversations / conversation_participants are intentionally
-- denied. The browser creates conversations through these SECURITY DEFINER
-- functions, which validate the caller, the other participants, and write an
-- audit event. This removes the previous service-role-only creation gap.

create or replace function public.create_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid             uuid := auth.uid();
  v_conversation_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_other_user_id is null or p_other_user_id = v_uid then
    raise exception 'A direct conversation requires another user';
  end if;

  if not exists (select 1 from public.profiles where id = p_other_user_id) then
    raise exception 'Recipient not found';
  end if;

  -- Serialize creation for the pair so concurrent requests cannot create
  -- duplicate direct conversations.
  perform pg_advisory_xact_lock(
    hashtextextended(
      least(v_uid::text, p_other_user_id::text)
        || ':' || greatest(v_uid::text, p_other_user_id::text),
      0
    )
  );

  select c.id
  into v_conversation_id
  from public.conversations c
  join public.conversation_participants me
    on me.conversation_id = c.id
   and me.user_id = v_uid
   and me.left_at is null
  join public.conversation_participants them
    on them.conversation_id = c.id
   and them.user_id = p_other_user_id
   and them.left_at is null
  where c.kind = 'direct'
    and c.space_id is null
    and (
      select count(*)
      from public.conversation_participants cp
      where cp.conversation_id = c.id
        and cp.left_at is null
    ) = 2
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (kind, created_by)
  values ('direct', v_uid)
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id, role)
  values
    (v_conversation_id, v_uid, 'owner'),
    (v_conversation_id, p_other_user_id, 'member');

  insert into public.audit_events (actor_id, action, target_type, target_id, metadata)
  values (
    v_uid,
    'conversation.created',
    'conversation',
    v_conversation_id,
    jsonb_build_object('kind', 'direct')
  );

  return v_conversation_id;
end;
$$;

create or replace function public.create_group_conversation(
  p_title text,
  p_member_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid             uuid := auth.uid();
  v_title           text := btrim(coalesce(p_title, ''));
  v_members         uuid[];
  v_conversation_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if v_title = '' or char_length(v_title) > 120 then
    raise exception 'Group title must be between 1 and 120 characters';
  end if;

  select array_agg(distinct member_id)
  into v_members
  from unnest(coalesce(p_member_ids, '{}'::uuid[])) as member_id
  where member_id is not null;

  v_members := array_remove(coalesce(v_members, '{}'::uuid[]), v_uid);

  if coalesce(array_length(v_members, 1), 0) < 1 then
    raise exception 'A group conversation requires at least one other member';
  end if;

  if array_length(v_members, 1) > 99 then
    raise exception 'A group conversation cannot have more than 100 members';
  end if;

  if exists (
    select 1
    from unnest(v_members) as member_id
    where not exists (select 1 from public.profiles p where p.id = member_id)
  ) then
    raise exception 'One or more members were not found';
  end if;

  insert into public.conversations (kind, title, created_by)
  values ('group', v_title, v_uid)
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id, role)
  select v_conversation_id, v_uid, 'owner'
  union all
  select v_conversation_id, member_id, 'member'
  from unnest(v_members) as member_id;

  insert into public.audit_events (actor_id, action, target_type, target_id, metadata)
  values (
    v_uid,
    'conversation.created',
    'conversation',
    v_conversation_id,
    jsonb_build_object('kind', 'group', 'member_count', array_length(v_members, 1) + 1)
  );

  return v_conversation_id;
end;
$$;

create or replace function public.add_conversation_participant(
  p_conversation_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_kind text;
  v_space_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select kind, space_id
  into v_kind, v_space_id
  from public.conversations
  where id = p_conversation_id;

  if not found then
    raise exception 'Conversation not found';
  end if;

  if v_space_id is not null then
    if not public.is_space_owner(v_space_id) then
      raise exception 'Only a space owner can add participants';
    end if;
  else
    if v_kind <> 'group' then
      raise exception 'Only group conversations support adding participants';
    end if;

    if not exists (
      select 1
      from public.conversation_participants
      where conversation_id = p_conversation_id
        and user_id = v_uid
        and role = 'owner'
        and left_at is null
    ) then
      raise exception 'Only a group owner can add participants';
    end if;
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found';
  end if;

  insert into public.conversation_participants (conversation_id, user_id, role)
  values (p_conversation_id, p_user_id, 'member')
  on conflict (conversation_id, user_id)
  do update set left_at = null, role = 'member';

  insert into public.audit_events (actor_id, action, target_type, target_id, metadata)
  values (
    v_uid,
    'conversation.participant_added',
    'conversation',
    p_conversation_id,
    jsonb_build_object('user_id', p_user_id)
  );
end;
$$;

revoke all on function public.create_direct_conversation(uuid) from public;
revoke all on function public.create_group_conversation(text, uuid[]) from public;
revoke all on function public.add_conversation_participant(uuid, uuid) from public;
grant execute on function public.create_direct_conversation(uuid) to authenticated;
grant execute on function public.create_group_conversation(text, uuid[]) to authenticated;
grant execute on function public.add_conversation_participant(uuid, uuid) to authenticated;

commit;
