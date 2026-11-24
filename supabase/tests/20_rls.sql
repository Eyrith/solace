\set ON_ERROR_STOP on
\set alice '11111111-1111-4111-8111-111111111111'
\set bob '22222222-2222-4222-8222-222222222222'
\set carol '33333333-3333-4333-8333-333333333333'
\set editor '44444444-4444-4444-8444-444444444444'
\set admin '55555555-5555-4555-8555-555555555555'
\set space1 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
\set space2 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
\set conv1 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
\set conv2 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
\set msg1 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'
\set msg2 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2'
\set q_today '99999999-9999-4999-8999-999999999991'
\set q_yesterday '99999999-9999-4999-8999-999999999992'

begin;
savepoint fixture_tests;

\echo '== fixture integrity =='
do $$
declare
  n integer;
  tok text;
begin
  select count(*) into n from public.profiles;
  if n <> 5 then raise exception 'fixture: expected 5 profiles, saw %', n; end if;

  select count(*) into n from public.private_spaces;
  if n <> 2 then raise exception 'fixture: expected 2 spaces, saw %', n; end if;

  select count(*) into n from public.conversations;
  if n <> 2 then raise exception 'fixture: expected 2 conversations, saw %', n; end if;

  select count(*) into n from public.conversation_participants;
  if n <> 3 then raise exception 'fixture: expected 3 participants, saw %', n; end if;

  insert into public.invitations (space_id, created_by)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111')
  returning token into tok;
  if tok !~ '^[0-9a-f]{64}$' then
    raise exception 'fixture: invitation token is not URL-safe hex: %', tok;
  end if;
end $$;

\echo '== message/conversation integrity trigger =='
do $$
begin
  begin
    insert into public.messages (conversation_id, space_id, sender_id, content)
    values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      '11111111-1111-4111-8111-111111111111',
      'cross-space message'
    );
    raise exception 'expected message/conversation mismatch to fail';
  exception
    when raise_exception or insufficient_privilege then null;
  end;
end $$;

do $$
declare
  v_space uuid;
begin
  insert into public.messages (conversation_id, space_id, sender_id, content)
  values (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    null,
    '11111111-1111-4111-8111-111111111111',
    'legacy message without explicit space'
  )
  returning space_id into v_space;
  if v_space is distinct from 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' then
    raise exception 'trigger did not derive legacy space, got %', v_space;
  end if;
end $$;

rollback to savepoint fixture_tests;

\echo '== anonymous =='
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$
declare n integer;
begin
  if auth.uid() is not null then raise exception 'anon should not have a uid'; end if;
  select count(*) into n from public.profiles;
  if n <> 0 then raise exception 'anon profile enumeration: saw %', n; end if;
  select count(*) into n from public.private_spaces;
  if n <> 0 then raise exception 'anon saw % private spaces', n; end if;
  select count(*) into n from public.messages;
  if n <> 0 then raise exception 'anon saw % messages', n; end if;
  select count(*) into n from public.conversation_participants;
  if n <> 0 then raise exception 'anon saw % participants', n; end if;
  select count(*) into n from public.editorial_articles;
  if n <> 1 then raise exception 'anon should see 1 public article, saw %', n; end if;
  select count(*) into n from public.editorial_sources;
  if n <> 5 then raise exception 'anon should see 5 public sources, saw %', n; end if;
end $$;
do $$
begin
  begin
    insert into public.messages (conversation_id, space_id, sender_id, content)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'anon insert');
    raise exception 'expected anon message insert to fail';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

