import { describe, expect, it, vi } from 'vitest'
import {
  LiveKitDataChannelSignaler,
  LIVEKIT_SIGNAL_TOPIC,
  LIVEKIT_COMPANION_TOPIC,
} from '@/lib/sanctuary/livekit-data-channel'
import { RoomEvent } from 'livekit-client'

describe('Direct LiveKit WebRTC Data Channels', () => {
  it('instantiates and attaches to a LiveKit room', () => {
    const mockRoom: any = {
      state: 'connected',
      on: vi.fn(),
      off: vi.fn(),
      localParticipant: {
        publishData: vi.fn().mockResolvedValue(undefined),
      },
    }

    const signaler = new LiveKitDataChannelSignaler(mockRoom, 'me')
    expect(mockRoom.on).toHaveBeenCalledWith(RoomEvent.DataReceived, expect.any(Function))

    signaler.destroy()
    expect(mockRoom.off).toHaveBeenCalledWith(RoomEvent.DataReceived, expect.any(Function))
  })

  it('publishes signals over reliable WebRTC SCTP data channels', async () => {
    const publishData = vi.fn().mockResolvedValue(undefined)
    const mockRoom: any = {
      state: 'connected',
      on: vi.fn(),
      off: vi.fn(),
      localParticipant: {
        publishData,
      },
    }

    const signaler = new LiveKitDataChannelSignaler(mockRoom, 'me')
    const ok = await signaler.sendSignal('offer', { sdp: 'v=0...' })

    expect(ok).toBe(true)
    expect(publishData).toHaveBeenCalledTimes(1)
    const [payload, options] = publishData.mock.calls[0]
    expect(options).toEqual({ reliable: true, topic: LIVEKIT_SIGNAL_TOPIC })

    const decoded = JSON.parse(new TextDecoder().decode(payload))
    expect(decoded.type).toBe('offer')
    expect(decoded.sender).toBe('me')
    expect(decoded.payload.sdp).toBe('v=0...')
  })

  it('receives and dispatches data channel packets to listeners without polling', () => {
    let capturedHandler: any = null
    const mockRoom: any = {
      state: 'connected',
      on: vi.fn((event, handler) => {
        if (event === RoomEvent.DataReceived) {
          capturedHandler = handler
        }
      }),
      off: vi.fn(),
    }

    const signaler = new LiveKitDataChannelSignaler(mockRoom, 'me')
    const receivedPackets: any[] = []

    const unsub = signaler.onSignal('mute_state', (packet) => {
      receivedPackets.push(packet)
    })

    // Simulate incoming LiveKit DataPacket directly from peer over WebRTC
    const testPacket = {
      id: 'pkt-123',
      sender: 'partner',
      type: 'mute_state',
      payload: { micMuted: true, cameraMuted: false },
      timestamp: Date.now(),
    }
    const rawBytes = new TextEncoder().encode(JSON.stringify(testPacket))

    capturedHandler(rawBytes, undefined, undefined, LIVEKIT_SIGNAL_TOPIC)

    expect(receivedPackets).toHaveLength(1)
    expect(receivedPackets[0].payload.micMuted).toBe(true)

    unsub()
  })

  it('broadcasts companion sync actions over dedicated companion data channel topic', async () => {
    const publishData = vi.fn().mockResolvedValue(undefined)
    const mockRoom: any = {
      state: 'connected',
      on: vi.fn(),
      off: vi.fn(),
      localParticipant: { publishData },
    }

    const signaler = new LiveKitDataChannelSignaler(mockRoom, 'me')
    await signaler.sendCompanionAction('heart_reaction', { x: 100, y: 200 })

    expect(publishData).toHaveBeenCalledWith(expect.any(Uint8Array), {
      reliable: true,
      topic: LIVEKIT_COMPANION_TOPIC,
    })
  })
})
