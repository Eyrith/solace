import { describe, it, expect, vi } from 'vitest'
import { POST as handleSend } from '@/app/api/messages/send/route'
import { POST as handleView } from '@/app/api/messages/view/route'
import { POST as handleCreateSpace } from '@/app/api/spaces/create/route'
import { POST as handleInvite } from '@/app/api/spaces/invite/route'
import { NextRequest } from 'next/server'

describe('Private Space & Messaging API Endpoints', () => {
  it('handles message sending with disappearing timers', async () => {
    const req = new NextRequest('http://localhost:3000/api/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        spaceId: 'space-test-1',
        content: 'Confidential love note',
        expiresMode: '5m',
      }),
    })

    const res = await handleSend(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message).toBeDefined()
    expect(json.message.content).toBe('Confidential love note')
    expect(json.message.expires_mode).toBe('5m')
  })

  it('rejects sending without spaceId or content', async () => {
    const req = new NextRequest('http://localhost:3000/api/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        spaceId: '',
        content: '',
      }),
    })

    const res = await handleSend(req)
    expect(res.status).toBe(400)
  })

  it('handles mark_as_viewed receipt endpoint', async () => {
    const req = new NextRequest('http://localhost:3000/api/messages/view', {
      method: 'POST',
      body: JSON.stringify({
        messageId: 'msg-test-123',
      }),
    })

    const res = await handleView(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.messageId).toBe('msg-test-123')
  })

  it('creates private space and handles single-use invitation generation', async () => {
    const createReq = new NextRequest('http://localhost:3000/api/spaces/create', {
      method: 'POST',
      body: JSON.stringify({ name: 'Our Secret Garden' }),
    })

    const createRes = await handleCreateSpace(createReq)
    const createJson = await createRes.json()

    expect(createRes.status).toBe(200)
    expect(createJson.space.name).toBe('Our Secret Garden')

    const inviteReq = new NextRequest('http://localhost:3000/api/spaces/invite', {
      method: 'POST',
      body: JSON.stringify({ spaceId: createJson.space.id }),
    })

    const inviteRes = await handleInvite(inviteReq)
    const inviteJson = await inviteRes.json()

    expect(inviteRes.status).toBe(200)
    expect(inviteJson.inviteUrl).toContain('/invite/')
  })
})