\echo '== Alice: own space, co-member profile, no cross-space access =='
select set_config('request.jwt.claim.sub', :'alice', false);
set role authenticated;
do $$
declare n integer;
begin
  select count(*) into n from public.profiles;
  if n <> 2 then raise exception 'Alice should see 2 profiles, saw %', n; end if;
  select count(*) into n from public.private_spaces;
  if n <> 1 then raise exception 'Alice should see 1 space, saw %', n; end if;
  select count(*) into n from public.private_space_members;
  if n <> 2 then raise exception 'Alice should see 2 members, saw %', n; end if;
  select count(*) into n from public.conversations;
  if n <> 1 then raise exception 'Alice should see 1 conversation, saw %', n; end if;
  select count(*) into n from public.conversation_participants;
  if n <> 2 then raise exception 'Alice should see 2 participants, saw %', n; end if;
  select count(*) into n from public.messages;
  if n <> 1 then raise exception 'Alice should see 1 message, saw %', n; end if;
  select count(*) into n from public.message_reactions;
  if n <> 1 then raise exception 'Alice should see 1 reaction, saw %', n; end if;
  select count(*) into n from public.message_receipts;
  if n <> 1 then raise exception 'Alice should see 1 receipt, saw %', n; end if;
  select count(*) into n from public.message_attachments;
  if n <> 1 then raise exception 'Alice should see 1 attachment, saw %', n; end if;
  select count(*) into n from public.space_moods;
  if n <> 2 then raise exception 'Alice should see 2 moods, saw %', n; end if;
  select count(*) into n from public.matrix_user_links;
  if n <> 2 then raise exception 'Alice should see 2 matrix links, saw %', n; end if;
  select count(*) into n from public.space_matrix_rooms;
  if n <> 1 then raise exception 'Alice should see 1 matrix room, saw %', n; end if;
  select count(*) into n from public.ephemeral_media_timers;
  if n <> 1 then raise exception 'Alice should see 1 media timer, saw %', n; end if;
  select count(*) into n from public.shared_notes;
  if n <> 2 then raise exception 'Alice should see 2 notes, saw %', n; end if;
  select count(*) into n from public.letters;
  if n <> 2 then raise exception 'Alice should see 2 letters, saw %', n; end if;
  select count(*) into n from public.memories;
  if n <> 1 then raise exception 'Alice should see 1 memory, saw %', n; end if;
  select count(*) into n from public.calendar_events;
  if n <> 1 then raise exception 'Alice should see 1 calendar event, saw %', n; end if;
  select count(*) into n from public.bucket_list_items;
  if n <> 1 then raise exception 'Alice should see 1 bucket item, saw %', n; end if;
  select count(*) into n from public.call_sessions;
  if n <> 1 then raise exception 'Alice should see 1 call, saw %', n; end if;
  select count(*) into n from public.question_library where is_custom = true;
  if n <> 1 then raise exception 'Alice should see 1 custom question, saw %', n; end if;
  select count(*) into n from public.daily_questions;
  if n <> 2 then raise exception 'Alice should see 2 daily questions, saw %', n; end if;
  select count(*) into n from public.daily_question_answers where daily_question_id = '99999999-9999-4999-8999-999999999991';
  if n <> 1 then raise exception 'Alice should see only her own today answer, saw %', n; end if;
  select count(*) into n from public.daily_question_answers where daily_question_id = '99999999-9999-4999-8999-999999999992';
  if n <> 2 then raise exception 'Alice should see both revealed yesterday answers, saw %', n; end if;
  if public.is_daily_question_revealed('99999999-9999-4999-8999-999999999991') then
    raise exception 'today question should not be revealed yet';
  end if;
  if not public.is_daily_question_revealed('99999999-9999-4999-8999-999999999992') then
    raise exception 'yesterday question should be revealed';
  end if;
  select count(*) into n from public.invitations;
  if n <> 1 then raise exception 'Alice should see her invitation, saw %', n; end if;
  select count(*) into n from public.saved_articles;
  if n <> 1 then raise exception 'Alice should see 1 saved article, saw %', n; end if;
  select count(*) into n from public.reading_history;
  if n <> 1 then raise exception 'Alice should see 1 history row, saw %', n; end if;
  select count(*) into n from public.user_preferences;
  if n <> 1 then raise exception 'Alice should see 1 preference row, saw %', n; end if;
  select count(*) into n from public.user_roles;
  if n <> 1 then raise exception 'Alice should see 1 role, saw %', n; end if;
  select count(*) into n from public.audit_events;
  if n <> 0 then raise exception 'Alice should not see audit events, saw %', n; end if;
