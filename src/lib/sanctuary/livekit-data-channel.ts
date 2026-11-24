/**
 * Direct LiveKit Data Channels for Ultra-Low Latency Peer-to-Peer Calls.
 *
 * Replaces HTTP polling/relaying (/api/stealth/signal/poll) with sub-15ms
 * WebRTC SCTP data channels directly inside the connected LiveKit room.
 */

import { RoomEvent, type Room, type RemoteParticipant, type DataPacket_Kind } from 'livekit-client'

export const LIVEKIT_SIGNAL_TOPIC = 'webrtc_signal'
export const LIVEKIT_COMPANION_TOPIC = 'companion_sync'

export type SignalType =
  | 'offer'
  | 'answer'
  | 'candidate'
  | 'call_start'
  | 'call_end'
  | 'mute_state'
  | 'companion_action'
  | 'ping'
  | 'pong'

export interface LiveKitSignalPacket {
  id: string
  sender: string
  type: SignalType
  payload: Record<string, any>
  timestamp: number
  latencyMs?: number
}

export type SignalHandler = (packet: LiveKitSignalPacket, participant?: RemoteParticipant) => void

/**
 * Manages low-latency bidirectional signaling over LiveKit WebRTC Data Channels.
 */
export class LiveKitDataChannelSignaler {
  private room: Room | null = null
  private senderId: string
  private listeners: Map<string, Set<SignalHandler>> = new Map()
  private cleanupDataListener: (() => void) | null = null

  constructor(room: Room | null, senderId: string = 'me') {
    this.senderId = senderId
    this.attachRoom(room)
  }

  attachRoom(room: Room | null) {
    if (this.room === room) return

    // Detach old listener
    if (this.cleanupDataListener) {
      this.cleanupDataListener()
      this.cleanupDataListener = null
    }

    this.room = room
    if (!room) return

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: RemoteParticipant,
      _kind?: DataPacket_Kind,
      topic?: string
    ) => {
      if (topic !== LIVEKIT_SIGNAL_TOPIC && topic !== LIVEKIT_COMPANION_TOPIC) {
        return
      }

      try {
        const text = new TextDecoder().decode(payload)
        const packet: LiveKitSignalPacket = JSON.parse(text)

        // Dispatch to type-specific and wildcard listeners
        const typeListeners = this.listeners.get(packet.type)
        if (typeListeners) {
          typeListeners.forEach((handler) => handler(packet, participant))
        }

        const wildcardListeners = this.listeners.get('*')
        if (wildcardListeners) {
          wildcardListeners.forEach((handler) => handler(packet, participant))
        }
      } catch (err) {
        console.error('[LiveKitDataChannel] Failed to parse incoming signal packet:', err)
      }
    }

    room.on(RoomEvent.DataReceived, handleDataReceived)
    this.cleanupDataListener = () => {
      room.off(RoomEvent.DataReceived, handleDataReceived)
    }
  }

  /**
   * Send a signal packet directly over LiveKit WebRTC Data Channel.
   * Transmits via reliable SCTP data channel with single-digit millisecond latency.
   */
  async sendSignal(
    type: SignalType,
    payload: Record<string, any> = {},
    topic: string = LIVEKIT_SIGNAL_TOPIC
  ): Promise<boolean> {
    const packet: LiveKitSignalPacket = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender: this.senderId,
      type,
      payload,
      timestamp: Date.now(),
    }

    if (this.room && this.room.state === 'connected') {
      try {
        const data = new TextEncoder().encode(JSON.stringify(packet))
        await this.room.localParticipant.publishData(data, {
          reliable: true,
          topic,
        })
        return true
      } catch (err) {
        console.warn('[LiveKitDataChannel] Failed to publish over data channel:', err)
      }
    }

    // Local fallback loopback for demo / offline sandbox mode
    const typeListeners = this.listeners.get(packet.type)
    if (typeListeners) {
      setTimeout(() => typeListeners.forEach((h) => h(packet)), 5)
    }
    return false
  }

  /**
   * Subscribe to incoming signals of a specific type (or '*' for all).
   */
  onSignal(type: SignalType | '*', handler: SignalHandler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(handler)

    return () => {
      const set = this.listeners.get(type)
      if (set) {
        set.delete(handler)
        if (set.size === 0) {
          this.listeners.delete(type)
        }
      }
    }
  }

  /**
   * Broadcast mute state (mic / camera) instantly to peer over Data Channel.
   */
  async sendMuteState(micMuted: boolean, cameraMuted: boolean): Promise<boolean> {
    return this.sendSignal('mute_state', { micMuted, cameraMuted })
  }

  /**
   * Broadcast companion activities (e.g. reaction, game invite, photo reveal) over Data Channel.
   */
  async sendCompanionAction(action: string, data: Record<string, any> = {}): Promise<boolean> {
    return this.sendSignal(
      'companion_action',
      { action, ...data },
      LIVEKIT_COMPANION_TOPIC
    )
  }

  destroy() {
    if (this.cleanupDataListener) {
      this.cleanupDataListener()
      this.cleanupDataListener = null
    }
    this.listeners.clear()
    this.room = null
  }
}
