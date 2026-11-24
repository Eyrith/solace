-- Deterministic fixtures for local RLS verification.
-- Run as the migration owner (postgres), not as an application role.

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'alice@example.test', '{"display_name":"Alice"}'),
  ('22222222-2222-4222-8222-222222222222', 'bob@example.test',   '{"display_name":"Bob"}'),
  ('33333333-3333-4333-8333-333333333333', 'carol@example.test', '{"display_name":"Carol"}'),
  ('44444444-4444-4444-8444-444444444444', 'editor@example.test','{"display_name":"Editor"}'),
  ('55555555-5555-4555-8555-555555555555', 'admin@example.test', '{"display_name":"Admin"}')
on conflict (id) do nothing;

update profiles set bio = 'Alice bio' where id = '11111111-1111-4111-8111-111111111111';
update profiles set bio = 'Bob bio' where id = '22222222-2222-4222-8222-222222222222';
update profiles set bio = 'Carol bio' where id = '33333333-3333-4333-8333-333333333333';

insert into user_roles (user_id, role) values
  ('44444444-4444-4444-8444-444444444444', 'editor'),
  ('55555555-5555-4555-8555-555555555555', 'admin')
on conflict (user_id, role) do nothing;

insert into private_spaces (id, name, created_by) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Alice and Bob', '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Carol alone', '33333333-3333-4333-8333-333333333333')
on conflict (id) do nothing;

insert into private_space_members (space_id, user_id, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '22222222-2222-4222-8222-222222222222', 'member'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '33333333-3333-4333-8333-333333333333', 'owner')
on conflict (space_id, user_id) do nothing;

insert into conversations (id, space_id) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2')
on conflict (id) do nothing;

insert into messages (id, conversation_id, space_id, sender_id, content) values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Hello Bob'),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '33333333-3333-4333-8333-333333333333', 'Hello from Carol')
on conflict (id) do nothing;

insert into message_reactions (id, message_id, user_id, emoji) values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '22222222-2222-4222-8222-222222222222', 'heart')
on conflict (id) do nothing;

insert into message_receipts (message_id, user_id, viewed_at) values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '11111111-1111-4111-8111-111111111111', now())
on conflict (message_id, user_id) do nothing;

insert into message_attachments (id, message_id, storage_path, mime_type, file_size_bytes) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/photo.jpg', 'image/jpeg', 1024)
on conflict (id) do nothing;

insert into space_moods (space_id, user_id, mood) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'calm'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '22222222-2222-4222-8222-222222222222', 'tired')
on conflict (space_id, user_id) do nothing;

insert into matrix_user_links (user_id, matrix_user_id) values
  ('11111111-1111-4111-8111-111111111111', '@alice:test'),
  ('22222222-2222-4222-8222-222222222222', '@bob:test'),
  ('33333333-3333-4333-8333-333333333333', '@carol:test')
on conflict (user_id) do nothing;

insert into space_matrix_rooms (space_id, matrix_room_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '!room1:test')
on conflict (space_id) do nothing;

insert into ephemeral_media_timers (space_id, matrix_room_id, matrix_event_id, expires_at) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '!room1:test', '$event1', now() + interval '1 hour')
on conflict do nothing;

insert into shared_notes (id, space_id, created_by, title, content, is_shared) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Shared note', 'For both', true),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Alice private note', 'Only Alice', false)
on conflict (id) do nothing;

insert into letters (id, space_id, author_id, subject, body, status) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Draft', 'Draft body', 'draft'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Sent', 'Sent body', 'sent')
on conflict (id) do nothing;

insert into memories (id, space_id, created_by, title, content) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'A memory', 'Remember this')
on conflict (id) do nothing;

insert into calendar_events (id, space_id, created_by, title, event_date) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee7', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Anniversary', current_date)
on conflict (id) do nothing;

insert into bucket_list_items (id, space_id, created_by, title) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee8', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Travel')
on conflict (id) do nothing;

insert into call_sessions (id, space_id, initiator_id, call_type, status) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee9', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'voice', 'active')
on conflict (id) do nothing;

insert into question_library (id, slug, category, content, is_custom, space_id, created_by) values
  ('99999999-9999-4999-8999-999999999901', 'custom-test', 'funny', 'A custom question', true, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111')
on conflict (id) do nothing;

insert into daily_questions (id, space_id, question_id, date) values
  ('99999999-9999-4999-8999-999999999991', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '00000000-0000-4000-8000-000000000101', current_date),
  ('99999999-9999-4999-8999-999999999992', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '00000000-0000-4000-8000-000000000102', current_date - 1)
on conflict (id) do nothing;

insert into daily_question_answers (daily_question_id, space_id, user_id, answer) values
  ('99999999-9999-4999-8999-999999999991', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Today Alice'),
  ('99999999-9999-4999-8999-999999999992', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Yesterday Alice'),
  ('99999999-9999-4999-8999-999999999992', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '22222222-2222-4222-8222-222222222222', 'Yesterday Bob')
on conflict (daily_question_id, user_id) do nothing;

insert into game_sessions (id, space_id, created_by, game_type, status) values
  ('99999999-9999-4999-8999-999999999903', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'couple_trivia', 'revealing'),
  ('99999999-9999-4999-8999-999999999904', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'couple_trivia', 'active')
on conflict (id) do nothing;

insert into game_answers (session_id, question_id, user_id, answer) values
  ('99999999-9999-4999-8999-999999999903', '00000000-0000-4000-8000-000000000201', '11111111-1111-4111-8111-111111111111', 'Alice answer'),
  ('99999999-9999-4999-8999-999999999903', '00000000-0000-4000-8000-000000000201', '22222222-2222-4222-8222-222222222222', 'Bob answer'),
  ('99999999-9999-4999-8999-999999999904', '00000000-0000-4000-8000-000000000201', '11111111-1111-4111-8111-111111111111', 'Hidden answer')
on conflict do nothing;

insert into invitations (id, space_id, created_by) values
  ('99999999-9999-4999-8999-999999999905', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111')
on conflict (id) do nothing;

insert into editorial_articles (id, source_id, external_id, title, original_url, category)
select '77777777-7777-4777-8777-777777777777', id, 'test-article-1', 'A Public Test Article', 'https://example.test/article', 'essay'
from editorial_sources
order by slug
limit 1
on conflict (id) do nothing;

insert into saved_articles (user_id, article_id) values
  ('11111111-1111-4111-8111-111111111111', '77777777-7777-4777-8777-777777777777')
on conflict do nothing;

insert into reading_history (user_id, article_id) values
  ('11111111-1111-4111-8111-111111111111', '77777777-7777-4777-8777-777777777777')
on conflict do nothing;

insert into user_preferences (user_id) values
  ('11111111-1111-4111-8111-111111111111')
on conflict (user_id) do nothing;

insert into audit_events (actor_id, action, target_type, target_id, metadata) values
  ('55555555-5555-4555-8555-555555555555', 'test.event', 'profile', '11111111-1111-4111-8111-111111111111', '{"test":true}')
on conflict do nothing;