end $$;

savepoint alice_mutations;
do $$
declare
  n integer;
  v_space uuid;
begin
  update public.profiles set bio = 'Alice updated' where id = '11111111-1111-4111-8111-111111111111';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Alice should update her own profile, updated %', n; end if;

  update public.profiles set bio = 'hacked' where id = '22222222-2222-4222-8222-222222222222';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Alice should not update Bob profile, updated %', n; end if;

  insert into public.messages (conversation_id, space_id, sender_id, content)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', null, '11111111-1111-4111-8111-111111111111', 'Alice follow-up')
  returning space_id into v_space;
  if v_space is distinct from 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' then
    raise exception 'Alice message did not inherit the legacy space: %', v_space;
  end if;

  insert into public.message_reactions (message_id, user_id, emoji)
  values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '11111111-1111-4111-8111-111111111111', 'thumbsup');

  insert into public.message_attachments (message_id, storage_path, mime_type, file_size_bytes)
  values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/extra.png', 'image/png', 2048);

  perform public.mark_message_viewed('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '11111111-1111-4111-8111-111111111111');
end $$;
do $$
begin
  begin
    insert into public.messages (conversation_id, sender_id, content)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '11111111-1111-4111-8111-111111111111', 'cross-space');
    raise exception 'expected Alice cross-space insert to fail';
  exception when insufficient_privilege or raise_exception then null;
  end;

  begin
    insert into public.private_spaces (name, created_by)
    values ('Alice direct space', '11111111-1111-4111-8111-111111111111');
    raise exception 'expected direct space insert to fail';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.conversations (kind, created_by)
    values ('group', '11111111-1111-4111-8111-111111111111');
    raise exception 'expected direct conversation insert to fail';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.conversation_participants (conversation_id, user_id)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '11111111-1111-4111-8111-111111111111');
    raise exception 'expected direct participant insert to fail';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.user_roles (user_id, role)
    values ('11111111-1111-4111-8111-111111111111', 'admin');
    raise exception 'expected self role escalation to fail';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.audit_events (actor_id, action)
    values ('11111111-1111-4111-8111-111111111111', 'forged');
    raise exception 'expected audit insert to fail';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.mark_message_viewed('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', '11111111-1111-4111-8111-111111111111');
    raise exception 'expected cross-space mark viewed to fail';
  exception when raise_exception or insufficient_privilege then null;
  end;
end $$;
rollback to savepoint alice_mutations;
reset role;

\echo '== Bob: co-member visibility, hidden drafts, sender-only mutation =='
select set_config('request.jwt.claim.sub', :'bob', false);
set role authenticated;
do $$
declare n integer;
begin
  select count(*) into n from public.profiles;
  if n <> 2 then raise exception 'Bob should see 2 profiles, saw %', n; end if;
  select count(*) into n from public.messages;
  if n <> 1 then raise exception 'Bob should see 1 message, saw %', n; end if;
  select count(*) into n from public.shared_notes;
  if n <> 1 then raise exception 'Bob should see only the shared note, saw %', n; end if;
  select count(*) into n from public.letters;
  if n <> 1 then raise exception 'Bob should see only the sent letter, saw %', n; end if;
  select count(*) into n from public.daily_question_answers where daily_question_id = '99999999-9999-4999-8999-999999999991';
  if n <> 0 then raise exception 'Bob should not see Alice unrevealed answer, saw %', n; end if;
  select count(*) into n from public.daily_question_answers where daily_question_id = '99999999-9999-4999-8999-999999999992';
  if n <> 2 then raise exception 'Bob should see both revealed yesterday answers, saw %', n; end if;
  select count(*) into n from public.game_answers where session_id = '99999999-9999-4999-8999-999999999903';
  if n <> 2 then raise exception 'Bob should see revealed game answers, saw %', n; end if;
  select count(*) into n from public.game_answers where session_id = '99999999-9999-4999-8999-999999999904';
  if n <> 0 then raise exception 'Bob should not see active game answers, saw %', n; end if;
  select count(*) into n from public.invitations;
  if n <> 0 then raise exception 'Bob should not see Alice invitation, saw %', n; end if;
