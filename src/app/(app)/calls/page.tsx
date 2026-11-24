'use client'

import * as React from 'react'
import {
  Video,
  VideoOff,
  PhoneCall,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBanner } from '@/components/ui/status-banner'
import { PageHeader } from '@/components/ui/page-header'
import { getInitials } from '@/components/sanctuary/private-shell'
import { useSanctuary } from '@/components/providers/sanctuary-provider'
import {
  FaceTimeStage,
  formatFaceTimeDuration,
} from '@/components/sanctuary/facetime-stage'
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

export default function VideoCallPage() {
  const { activeSpace, activeSpaceId, configured } = useSanctuary()
  const [callType, setCallType] = React.useState<'video' | 'voice'>('video')
  const [previewActive, setPreviewActive] = React.useState(false)
  const [startingCall, setStartingCall] = React.useState(false)
  const [activeCall, setActiveCall] = React.useState<ActiveCallSession | null>(null)
  const [callDuration, setCallDuration] = React.useState(0)
  const [history, setHistory] = React.useState<CallHistoryItem[]>([])
  const [error, setError] = React.useState<string | null>(null)

  const previewVideoRef = React.useRef<HTMLVideoElement | null>(null)
  const previewStreamRef = React.useRef<MediaStream | null>(null)

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
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((track) => track.stop())
      previewStreamRef.current = null
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null
    }
    setPreviewActive(false)
  }, [])

  React.useEffect(() => {
    return () => {
      stopPreviewStream()
    }
  }, [stopPreviewStream])

  React.useEffect(() => {
    if (!activeCall) return
    const interval = window.setInterval(() => {
      setCallDuration((prev) => prev + 1)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [activeCall])

  const handleTogglePreviewCamera = async () => {
    setError(null)
    if (previewActive) {
      stopPreviewStream()
      return
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Camera preview is unavailable in this browser environment.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      previewStreamRef.current = stream
      setPreviewActive(true)
      window.requestAnimationFrame(() => {
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream
        }
      })
    } catch {
      setError('Camera permission denied or camera device is in use.')
    }
  }

  const handleStartCall = async (kind: 'video' | 'voice') => {
    setError(null)
    setCallType(kind)
    stopPreviewStream()
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
  }, [activeCall, callDuration, configured, effectiveSpaceId, fetchCallHistory])

  // When call is active, render the Edge-to-Edge iOS FaceTime stage
  if (activeCall) {
    return (
      <FaceTimeStage
        partnerName={partnerName}
        callType={activeCall.callType}
        isDemo={activeCall.isDemo}
        serverUrl={activeCall.serverUrl}
        token={activeCall.token}
        roomName={activeCall.room}
        duration={callDuration}
        onEndCall={() => void handleHangup()}
        fullScreen={true}
      />
    )
  }

  const partnerInitials = getInitials(partnerName)

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
      {/* Top Header */}
      <PageHeader
        title="Bedtime Calls"
        description="Late-night audio and video for the two of you — designed for the hour before bed."
        backHref="/home"
        backLabel="Back to Sanctuary"
      />

      {error && (
        <StatusBanner tone="error" title="Call Issue" description={error} />
      )}

      {!configured && (
        <StatusBanner
          tone="info"
          title="Bedtime Lounge Simulation Active"
          description={`Simulating a private 1:1 bedtime call with ${partnerName}. Camera preview, PiP, companion game controls, and call logging are fully functional without live WebRTC servers.`}
        />
      )}

      {/* Main FaceTime Hero Card */}
      <div className="relative aspect-video sm:aspect-[16/9] w-full rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden shadow-md flex flex-col items-center justify-center p-6 text-center">
        {previewActive && (
          <video
            ref={previewVideoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover opacity-75 scale-x-[-1]"
          />
        )}

        <div className="relative z-10 space-y-4 bg-[var(--surface-0)]/90 backdrop-blur-md px-6 py-7 sm:px-8 sm:py-8 rounded-3xl border border-[var(--border)] max-w-md shadow-sm">
          {/* Avatar Monogram */}
          <div className="mx-auto h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-[var(--surface-2)] border-2 border-[var(--primary)]/40 flex items-center justify-center text-2xl sm:text-3xl font-bold text-[var(--foreground)] shadow-xs">
            {partnerInitials}
          </div>

          <div className="space-y-1">
            <h2 className="font-[family-name:var(--ds-font-display)] text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
              {partnerName}
            </h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              Strictly 1:1 call · Play split-control games together while on the line.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => void handleStartCall('video')}
              variant="primary"
              size="md"
              className="rounded-full px-6 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-semibold shadow-xs"
              isLoading={startingCall && callType === 'video'}
            >
              <Video className="h-4 w-4 mr-2" />
              <span>FaceTime Video</span>
            </Button>

            <Button
              onClick={() => void handleStartCall('voice')}
              variant="outline"
              size="md"
              className="rounded-full px-5 font-semibold border-[var(--border)] hover:bg-[var(--surface-2)]"
              isLoading={startingCall && callType === 'voice'}
            >
              <PhoneCall className="h-4 w-4 mr-2 text-[var(--primary)]" />
              <span>FaceTime Audio</span>
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              onClick={() => void handleTogglePreviewCamera()}
            >
              {previewActive ? (
                <>
                  <VideoOff className="h-3.5 w-3.5 mr-1.5" />
                  <span>Stop Preview</span>
                </>
              ) : (
                <>
                  <Video className="h-3.5 w-3.5 mr-1.5" />
                  <span>Test Camera</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Recent FaceTime Calls */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-[family-name:var(--ds-font-display)] text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--primary)]" />
            <span>Recent FaceTime Calls</span>
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void fetchCallHistory()}
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            <span>Refresh</span>
          </Button>
        </div>

        {history.length === 0 ? (
          <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 text-xs text-[var(--muted-foreground)] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--primary)] shrink-0" />
            <span>
              {configured
                ? 'No calls recorded in this sanctuary yet. Tap "FaceTime Video" above to start.'
                : 'No local sandbox calls logged yet. Start a session above and end it to record in your history.'}
            </span>
          </div>
        ) : (
          <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)] overflow-hidden shadow-xs">
            {history.map((c) => {
              const timestamp = c.started_at ?? c.created_at
              const isVideo = c.call_type === 'video'
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-4 text-xs sm:text-sm hover:bg-[var(--muted)]/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      {isVideo ? (
                        <Video className="h-4 w-4" />
                      ) : (
                        <PhoneCall className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--foreground)]">
                        {isVideo ? 'FaceTime Video' : 'FaceTime Audio'} ({c.status})
                      </div>
                      <div className="text-[11px] text-[var(--muted-foreground)]">
                        {timestamp ? new Date(timestamp).toLocaleString() : 'Recent session'}
                        {c.initiator_role &&
                          ` · Started by ${c.initiator_role === 'self' ? 'You' : partnerName}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs font-mono">
                      {typeof c.duration_sec === 'number'
                        ? formatFaceTimeDuration(c.duration_sec)
                        : c.status === 'active'
                          ? 'Active'
                          : 'Ended'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleStartCall(isVideo ? 'video' : 'voice')}
                      className="text-xs text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer rounded-full h-8 px-3"
                    >
                      Call Back
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
