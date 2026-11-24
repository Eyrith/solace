import { beforeEach, describe, expect, it } from 'vitest'
import {
  createLocalInvite,
  createLocalSpace,
  getLocalSanctuaryState,
  renameLocalSpace,
  resetLocalSanctuaryState,
} from '@/lib/sanctuary/local-store'
import { getDecoyAlias } from '@/components/sanctuary/private-shell'
import { getDecoyPreset } from '@/app/(app)/home/page'

describe('Partner connection simplification and camouflage alias features', () => {
  beforeEach(() => {
    resetLocalSanctuaryState()
  })

  it('assigns custom camouflage disguise alias and auto-burn timer to 1:1 connection', () => {
    const { space } = createLocalSpace(
      'Maya',
      'Maya',
      'Stoic Notes',
      '24h'
    )
    expect(space.name).toBe('Maya')
    expect(space.partnerName).toBe('Maya')
    expect(space.camouflageAlias).toBe('Stoic Notes')
    expect(space.burnTimer).toBe('24h')

    const state = getLocalSanctuaryState()
    const stored = state.spaces.find((s) => s.id === space.id)
    expect(stored?.camouflageAlias).toBe('Stoic Notes')
    expect(stored?.burnTimer).toBe('24h')
  })

  it('updates camouflage alias and burn timer on connection rename', () => {
    const { space } = createLocalSpace('Elena', 'Elena')
    expect(space.camouflageAlias).toBeNull()

    renameLocalSpace(space.id, 'Elena', 'Elena', 'Research Draft', '1h')
    const updated = getLocalSanctuaryState().spaces.find((s) => s.id === space.id)
    expect(updated?.camouflageAlias).toBe('Research Draft')
    expect(updated?.burnTimer).toBe('1h')
  })

  it('generates consistent educational decoy tags for discreet sidebar camouflage', () => {
    expect(getDecoyAlias('Maya', 0)).toBe('Stoic Notes')
    expect(getDecoyAlias('Elena', 1)).toBe('Research Draft')
    expect(getDecoyAlias('Sophia', 2)).toBe('Reading Journal')
    expect(getDecoyAlias('Custom', 0, 'Philosophy Seminar')).toBe('Philosophy Seminar')

    expect(getDecoyPreset(0)).toBe('Stoic Notes')
    expect(getDecoyPreset(1)).toBe('Research Draft')
    expect(getDecoyPreset(0, 'Marcus Aurelius Meditations')).toBe('Marcus Aurelius Meditations')
  })

  it('generates single-use invite link for instant 1-click partner connection', () => {
    const { space } = createLocalSpace('Maya', 'Maya', 'Stoic Notes')
    const { inviteUrl, invite } = createLocalInvite(space.id, 'https://solace.dpdns.org')

    expect(inviteUrl).toBe(`https://solace.dpdns.org/invite/${invite.token}`)
    expect(invite.spaceId).toBe(space.id)
    expect(invite.token).toMatch(/^local-inv-/)
  })

  it('supports direct 1:1 invite generation for partner', () => {
    const { space } = createLocalSpace('Partner', 'Partner')
    const { inviteUrl, invite } = createLocalInvite(space.id, 'http://localhost:3000')
    expect(inviteUrl).toBe(`http://localhost:3000/invite/${invite.token}`)
    expect(invite.spaceId).toBe(space.id)
  })
})