end $$;

savepoint bob_mutations;
do $$
declare n integer;
begin
  update public.messages set content = 'tampered' where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Bob updated Alice message, rows %', n; end if;

  delete from public.messages where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Bob deleted Alice message, rows %', n; end if;

  delete from public.message_reactions where id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Bob should delete his own reaction, rows %', n; end if;

  insert into public.messages (conversation_id, space_id, sender_id, content)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '22222222-2222-4222-8222-222222222222', 'Bob reply');

  insert into public.message_attachments (message_id, storage_path, mime_type, file_size_bytes)
  values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/bob.png', 'image/png', 2048);

  perform public.mark_message_viewed('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '22222222-2222-4222-8222-222222222222');
end $$;
do $$
begin
  begin
    insert into public.messages (conversation_id, sender_id, content)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '22222222-2222-4222-8222-222222222222', 'cross-space');
    raise exception 'expected Bob cross-space insert to fail';
  exception when insufficient_privilege or raise_exception then null;
  end;

  begin
    insert into public.invitations (space_id, created_by)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '22222222-2222-4222-8222-222222222222');
    raise exception 'expected non-owner invitation insert to fail';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.mark_message_viewed('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', '22222222-2222-4222-8222-222222222222');
    raise exception 'expected Bob cross-space mark viewed to fail';
  exception when raise_exception or insufficient_privilege then null;
  end;
end $$;
rollback to savepoint bob_mutations;
reset role;

\echo '== Carol: unrelated user sees only herself and her own space =='
select set_config('request.jwt.claim.sub', :'carol', false);
set role authenticated;
do $$
declare n integer;
begin
  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'Carol should see only herself, saw %', n; end if;
  select count(*) into n from public.profiles where id = '11111111-1111-4111-8111-111111111111';
  if n <> 0 then raise exception 'Carol can read Alice profile'; end if;
  select count(*) into n from public.private_spaces;
  if n <> 1 then raise exception 'Carol should see 1 space, saw %', n; end if;
  select count(*) into n from public.private_space_members;
  if n <> 1 then raise exception 'Carol should see 1 membership, saw %', n; end if;
  select count(*) into n from public.conversations;
  if n <> 1 then raise exception 'Carol should see 1 conversation, saw %', n; end if;
  select count(*) into n from public.messages;
  if n <> 1 then raise exception 'Carol should see 1 message, saw %', n; end if;
  select count(*) into n from public.messages where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
  if n <> 0 then raise exception 'Carol can read Alice message'; end if;
  select count(*) into n from public.space_moods;
  if n <> 0 then raise exception 'Carol saw Alice moods'; end if;
  select count(*) into n from public.shared_notes;
  if n <> 0 then raise exception 'Carol saw Alice notes'; end if;
  select count(*) into n from public.letters;
  if n <> 0 then raise exception 'Carol saw Alice letters'; end if;
  select count(*) into n from public.memories;
  if n <> 0 then raise exception 'Carol saw Alice memories'; end if;
  select count(*) into n from public.calendar_events;
  if n <> 0 then raise exception 'Carol saw Alice calendar'; end if;
  select count(*) into n from public.bucket_list_items;
  if n <> 0 then raise exception 'Carol saw Alice bucket list'; end if;
  select count(*) into n from public.call_sessions;
  if n <> 0 then raise exception 'Carol saw Alice calls'; end if;
  select count(*) into n from public.space_matrix_rooms;
  if n <> 0 then raise exception 'Carol saw Alice matrix room'; end if;
  select count(*) into n from public.ephemeral_media_timers;
  if n <> 0 then raise exception 'Carol saw Alice media timers'; end if;
  select count(*) into n from public.matrix_user_links;
  if n <> 1 then raise exception 'Carol should see only her matrix link, saw %', n; end if;
  select count(*) into n from public.daily_question_answers;
  if n <> 0 then raise exception 'Carol saw Alice daily answers'; end if;
  select count(*) into n from public.game_answers;
  if n <> 0 then raise exception 'Carol saw Alice game answers'; end if;
  select count(*) into n from public.question_library where is_custom = true;
  if n <> 0 then raise exception 'Carol saw Alice custom question'; end if;
  select count(*) into n from public.invitations;
  if n <> 0 then raise exception 'Carol saw Alice invitation'; end if;
  select count(*) into n from public.user_roles;
  if n <> 1 then raise exception 'Carol should see 1 role, saw %', n; end if;
  select count(*) into n from public.audit_events;
  if n <> 0 then raise exception 'Carol saw audit events'; end if;
  if public.is_daily_question_revealed('99999999-9999-4999-8999-999999999992') then
    raise exception 'Carol learned about another space through is_daily_question_revealed';
  end if;
