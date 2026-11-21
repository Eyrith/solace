import { beforeEach, describe, expect, it } from 'vitest'
import { GAME_TEMPLATES } from '@/lib/games/data'
import {
  advanceLocalGameRound,
  answerLocalDailyInquiry,
  createLocalCalendarEvent,
  createLocalGameSession,
  createLocalInvite,
  createLocalMemory,
  createLocalSpace,
  deleteLocalMessage,
  editLocalMessage,
  getLocalDailyInquiry,
  getLocalGameSession,
  inspectLocalInvite,
  listLocalCalendarEvents,
  listLocalMemories,
  listLocalMessages,
  redeemLocalInvite,
  resetLocalSanctuaryState,
  sendLocalMessage,
  setLocalDemoActor,
  submitLocalGameAnswer,
  toggleLocalPin,
  toggleLocalReaction,
  updateLocalMemory,
} from '@/lib/sanctuary/local-store'

describe('Sanctuary local sandbox workspace store', () => {
  beforeEach(() => {
    resetLocalSanctuaryState()
  })

  it('creates spaces, generates invites, and redeems invite tokens', () => {
    const { space } = createLocalSpace('Reading Nook', 'Elena')
    expect(space.name).toBe('Reading Nook')
    expect(space.partnerName).toBe('Elena')

    const { inviteUrl, invite } = createLocalInvite(space.id, 'http://localhost:3002')
    expect(inviteUrl).toContain(`/invite/${invite.token}`)
    expect(inspectLocalInvite(invite.token)?.spaceName).toBe('Reading Nook')

    const redeemed = redeemLocalInvite(invite.token, 'Elena')
    expect(redeemed?.space.id).toBe(space.id)
    expect(redeemed?.space.memberCount).toBe(2)
  })

  it('enforces blind reveal for Daily Inquiry until both perspectives answer', () => {
    setLocalDemoActor('self')
    const initial = getLocalDailyInquiry('space-1')
    expect(initial.revealed).toBe(false)
    expect(initial.partnerAnswer).toBeNull()

    const afterSelf = answerLocalDailyInquiry('space-1', 'Long quiet walk at dusk.', 'self')
    expect(afterSelf.myAnswer).toBe('Long quiet walk at dusk.')
    expect(afterSelf.revealed).toBe(false)
    expect(afterSelf.partnerAnswer).toBeNull()

    setLocalDemoActor('partner')
    const seenByPartnerBeforeAnswer = getLocalDailyInquiry('space-1')
    expect(seenByPartnerBeforeAnswer.hasPartnerAnswered).toBe(true)
    expect(seenByPartnerBeforeAnswer.partnerAnswer).toBeNull()
    expect(seenByPartnerBeforeAnswer.revealed).toBe(false)

    const afterPartner = answerLocalDailyInquiry('space-1', 'Tea on the balcony together.', 'partner')
    expect(afterPartner.revealed).toBe(true)
    expect(afterPartner.myAnswer).toBe('Tea on the balcony together.')
    expect(afterPartner.partnerAnswer).toBe('Long quiet walk at dusk.')
  })

  it('supports two-sided blind-reveal game sessions through completion', () => {
    const template = GAME_TEMPLATES[0]
    const created = createLocalGameSession('space-1', template.id)
    expect(created.status).toBe('waiting_partner')

    for (let i = 0; i < template.questions.length; i += 1) {
      const q = template.questions[i]
      const answerA = q.options?.[0] ?? `Answer ${i}A`
      const answerB = q.options?.[0] ?? `Answer ${i}B`
      submitLocalGameAnswer('space-1', created.id, q.id, answerA, 'self')
      const mid = getLocalGameSession('space-1', created.id)!
      expect(mid.answersByQuestion[q.id]?.self).toBe(answerA)
      expect(mid.answersByQuestion[q.id]?.partner).toBeUndefined()

      submitLocalGameAnswer('space-1', created.id, q.id, answerB, 'partner')
      if (i < template.questions.length - 1) {
        advanceLocalGameRound('space-1', created.id, i + 1)
      }
    }

    const completed = getLocalGameSession('space-1', created.id)!
    expect(completed.status).toBe('completed')
  })

  it('isolates private journal entries by author unless explicitly shared', () => {
    const privateEntry = createLocalMemory('space-1', {
      type: 'journal',
      title: 'Private Note from Self',
      content: 'Only for my eyes until shared.',
      entryDate: '2026-11-11',
      isShared: false,
      actor: 'self',
    })

    expect(listLocalMemories('space-1', 'self').some((e) => e.id === privateEntry.id)).toBe(true)
    expect(listLocalMemories('space-1', 'partner').some((e) => e.id === privateEntry.id)).toBe(false)

    updateLocalMemory('space-1', privateEntry.id, { isShared: true })
    expect(listLocalMemories('space-1', 'partner').some((e) => e.id === privateEntry.id)).toBe(true)
  })

  it('handles chat editing, reactions, pinning, deletion, and calendar milestones', () => {
    const msg = sendLocalMessage('space-1', { text: 'Initial message', actor: 'self' })
    editLocalMessage('space-1', msg.id, 'Edited thoughtful message')
    toggleLocalPin('space-1', msg.id)
    toggleLocalReaction('space-1', msg.id, '💛', 'partner')

    const fetched = listLocalMessages('space-1').find((m) => m.id === msg.id)
    expect(fetched?.text).toBe('Edited thoughtful message')
    expect(fetched?.edited).toBe(true)
    expect(fetched?.pinned).toBe(true)
    expect(fetched?.reactions['💛']).toEqual(['partner'])

    deleteLocalMessage('space-1', msg.id)
    expect(listLocalMessages('space-1').some((m) => m.id === msg.id)).toBe(false)

    const ev = createLocalCalendarEvent('space-1', {
      title: 'Weekend Cabin Trip',
      eventDate: '2026-12-20',
      eventType: 'trip',
      recurringYearly: false,
    })
    expect(listLocalCalendarEvents('space-1').some((item) => item.id === ev.id)).toBe(true)
  })
})

