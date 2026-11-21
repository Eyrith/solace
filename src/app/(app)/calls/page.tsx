'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
  Shield,
  ArrowLeft,
  Clock,
  Sparkles,
  Wifi,
} from 'lucide-react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useConnectionState,
  useLocalParticipant,
  useTracks,
} from '@livekit/components-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBanner } from '@/components/ui/status-banner'
import { useSanctuary } from '@/components/providers/sanctuary-provider'
import {
  listLocalCalls,
  logLocalCall,
  subscribeLocalSanctuary,
} from '@/lib/sanctuary/local-store'

interface CallHistoryItem {
  id: string
  call_type: string
  status: string
  started_at?: string | null
  duration_sec?: number | null
  created_at?: string | null
  initiator_role?: 'self' | 'partner'
}

interface ActiveCallSession {
  callId: string | null
  token: string
  room: string
  serverUrl: string
  isDemo: boolean
  callType: 'video' | 'voice'
}

interface CallStageProps {
  callType: 'video' | 'voice'
  micEnabled: boolean
  cameraEnabled: boolean
  callDuration: number
  partnerName: string
  onToggleMic: () => void
  onToggleCamera: () => void
  onEndCall: () => void
}

function formatDuration(sec: number): string {
  const mins = Math.floor(sec / 60)
  const s = sec % 60
  return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function mapLocalCallsToHistory(spaceId: string): CallHistoryItem[] {
  return listLocalCalls(spaceId).map((record) => ({
    id: record.id,
    call_type: record.callType,
    status: record.status,
    started_at: record.startedAt,
    duration_sec: record.durationSec,
    initiator_role: record.initiatorRole,
  }))
}

function releaseVideoStream(
  streamRef: { current: MediaStream | null },
  videoRef: { current: HTMLVideoElement | null },
) {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }
  if (videoRef.current) {
    videoRef.current.srcObject = null
  }
}