end $$;

savepoint carol_mutations;
do $$
declare n integer;
begin
  update public.profiles set bio = 'hacked' where id = '11111111-1111-4111-8111-111111111111';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Carol updated Alice profile'; end if;
end $$;
do $$
begin
  begin
    insert into public.messages (conversation_id, sender_id, content)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '33333333-3333-4333-8333-333333333333', 'intrusion');
    raise exception 'expected Carol cross-space insert to fail';
  exception when insufficient_privilege or raise_exception then null;
  end;

  begin
    perform public.mark_message_viewed('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '33333333-3333-4333-8333-333333333333');
    raise exception 'expected Carol cross-space mark viewed to fail';
  exception when raise_exception or insufficient_privilege then null;
  end;
end $$;
rollback to savepoint carol_mutations;
reset role;

\echo '== Editor and Admin: roles do not grant private-content access =='
select set_config('request.jwt.claim.sub', :'editor', false);
set role authenticated;
do $$
declare n integer;
begin
  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'Editor should see only self, saw %', n; end if;
  select count(*) into n from public.private_spaces;
  if n <> 0 then raise exception 'Editor saw private spaces'; end if;
  select count(*) into n from public.messages;
  if n <> 0 then raise exception 'Editor saw messages'; end if;
  select count(*) into n from public.user_roles;
  if n <> 2 then raise exception 'Editor should see reader+editor roles, saw %', n; end if;
  select count(*) into n from public.audit_events;
  if n <> 0 then raise exception 'Editor saw audit events'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', :'admin', false);
set role authenticated;
do $$
declare n integer;
begin
  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'Admin should see only self profile, saw %', n; end if;
  select count(*) into n from public.private_spaces;
  if n <> 0 then raise exception 'Admin saw private spaces'; end if;
  select count(*) into n from public.messages;
  if n <> 0 then raise exception 'Admin saw messages'; end if;
  select count(*) into n from public.shared_notes;
  if n <> 0 then raise exception 'Admin saw private notes'; end if;
  select count(*) into n from public.user_roles;
  if n <> 7 then raise exception 'Admin should see all 7 role rows, saw %', n; end if;
  select count(*) into n from public.audit_events;
  if n <> 1 then raise exception 'Admin should see 1 audit event, saw %', n; end if;
end $$;

savepoint admin_mutations;
do $$
declare n integer;
begin
  insert into public.user_roles (user_id, role, granted_by)
  values ('33333333-3333-4333-8333-333333333333', 'editor', '55555555-5555-4555-8555-555555555555');
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Admin should grant a role, rows %', n; end if;

  delete from public.user_roles where user_id = '33333333-3333-4333-8333-333333333333' and role = 'editor';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Admin should revoke a role, rows %', n; end if;
end $$;
rollback to savepoint admin_mutations;
reset role;

\echo '== Service role: server path still bypasses RLS =='
set role service_role;
do $$
declare n integer;
begin
  select count(*) into n from public.profiles;
  if n <> 5 then raise exception 'service_role should see 5 profiles, saw %', n; end if;
  select count(*) into n from public.messages;
  if n <> 2 then raise exception 'service_role should see 2 messages, saw %', n; end if;
  select count(*) into n from public.private_spaces;
  if n <> 2 then raise exception 'service_role should see 2 spaces, saw %', n; end if;
end $$;
reset role;

\echo '== space-less direct conversation substrate =='
do $$
begin
  insert into public.conversations (id, kind, title, created_by)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'direct', 'Alice and Carol', '11111111-1111-4111-8111-111111111111');
  insert into public.conversation_participants (conversation_id, user_id, role) values
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', '11111111-1111-4111-8111-111111111111', 'owner'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', '33333333-3333-4333-8333-333333333333', 'member');
  insert into public.messages (conversation_id, sender_id, content)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', '11111111-1111-4111-8111-111111111111', 'Space-less hello');
