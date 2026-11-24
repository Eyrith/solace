-- =============================================================================
-- Migration: 006_solace_core_schema
-- Complete schema for Solace: First-Party Articles, Editorial CMS,
-- Academic Learning Hierarchy (B.Tech, BCA, BBA, B.Sc, B.Com, etc.),
-- My Thoughts & Private Discourse with strict RLS,
-- Interactive Academic Tools (Notebook, Quizzes, Flashcards, Assignments).
-- =============================================================================

begin;

-- ─── 0. Security Roles Foundation ─────────────────────────────────────────────

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

revoke all on function public.has_role(text) from public;
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.has_role(text) to service_role;

-- ─── 1. First-Party Editorial & Articles ──────────────────────────────────────

create table if not exists public.article_categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique not null,
  description   text,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_article_categories_slug on public.article_categories(slug);
create index if not exists idx_article_categories_order on public.article_categories(display_order);

create table if not exists public.articles (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text unique not null,
  title                 text not null,
  subtitle              text,
  excerpt               text,
  content               text not null, -- Full Markdown body
  content_html          text,
  cover_image_url       text,
  category_id           uuid references public.article_categories(id) on delete set null,
  author_id             uuid references public.profiles(id) on delete set null,
  status                text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  reading_time_minutes  integer not null default 5,
  is_featured           boolean not null default false,
  published_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_articles_status on public.articles(status);
create index if not exists idx_articles_slug on public.articles(slug);
create index if not exists idx_articles_category on public.articles(category_id);
create index if not exists idx_articles_published_at on public.articles(published_at desc);

create table if not exists public.article_revisions (
  id              uuid primary key default gen_random_uuid(),
  article_id      uuid not null references public.articles(id) on delete cascade,
  title           text not null,
  subtitle        text,
  content         text not null,
  revised_by      uuid references public.profiles(id) on delete set null,
  revision_number integer not null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_article_revisions_article on public.article_revisions(article_id, revision_number desc);

create table if not exists public.article_citations (
  id                uuid primary key default gen_random_uuid(),
  article_id        uuid not null references public.articles(id) on delete cascade,
  citation_order    integer not null default 1,
  prefix            text,
  source_title      text not null,
  author_name       text,
  publication_year  integer,
  url               text,
  doi               text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_article_citations_article on public.article_citations(article_id, citation_order);

create table if not exists public.article_tags (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  slug        text unique not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.article_tag_mappings (
  article_id  uuid not null references public.articles(id) on delete cascade,
  tag_id      uuid not null references public.article_tags(id) on delete cascade,
  primary key (article_id, tag_id)
);

create table if not exists public.article_reading_progress (
  user_id           uuid not null references public.profiles(id) on delete cascade,
  article_id        uuid not null references public.articles(id) on delete cascade,
  scroll_percentage numeric(5,2) not null default 0.00 check (scroll_percentage >= 0 and scroll_percentage <= 100),
  is_completed      boolean not null default false,
  completed_at      timestamptz,
  last_read_at      timestamptz not null default now(),
  primary key (user_id, article_id)
);

-- ─── 2. Academic Learning Hierarchy ──────────────────────────────────────────

create table if not exists public.academic_degrees (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null, -- 'btech', 'bca', 'bba', 'bsc', 'bcom', 'ba', 'bdes'
  title           text not null,
  description     text,
  duration_years  integer not null default 3,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists public.academic_specialisations (
  id              uuid primary key default gen_random_uuid(),
  degree_id       uuid not null references public.academic_degrees(id) on delete cascade,
  slug            text not null,
  title           text not null,
  description     text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (degree_id, slug)
);

create table if not exists public.academic_semesters (
  id                  uuid primary key default gen_random_uuid(),
  specialisation_id   uuid not null references public.academic_specialisations(id) on delete cascade,
  semester_number     integer not null check (semester_number >= 1 and semester_number <= 12),
  title               text not null,
  created_at          timestamptz not null default now(),
  unique (specialisation_id, semester_number)
);

create table if not exists public.academic_subjects (
  id            uuid primary key default gen_random_uuid(),
  semester_id   uuid not null references public.academic_semesters(id) on delete cascade,
  code          text not null, -- 'CS101', 'MTH101'
  title         text not null,
  description   text,
  credits       integer not null default 4,
  order_index   integer not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.academic_modules (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid not null references public.academic_subjects(id) on delete cascade,
  module_number integer not null default 1,
  title         text not null,
  description   text,
  order_index   integer not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.academic_lessons (
  id                          uuid primary key default gen_random_uuid(),
  module_id                   uuid not null references public.academic_modules(id) on delete cascade,
  slug                        text not null,
  title                       text not null,
  content                     text not null, -- Full Markdown body with Math/KaTeX support
  order_index                 integer not null default 0,
  estimated_duration_minutes  integer not null default 30,
  is_published                boolean not null default false,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (module_id, slug)
);

create table if not exists public.academic_lesson_progress (
  user_id           uuid not null references public.profiles(id) on delete cascade,
  lesson_id         uuid not null references public.academic_lessons(id) on delete cascade,
  is_completed      boolean not null default false,
  completed_at      timestamptz,
  last_accessed_at  timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ─── 3. My Thoughts & Private Discourse ──────────────────────────────────────

create table if not exists public.content_thoughts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  content_type          text not null check (content_type in ('article', 'academic_lesson', 'assignment', 'notebook')),
  content_id            uuid not null,
  anchor_text           text,
  anchor_offset_start   integer,
  anchor_offset_end     integer,
  thought_body          text not null,
  tags                  text[] default '{}',
  is_private            boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_content_thoughts_user on public.content_thoughts(user_id);
create index if not exists idx_content_thoughts_content on public.content_thoughts(content_type, content_id);

create table if not exists public.discourse_threads (
  id                uuid primary key default gen_random_uuid(),
  origin_thought_id uuid not null references public.content_thoughts(id) on delete cascade,
  author_id         uuid not null references public.profiles(id) on delete cascade,
  recipient_id      uuid not null references public.profiles(id) on delete cascade,
  content_type      text not null,
  content_id        uuid not null,
  status            text not null default 'active' check (status in ('active', 'concluded', 'revoked')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (author_id != recipient_id)
);

create index if not exists idx_discourse_threads_participants on public.discourse_threads(author_id, recipient_id);
create index if not exists idx_discourse_threads_content on public.discourse_threads(content_type, content_id);

create table if not exists public.discourse_messages (
  id                uuid primary key default gen_random_uuid(),
  thread_id         uuid not null references public.discourse_threads(id) on delete cascade,
  sender_id         uuid not null references public.profiles(id) on delete cascade,
  parent_message_id uuid references public.discourse_messages(id) on delete set null,
  content           text not null,
  created_at        timestamptz not null default now()
);

create index if not exists idx_discourse_messages_thread on public.discourse_messages(thread_id, created_at);

-- ─── 4. Interactive Academic Tools ───────────────────────────────────────────

create table if not exists public.academic_notebooks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  subject_id  uuid references public.academic_subjects(id) on delete set null,
  lesson_id   uuid references public.academic_lessons(id) on delete set null,
  title       text not null default 'Untitled Notebook',
  content     text not null default '',
  tags        text[] default '{}',
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_academic_notebooks_user on public.academic_notebooks(user_id);

create table if not exists public.academic_assignments (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null references public.academic_lessons(id) on delete cascade,
  title         text not null,
  instructions  text not null,
  due_date      timestamptz,
  max_score     integer not null default 100,
  created_at    timestamptz not null default now()
);

create table if not exists public.assignment_submissions (
  id                  uuid primary key default gen_random_uuid(),
  assignment_id       uuid not null references public.academic_assignments(id) on delete cascade,
  user_id             uuid not null references public.profiles(id) on delete cascade,
  submission_content  text not null,
  status              text not null default 'draft' check (status in ('draft', 'submitted', 'graded')),
  grade               numeric(5,2),
  feedback            text,
  submitted_at        timestamptz,
  updated_at          timestamptz not null default now(),
  unique (assignment_id, user_id)
);

create table if not exists public.academic_quizzes (
  id                      uuid primary key default gen_random_uuid(),
  lesson_id               uuid not null references public.academic_lessons(id) on delete cascade,
  title                   text not null,
  description             text,
  passing_score_percent   integer not null default 70,
  created_at              timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id              uuid primary key default gen_random_uuid(),
  quiz_id         uuid not null references public.academic_quizzes(id) on delete cascade,
  question_type   text not null default 'mcq' check (question_type in ('mcq', 'true_false', 'short_answer')),
  question_text   text not null,
  options         jsonb not null default '[]'::jsonb, -- e.g. [{"id": "a", "text": "Option A"}]
  correct_answer  text not null,
  explanation     text,
  order_index     integer not null default 0
);

create table if not exists public.quiz_attempts (
  id                uuid primary key default gen_random_uuid(),
  quiz_id           uuid not null references public.academic_quizzes(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  answers           jsonb not null default '{}'::jsonb,
  score_percentage  numeric(5,2) not null default 0.00,
  passed            boolean not null default false,
  completed_at      timestamptz not null default now()
);

create table if not exists public.flashcard_decks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  subject_id  uuid references public.academic_subjects(id) on delete set null,
  title       text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists public.flashcards (
  id                uuid primary key default gen_random_uuid(),
  deck_id           uuid not null references public.flashcard_decks(id) on delete cascade,
  front_prompt      text not null,
  back_solution     text not null,
  ease_factor       numeric(4,2) not null default 2.50,
  interval_days     integer not null default 0,
  repetition_count  integer not null default 0,
  next_review_at    timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

-- ─── 5. Enable Row Level Security ────────────────────────────────────────────

alter table public.article_categories enable row level security;
alter table public.articles enable row level security;
alter table public.article_revisions enable row level security;
alter table public.article_citations enable row level security;
alter table public.article_tags enable row level security;
alter table public.article_tag_mappings enable row level security;
alter table public.article_reading_progress enable row level security;

alter table public.academic_degrees enable row level security;
alter table public.academic_specialisations enable row level security;
alter table public.academic_semesters enable row level security;
alter table public.academic_subjects enable row level security;
alter table public.academic_modules enable row level security;
alter table public.academic_lessons enable row level security;
alter table public.academic_lesson_progress enable row level security;

alter table public.content_thoughts enable row level security;
alter table public.discourse_threads enable row level security;
alter table public.discourse_messages enable row level security;

alter table public.academic_notebooks enable row level security;
alter table public.academic_assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.academic_quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.flashcard_decks enable row level security;
alter table public.flashcards enable row level security;

-- ─── 6. RLS Policies: Articles & Editorial ───────────────────────────────────

create policy "Anyone can read article categories"
  on public.article_categories for select
  using (true);

create policy "Editors and admins can manage article categories"
  on public.article_categories for all
  using (public.has_role('editor') or public.has_role('admin'));

-- Public & Authenticated can view published articles
create policy "Anyone can read published articles"
  on public.articles for select
  using (status = 'published');

create policy "Authors and editors can read all articles"
  on public.articles for select
  using (
    auth.uid() = author_id or
    public.has_role('editor') or
    public.has_role('admin')
  );

create policy "Authors and editors can create articles"
  on public.articles for insert
  with check (
    auth.uid() is not null and (
      auth.uid() = author_id or
      public.has_role('editor') or
      public.has_role('admin')
    )
  );

create policy "Authors and editors can update articles"
  on public.articles for update
  using (
    auth.uid() = author_id or
    public.has_role('editor') or
    public.has_role('admin')
  );

create policy "Authors and editors can delete articles"
  on public.articles for delete
  using (
    auth.uid() = author_id or
    public.has_role('editor') or
    public.has_role('admin')
  );

-- Citations & Tags follow article visibility
create policy "Anyone can read citations for accessible articles"
  on public.article_citations for select
  using (
    exists (
      select 1 from public.articles a
      where a.id = article_citations.article_id
        and (a.status = 'published' or a.author_id = auth.uid() or public.has_role('editor') or public.has_role('admin'))
    )
  );

create policy "Authors and editors manage citations"
  on public.article_citations for all
  using (
    exists (
      select 1 from public.articles a
      where a.id = article_citations.article_id
        and (a.author_id = auth.uid() or public.has_role('editor') or public.has_role('admin'))
    )
  );

create policy "Anyone can view tags"
  on public.article_tags for select
  using (true);

create policy "Editors manage tags"
  on public.article_tags for all
  using (public.has_role('editor') or public.has_role('admin'));

create policy "Anyone can view tag mappings"
  on public.article_tag_mappings for select
  using (true);

create policy "Editors manage tag mappings"
  on public.article_tag_mappings for all
  using (public.has_role('editor') or public.has_role('admin'));

-- Reading progress is strictly personal
create policy "Users manage their own reading progress"
  on public.article_reading_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 7. RLS Policies: Academic Hierarchy ──────────────────────────────────────

create policy "Anyone can read active degrees"
  on public.academic_degrees for select
  using (is_active = true);

create policy "Editors manage degrees"
  on public.academic_degrees for all
  using (public.has_role('editor') or public.has_role('admin'));

create policy "Anyone can read active specialisations"
  on public.academic_specialisations for select
  using (is_active = true);

create policy "Editors manage specialisations"
  on public.academic_specialisations for all
  using (public.has_role('editor') or public.has_role('admin'));

create policy "Anyone can read semesters"
  on public.academic_semesters for select
  using (true);

create policy "Editors manage semesters"
  on public.academic_semesters for all
  using (public.has_role('editor') or public.has_role('admin'));

create policy "Anyone can read subjects"
  on public.academic_subjects for select
  using (true);

create policy "Editors manage subjects"
  on public.academic_subjects for all
  using (public.has_role('editor') or public.has_role('admin'));

create policy "Anyone can read modules"
  on public.academic_modules for select
  using (true);

create policy "Editors manage modules"
  on public.academic_modules for all
  using (public.has_role('editor') or public.has_role('admin'));

create policy "Anyone can read published lessons"
  on public.academic_lessons for select
  using (is_published = true);

create policy "Editors manage lessons"
  on public.academic_lessons for all
  using (public.has_role('editor') or public.has_role('admin'));

create policy "Users manage their own academic progress"
  on public.academic_lesson_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 8. RLS Policies: My Thoughts & Private Discourse ────────────────────────

-- Strict isolation for content_thoughts: NEVER visible to anyone except author
create policy "Users have exclusive access to their private thoughts"
  on public.content_thoughts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Discourse threads: visible only to the 2 participants
create policy "Participants can view discourse threads"
  on public.discourse_threads for select
  using (auth.uid() in (author_id, recipient_id));

create policy "Authors can initiate discourse threads"
  on public.discourse_threads for insert
  with check (auth.uid() = author_id);

create policy "Participants can update discourse thread status"
  on public.discourse_threads for update
  using (auth.uid() in (author_id, recipient_id))
  with check (
    (auth.uid() = author_id and status in ('active', 'concluded', 'revoked')) or
    (auth.uid() = recipient_id and status = 'concluded')
  );

-- Discourse messages: only active participants of non-revoked threads
create policy "Thread participants can view messages"
  on public.discourse_messages for select
  using (
    exists (
      select 1 from public.discourse_threads dt
      where dt.id = discourse_messages.thread_id
        and dt.status != 'revoked'
        and (dt.author_id = auth.uid() or dt.recipient_id = auth.uid())
    )
  );

create policy "Thread participants can send messages"
  on public.discourse_messages for insert
  with check (
    sender_id = auth.uid() and
    exists (
      select 1 from public.discourse_threads dt
      where dt.id = discourse_messages.thread_id
        and dt.status = 'active'
        and (dt.author_id = auth.uid() or dt.recipient_id = auth.uid())
    )
  );

-- ─── 9. RLS Policies: Interactive Tools ──────────────────────────────────────

create policy "Users manage their own notebooks"
  on public.academic_notebooks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Anyone can read assignments"
  on public.academic_assignments for select
  using (true);

create policy "Editors manage assignments"
  on public.academic_assignments for all
  using (public.has_role('editor') or public.has_role('admin'));

create policy "Students manage their assignment submissions"
  on public.assignment_submissions for all
  using (auth.uid() = user_id or public.has_role('editor') or public.has_role('admin'))
  with check (auth.uid() = user_id);

create policy "Anyone can view quizzes"
  on public.academic_quizzes for select
  using (true);

create policy "Editors manage quizzes"
  on public.academic_quizzes for all
  using (public.has_role('editor') or public.has_role('admin'));

create policy "Anyone can view quiz questions"
  on public.quiz_questions for select
  using (true);

create policy "Editors manage quiz questions"
  on public.quiz_questions for all
  using (public.has_role('editor') or public.has_role('admin'));

create policy "Users manage their own quiz attempts"
  on public.quiz_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own flashcard decks"
  on public.flashcard_decks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own flashcards"
  on public.flashcards for all
  using (
    exists (
      select 1 from public.flashcard_decks fd
      where fd.id = flashcards.deck_id and fd.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.flashcard_decks fd
      where fd.id = flashcards.deck_id and fd.user_id = auth.uid()
    )
  );

commit;