function SanctuaryLiveKitStage({
  callType,
  micEnabled,
  cameraEnabled,
  callDuration,
  partnerName,
  onToggleMic,
  onToggleCamera,
  onEndCall,
}: CallStageProps) {
  const connectionState = useConnectionState()
  const { localParticipant } = useLocalParticipant()
  const tracks = useTracks()

  React.useEffect(() => {
    void localParticipant.setMicrophoneEnabled(micEnabled).catch(() => {})
  }, [localParticipant, micEnabled])

  React.useEffect(() => {
    void localParticipant
      .setCameraEnabled(callType === 'video' && cameraEnabled)
      .catch(() => {})
  }, [localParticipant, callType, cameraEnabled])

  const cameraTracks = tracks.filter((t) => String(t.source) === 'camera')
  const remoteVideoTrack = cameraTracks.find((t) => !t.participant.isLocal)
  const localVideoTrack = cameraTracks.find((t) => t.participant.isLocal)
  const stateLabel = String(connectionState)

  return (
    <div className="relative h-full w-full flex flex-col justify-between p-6 text-white">
      <RoomAudioRenderer />

      {/* Top status bar */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3 bg-black/45 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              stateLabel === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="font-mono">{formatDuration(callDuration)}</span>
          <span className="text-neutral-300 flex items-center gap-1">
            <Wifi className="h-3 w-3 text-emerald-400" />
            <span className="capitalize">{stateLabel}</span>
          </span>
        </div>

        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-normal">
          LiveKit DTLS-SRTP Media
        </Badge>
      </div>

      {/* Main remote stage */}
      <div className="relative z-10 flex-1 flex items-center justify-center my-4 overflow-hidden rounded-[var(--ds-radius)]">
        {callType === 'video' && remoteVideoTrack ? (
          <VideoTrack
            trackRef={remoteVideoTrack}
            className="h-full w-full object-cover rounded-[var(--ds-radius)]"
          />
        ) : (
          <div className="text-center space-y-4">
            <div className="mx-auto h-24 w-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-3xl">
              {callType === 'voice' ? '🎙️' : '🎥'}
            </div>
            <div>
              <h3 className="text-xl font-medium">{partnerName}</h3>
              <p className="text-xs text-neutral-300 mt-1">
                {stateLabel === 'connected'
                  ? callType === 'voice'
                    ? 'Private audio channel open'
                    : 'Connected — waiting for partner video stream'
                  : 'Connecting to LiveKit media room...'}
              </p>
            </div>
          </div>
        )}

        {/* Picture-in-Picture self video */}
        {callType === 'video' && cameraEnabled && localVideoTrack && (
          <div className="absolute bottom-3 right-3 h-28 w-40 rounded-lg border border-white/20 bg-neutral-900 overflow-hidden shadow-lg">
            <VideoTrack trackRef={localVideoTrack} className="h-full w-full object-cover" />
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="relative z-10 flex items-center justify-center gap-4">
        <Button
          type="button"
          onClick={onToggleMic}
          variant="ghost"
          className={`h-12 w-12 rounded-full border transition-all cursor-pointer ${
            micEnabled
              ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              : 'bg-rose-500/80 border-rose-500 text-white hover:bg-rose-600'
          }`}
          aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>

        {callType === 'video' && (
          <Button
            type="button"
            onClick={onToggleCamera}
            variant="ghost"
            className={`h-12 w-12 rounded-full border transition-all cursor-pointer ${
              cameraEnabled
                ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                : 'bg-rose-500/80 border-rose-500 text-white hover:bg-rose-600'
            }`}
            aria-label={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>
        )}

        <Button
          type="button"
          onClick={onEndCall}
          variant="destructive"
          className="h-12 px-6 rounded-full cursor-pointer font-medium"
        >
          <PhoneOff className="h-4 w-4 mr-2" />
          <span>End Call</span>
        </Button>
      </div>
    </div>
  )
}

export default function VideoCallPage() {
  const { activeSpace, activeSpaceId, configured, demoActor } = useSanctuary()
  const [callType, setCallType] = React.useState<'video' | 'voice'>('video')
  const [micEnabled, setMicEnabled] = React.useState(true)
  const [cameraEnabled, setCameraEnabled] = React.useState(true)
  const [previewActive, setPreviewActive] = React.useState(false)
  const [sandboxCameraActive, setSandboxCameraActive] = React.useState(false)
  const [startingCall, setStartingCall] = React.useState(false)
  const [activeCall, setActiveCall] = React.useState<ActiveCallSession | null>(null)
  const [callDuration, setCallDuration] = React.useState(0)
  const [history, setHistory] = React.useState<CallHistoryItem[]>([])
  const [error, setError] = React.useState<string | null>(null)

  const previewVideoRef = React.useRef<HTMLVideoElement | null>(null)
  const previewStreamRef = React.useRef<MediaStream | null>(null)
  const callVideoRef = React.useRef<HTMLVideoElement | null>(null)
  const callStreamRef = React.useRef<MediaStream | null>(null)

  const partnerName = activeSpace?.partner?.displayName ?? 'Your Partner'
  const effectiveSpaceId = activeSpaceId ?? 'space-1'

  const fetchCallHistory = React.useCallback(async () => {
    if (!configured) {
      setHistory(mapLocalCallsToHistory(effectiveSpaceId))
      return
    }
    if (!activeSpaceId) {
      setHistory([])
      return
    }
    try {
      const res = await fetch(`/api/livekit/calls?spaceId=${encodeURIComponent(activeSpaceId)}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const payload = await res.json()
      setHistory(Array.isArray(payload.calls) ? (payload.calls as CallHistoryItem[]) : [])
    } catch {}
  }, [configured, activeSpaceId, effectiveSpaceId])

  React.useEffect(() => {
    let active = true
    if (!configured) {
      const syncLocalHistory = () => {
        if (active) setHistory(mapLocalCallsToHistory(effectiveSpaceId))
      }
      Promise.resolve().then(syncLocalHistory)
      const unsubscribe = subscribeLocalSanctuary(syncLocalHistory)
      return () => {
        active = false
        unsubscribe()
      }
    }

    if (!activeSpaceId) {
      Promise.resolve().then(() => {
        if (active) setHistory([])
      })
      return () => {
        active = false
      }
    }

    fetch(`/api/livekit/calls?spaceId=${encodeURIComponent(activeSpaceId)}`, {
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active || !payload) return
        setHistory(Array.isArray(payload.calls) ? (payload.calls as CallHistoryItem[]) : [])
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [configured, activeSpaceId, effectiveSpaceId])

  const stopPreviewStream = React.useCallback(() => {
    releaseVideoStream(previewStreamRef, previewVideoRef)
    setPreviewActive(false)
  }, [])

  const stopCallStream = React.useCallback(() => {
    releaseVideoStream(callStreamRef, callVideoRef)
    setSandboxCameraActive(false)
  }, [])

  React.useEffect(() => {
    return () => {
      stopPreviewStream()
      stopCallStream()
    }
  }, [stopPreviewStream, stopCallStream])

  React.useEffect(() => {
    if (!activeCall) return
    const interval = window.setInterval(() => {
      setCallDuration((prev) => prev + 1)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [activeCall])

  const requestCameraInto = async (
    streamRef: { current: MediaStream | null },
    videoRef: { current: HTMLVideoElement | null },
    setActive: (val: boolean) => void,
  ): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Camera preview is unavailable in this browser.')
      return false
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      setActive(true)
      window.requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
      return true
    } catch {
      setError('Camera permission denied or no camera device detected.')
      return false
    }
  }

  const handleTogglePreviewCamera = async () => {
    setError(null)
    if (previewActive) {
      stopPreviewStream()
      return
    }
    await requestCameraInto(previewStreamRef, previewVideoRef, setPreviewActive)
  }

  const handleToggleSandboxCallCamera = async () => {
    setError(null)
    if (sandboxCameraActive) {
      stopCallStream()
      setCameraEnabled(false)
      return
    }
    const ok = await requestCameraInto(callStreamRef, callVideoRef, setSandboxCameraActive)
    setCameraEnabled(ok)
  }

  const handleStartCall = async (kind: 'video' | 'voice') => {
    setError(null)
    setCallType(kind)
    stopPreviewStream()
    stopCallStream()
    setMicEnabled(true)
    setCameraEnabled(kind === 'video')
    setStartingCall(true)

    try {
      const tokenRes = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId: effectiveSpaceId }),
      }).catch(() => null)

      if (!tokenRes || !tokenRes.ok) {
        if (!configured) {
          setCallDuration(0)
          setActiveCall({
            callId: `local-${Date.now()}`,
            token: 'local-sandbox',
            room: `sanctuary-${effectiveSpaceId}`,
            serverUrl: '',
            isDemo: true,
            callType: kind,
          })
          return
        }
        const tokenPayload = tokenRes ? await tokenRes.json().catch(() => null) : null
        setError(tokenPayload?.detail || tokenPayload?.error || 'Could not obtain LiveKit call token.')
        return
      }

      const tokenPayload = await tokenRes.json()
      let createdCallId: string | null = null
      const startRes = await fetch('/api/livekit/calls/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: effectiveSpaceId,
          callType: kind,
          roomName: tokenPayload.room,
        }),
      }).catch(() => null)
      if (startRes?.ok) {
        const startPayload = await startRes.json()
        createdCallId = startPayload?.call?.id ?? null
      }

      setCallDuration(0)
      setActiveCall({
        callId: createdCallId,
        token: tokenPayload.token,
        room: tokenPayload.room,
        serverUrl: tokenPayload.serverUrl,
        isDemo: Boolean(tokenPayload.isDemo),
        callType: kind,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to start call.')
    } finally {
      setStartingCall(false)
    }
  }

  const handleHangup = React.useCallback(async () => {
    const current = activeCall
    const duration = callDuration
    stopCallStream()
    setActiveCall(null)
    setCallDuration(0)

    if (!current) return

    if (!configured) {
      logLocalCall(effectiveSpaceId, {
        callType: current.callType,
        durationSec: duration,
      })
      void fetchCallHistory()
      return
    }

    if (current.callId && !current.callId.startsWith('demo-')) {
      await fetch(`/api/livekit/calls/${encodeURIComponent(current.callId)}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationSec: duration }),
      }).catch(() => {})
      void fetchCallHistory()
    }
  }, [activeCall, callDuration, configured, effectiveSpaceId, fetchCallHistory, stopCallStream])

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <Link
          href={activeSpaceId ? `/messages/${activeSpaceId}` : '/home'}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sanctuary</span>
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-normal gap-1.5">
            <Shield className="h-3 w-3 text-emerald-500" />
            <span>1:1 Private Space Channel</span>
          </Badge>
        </div>
      </div>

      {error && (
        <StatusBanner tone="error" title="Call Issue" description={error} />
      )}

      {activeCall?.isDemo && (
        <StatusBanner
          tone="info"
          title={
            configured
              ? 'LiveKit Credentials Required for Live WebRTC'
              : 'Local Sandbox Call Lounge Active'
          }
          description={
            configured
              ? 'Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and NEXT_PUBLIC_LIVEKIT_URL in .env.local to establish real audio/video streams between browsers. Call metadata is still tracked cleanly.'
              : `Simulating a private 1:1 lounge as ${demoActor === 'self' ? 'You' : partnerName}. You can test your local camera, mute controls, and live duration — ending the call logs it to your browser history. Connect LiveKit in .env.local for partner-to-partner WebRTC streams.`
          }
        />
      )}

      {/* Main Viewport Stage */}
      <div className="relative aspect-video sm:aspect-[16/9] w-full rounded-[var(--ds-radius)] border border-[var(--border)] bg-neutral-950 overflow-hidden shadow-md flex flex-col justify-between">
        {!activeCall ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center space-y-5 relative">
            {previewActive && (
              <video
                ref={previewVideoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover opacity-80"
              />
            )}

            <div className="relative z-10 space-y-2 bg-black/50 backdrop-blur-md px-6 py-5 rounded-[var(--ds-radius)] border border-white/10 max-w-md">
              <h2 className="font-[family-name:var(--ds-font-display)] text-2xl font-bold text-white">
                Private Lounge with {partnerName}
              </h2>
              <p className="text-xs text-neutral-300">
                No call recording, no third-party spectators, exclusively room-scoped for your space.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-3">
                <Button
                  onClick={() => void handleStartCall('video')}
                  variant="primary"
                  isLoading={startingCall && callType === 'video'}
                >
                  <Video className="h-4 w-4 mr-1.5" />
                  <span>Start Video Call</span>
                </Button>
                <Button
                  onClick={() => void handleStartCall('voice')}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  isLoading={startingCall && callType === 'voice'}
                >
                  <PhoneCall className="h-4 w-4 mr-1.5" />
                  <span>Voice Only</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleTogglePreviewCamera()}
                  className="text-neutral-200 hover:text-white hover:bg-white/10 text-xs"
                >
                  {previewActive ? 'Stop Preview' : 'Preview Camera'}
                </Button>
              </div>
            </div>
          </div>
        ) : activeCall.isDemo ? (
          <div className="relative h-full w-full flex flex-col justify-between p-6 text-white">
            {activeCall.callType === 'video' && sandboxCameraActive && (
              <video
                ref={callVideoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover opacity-85"
              />
            )}

            <div className="relative z-10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 bg-black/55 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono">{formatDuration(callDuration)}</span>
                <span className="text-neutral-200">
                  {configured ? 'Standby (LiveKit unconfigured)' : 'Local Sandbox Lounge'}
                </span>
              </div>
              <Badge className="bg-black/45 text-neutral-200 border-white/15 font-normal text-[11px]">
                {micEnabled ? 'Mic live' : 'Mic muted'}
              </Badge>
            </div>

            <div className="relative z-10 text-center space-y-2 my-auto">
              <div className="mx-auto inline-flex flex-col items-center gap-2 rounded-[var(--ds-radius)] bg-black/45 backdrop-blur-md px-6 py-4 border border-white/10">
                <div className="h-16 w-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-2xl">
                  {activeCall.callType === 'voice' ? '🎙️' : '📹'}
                </div>
                <h3 className="text-lg font-medium">{partnerName}</h3>
                <p className="text-xs text-neutral-300">
                  Room <span className="font-mono">{activeCall.room}</span> ·{' '}
                  {sandboxCameraActive
                    ? 'Self-camera active in sandbox preview'
                    : configured
                      ? 'Awaits live LiveKit credentials'
                      : 'Local sandbox session ready'}
                </p>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-center gap-3">
              <Button
                type="button"
                onClick={() => setMicEnabled((v) => !v)}
                variant="ghost"
                className={`h-11 w-11 rounded-full border transition-all cursor-pointer ${
                  micEnabled
                    ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    : 'bg-rose-500/80 border-rose-500 text-white hover:bg-rose-600'
                }`}
                aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>

              {activeCall.callType === 'video' && (
                <Button
                  type="button"
                  onClick={() => void handleToggleSandboxCallCamera()}
                  variant="ghost"
                  className={`h-11 px-4 rounded-full border transition-all cursor-pointer text-xs gap-1.5 ${
                    sandboxCameraActive
                      ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-100 hover:bg-emerald-500/35'
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  }`}
                  aria-label={sandboxCameraActive ? 'Turn off self camera' : 'Turn on self camera'}
                >
                  {sandboxCameraActive ? (
                    <>
                      <Video className="h-4 w-4" />
                      <span>Camera On</span>
                    </>
                  ) : (
                    <>
                      <VideoOff className="h-4 w-4" />
                      <span>Test Self Camera</span>
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={() => void handleHangup()}
                variant="destructive"
                className="h-11 px-6 rounded-full cursor-pointer"
              >
                <PhoneOff className="h-4 w-4 mr-2" />
                <span>End Session</span>
              </Button>
            </div>
          </div>
        ) : (
          <LiveKitRoom
            serverUrl={activeCall.serverUrl}
            token={activeCall.token}
            connect={true}
            audio={micEnabled}
            video={activeCall.callType === 'video' && cameraEnabled}
            onDisconnected={() => void handleHangup()}
            onError={(err) => setError(err.message)}
            className="h-full w-full"
          >
            <SanctuaryLiveKitStage
              callType={activeCall.callType}
              micEnabled={micEnabled}
              cameraEnabled={cameraEnabled}
              callDuration={callDuration}
              partnerName={partnerName}
              onToggleMic={() => setMicEnabled((v) => !v)}
              onToggleCamera={() => setCameraEnabled((v) => !v)}
              onEndCall={() => void handleHangup()}
            />
          </LiveKitRoom>
        )}
      </div>

      {/* Call History Table */}
      <section className="space-y-4">
        <h3 className="font-[family-name:var(--ds-font-display)] text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--primary)]" />
          <span>Recent Sanctuary Calls</span>
        </h3>

        {history.length === 0 ? (
          <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 text-xs text-[var(--muted-foreground)] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--primary)] shrink-0" />
            <span>
              {configured
                ? 'No calls recorded in this sanctuary yet. Start a voice or video session above.'
                : 'No local sandbox calls logged in this space yet. Start a voice or video session above and end it to save history locally.'}
            </span>
          </div>
        ) : (
          <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
            {history.map((c) => {
              const timestamp = c.started_at ?? c.created_at
              return (
                <div key={c.id} className="flex items-center justify-between p-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[var(--muted)] flex items-center justify-center text-[var(--primary)]">
                      {c.call_type === 'video' ? (
                        <Video className="h-4 w-4" />
                      ) : (
                        <PhoneCall className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--foreground)] capitalize">
                        {c.call_type} Call ({c.status})
                      </div>
                      <div className="text-[11px] text-[var(--muted-foreground)]">
                        {timestamp ? new Date(timestamp).toLocaleString() : 'Recent session'}
                        {c.initiator_role &&
                          ` · Started by ${c.initiator_role === 'self' ? 'You' : partnerName}`}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {typeof c.duration_sec === 'number'
                      ? formatDuration(c.duration_sec)
                      : c.status === 'active'
                        ? 'Active'
                        : 'Ended'}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