end $$;

select set_config('request.jwt.claim.sub', :'alice', false);
set role authenticated;
do $$
declare n integer;
begin
  select count(*) into n from public.conversations where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3';
  if n <> 1 then raise exception 'Alice cannot read her space-less conversation'; end if;
  select count(*) into n from public.messages where conversation_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3';
  if n <> 1 then raise exception 'Alice cannot read her space-less message'; end if;
  select count(*) into n from public.profiles where id = '33333333-3333-4333-8333-333333333333';
  if n <> 1 then raise exception 'Alice cannot see her direct conversation partner'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', :'bob', false);
set role authenticated;
do $$
declare n integer;
begin
  select count(*) into n from public.conversations where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3';
  if n <> 0 then raise exception 'Bob can read a conversation he is not in'; end if;
  select count(*) into n from public.messages where conversation_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3';
  if n <> 0 then raise exception 'Bob can read a message he is not in'; end if;
  select count(*) into n from public.profiles where id = '33333333-3333-4333-8333-333333333333';
  if n <> 0 then raise exception 'Bob can see Carol through an unrelated conversation'; end if;
end $$;
reset role;

\echo '== conversation RPCs: direct, idempotent, owner-only membership =='
savepoint conversation_rpcs;

select set_config('request.jwt.claim.sub', :'alice', false);
set role authenticated;
do $$
declare
  v_id    uuid;
  v_again uuid;
  n       integer;
begin
  v_id := public.create_direct_conversation('33333333-3333-4333-8333-333333333333');
  v_again := public.create_direct_conversation('33333333-3333-4333-8333-333333333333');
  if v_id <> v_again then
    raise exception 'direct conversation creation is not idempotent';
  end if;
  perform set_config('test.direct_id', v_id::text, false);

  select count(*) into n
  from public.conversation_participants
  where conversation_id = v_id and left_at is null;
  if n <> 2 then
    raise exception 'direct conversation should have 2 participants, saw %', n;
  end if;

  insert into public.messages (conversation_id, sender_id, content)
  values (v_id, '11111111-1111-4111-8111-111111111111', 'Direct hello');
end $$;

do $$
declare
  failed boolean;
begin
  failed := false;
  begin
    perform public.create_direct_conversation('11111111-1111-4111-8111-111111111111');
  exception when others then failed := true;
  end;
  if not failed then
    raise exception 'expected a self direct conversation to fail';
  end if;

  failed := false;
  begin
    perform public.create_direct_conversation('99999999-9999-4999-8999-999999999999');
  exception when others then failed := true;
  end;
  if not failed then
    raise exception 'expected a missing recipient to fail';
  end if;

  failed := false;
  begin
    perform public.add_conversation_participant(
      current_setting('test.direct_id')::uuid,
      '44444444-4444-4444-8444-444444444444'
    );
  exception when others then failed := true;
  end;
  if not failed then
    raise exception 'expected adding a participant to a direct conversation to fail';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', :'carol', false);
set role authenticated;
do $$
declare
  v_id uuid := current_setting('test.direct_id')::uuid;
  n    integer;
