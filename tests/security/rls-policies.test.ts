import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('PostgreSQL Migration & RLS Security Policy Verification', () => {
  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/001_initial_schema.sql')
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8')

  it('migration file exists and contains valid SQL definitions', () => {
    expect(migrationSql).toBeDefined()
    expect(migrationSql.length).toBeGreaterThan(1000)
  })

  it('enforces Row Level Security (RLS) on all 16 private and public tables', () => {
    const requiredRlsTables = [
      'profiles',
      'private_spaces',
      'private_space_members',
      'invitations',
      'conversations',
      'messages',
      'message_receipts',
      'message_reactions',
      'message_attachments',
      'game_sessions',
      'game_answers',
      'question_library',
      'memories',
      'letters',
      'calendar_events',
      'shared_notes',
      'user_preferences',
      'call_sessions',
    ]

    for (const table of requiredRlsTables) {
      const rlsStatement = `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
      expect(
        migrationSql.includes(rlsStatement),
        `Table "${table}" must have RLS explicitly enabled: ${rlsStatement}`
      ).toBe(true)
    }
  })

  it('strictly isolates messages to authorized space members only', () => {
    expect(migrationSql).toContain('CREATE POLICY "messages_member_read" ON messages FOR SELECT USING')
    expect(migrationSql).toContain('WHERE user_id = auth.uid()')
    expect(migrationSql).toContain('expires_at > now()')
    expect(migrationSql).toContain('is_deleted = false')
  })

  it('enforces blind-reveal secrecy on game answers', () => {
    expect(migrationSql).toContain('CREATE POLICY "answers_reveal_read" ON game_answers FOR SELECT USING')
    expect(migrationSql).toContain("status IN ('revealing', 'complete')")
  })

  it('enforces strict private journal protection', () => {
    expect(migrationSql).toContain('CREATE POLICY "notes_read" ON shared_notes')
    expect(migrationSql).toContain('(is_shared = false AND created_by = auth.uid())')
  })

  it('enforces maximum 2 members per private space trigger', () => {
    expect(migrationSql).toContain('check_space_member_limit')
    expect(migrationSql).toContain('enforce_space_member_limit')
    expect(migrationSql).toContain('maximum 2 members per space')
  })

  it('provides server-authoritative mark_message_viewed procedure', () => {
    expect(migrationSql).toContain('CREATE OR REPLACE FUNCTION mark_message_viewed')
    expect(migrationSql).toContain('v_new_expires_at := CASE v_expires_mode')
    expect(migrationSql).toContain("'just_seen'  THEN now()")
    expect(migrationSql).toContain("'1_second'   THEN now() + INTERVAL '1 second'")
    expect(migrationSql).toContain("'5_minutes'  THEN now() + INTERVAL '5 minutes'")
    expect(migrationSql).toContain("'1_hour'     THEN now() + INTERVAL '1 hour'")
    expect(migrationSql).toContain("'24_hours'   THEN now() + INTERVAL '24 hours'")
  })
})