begin
  select count(*) into n from public.conversations where id = v_id;
  if n <> 1 then raise exception 'Carol cannot read her direct conversation'; end if;

  select count(*) into n from public.messages where conversation_id = v_id;
  if n <> 1 then raise exception 'Carol cannot read her direct message'; end if;

  select count(*) into n
  from public.profiles
  where id = '11111111-1111-4111-8111-111111111111';
  if n <> 1 then raise exception 'Carol cannot see her direct partner profile'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', :'bob', false);
set role authenticated;
do $$
declare
  v_id uuid := current_setting('test.direct_id')::uuid;
  n    integer;
begin
  select count(*) into n from public.conversations where id = v_id;
  if n <> 0 then raise exception 'Bob can read an unrelated direct conversation'; end if;

  select count(*) into n from public.messages where conversation_id = v_id;
  if n <> 0 then raise exception 'Bob can read an unrelated direct message'; end if;

  select count(*) into n
  from public.profiles
  where id = '33333333-3333-4333-8333-333333333333';
  if n <> 0 then raise exception 'Bob can see Carol through an unrelated conversation'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', :'alice', false);
set role authenticated;
do $$
declare
  v_id uuid;
  n    integer;
begin
  v_id := public.create_group_conversation(
    'Reading group',
    array[
      '22222222-2222-4222-8222-222222222222'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid
    ]
  );
  perform set_config('test.group_id', v_id::text, false);

  select count(*) into n
  from public.conversation_participants
  where conversation_id = v_id and left_at is null;
  if n <> 3 then
    raise exception 'group conversation should have 3 participants, saw %', n;
  end if;

  insert into public.messages (conversation_id, sender_id, content)
  values (v_id, '11111111-1111-4111-8111-111111111111', 'Group hello');
end $$;
reset role;

select set_config('request.jwt.claim.sub', :'bob', false);
set role authenticated;
do $$
declare
  v_id   uuid := current_setting('test.group_id')::uuid;
  failed boolean;
  n      integer;
begin
  select count(*) into n from public.conversations where id = v_id;
  if n <> 1 then raise exception 'Bob cannot read his group conversation'; end if;

  select count(*) into n from public.messages where conversation_id = v_id;
  if n <> 1 then raise exception 'Bob cannot read his group message'; end if;

  select count(*) into n
  from public.profiles
  where id = '33333333-3333-4333-8333-333333333333';
  if n <> 1 then raise exception 'Bob cannot see a group co-participant'; end if;

  failed := false;
  begin
    perform public.add_conversation_participant(
      v_id,
      '44444444-4444-4444-8444-444444444444'
    );
  exception when others then failed := true;
  end;
  if not failed then
    raise exception 'expected a non-owner group member add to fail';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', :'alice', false);
set role authenticated;
do $$
declare
  v_id uuid := current_setting('test.group_id')::uuid;
begin
  perform public.add_conversation_participant(
    v_id,
    '44444444-4444-4444-8444-444444444444'
  );
end $$;
reset role;

select set_config('request.jwt.claim.sub', :'editor', false);
set role authenticated;
do $$
declare
  v_id uuid := current_setting('test.group_id')::uuid;
  n    integer;
begin
  select count(*) into n from public.conversations where id = v_id;
  if n <> 1 then raise exception 'added participant cannot read the group'; end if;

  select count(*) into n from public.profiles;
  if n <> 4 then
    raise exception 'added participant should see 4 group profiles, saw %', n;
  end if;

  select count(*) into n from public.private_spaces;
  if n <> 0 then raise exception 'group access leaked a private space'; end if;
end $$;
reset role;

do $$
declare n integer;
begin
  select count(*) into n
  from public.audit_events
  where action in ('conversation.created', 'conversation.participant_added');
  if n < 3 then
    raise exception 'conversation RPCs did not write audit events, saw %', n;
  end if;
end $$;

rollback to savepoint conversation_rpcs;

\echo '== all RLS checks passed =='
rollback;
