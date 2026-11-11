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
  Volume2,
  Maximize2,
  Settings,
  Shield,
  Wifi,
  Sparkles,
  ArrowLeft,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function VideoCallPage() {
  const [inCall, setInCall] = React.useState(false)
  const [callType, setCallType] = React.useState<'video' | 'voice'>('video')
  const [micEnabled, setMicEnabled] = React.useState(true)
  const [cameraEnabled, setCameraEnabled] = React.useState(true)
  const [callDuration, setCallDuration] = React.useState(0)
  const [connectionQuality, setConnectionQuality] = React.useState<'excellent' | 'good' | 'reconnecting'>('excellent')

  React.useEffect(() => {
    let interval: any
    if (inCall) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else {
      setCallDuration(0)
    }
    return () => clearInterval(interval)
  }, [inCall])

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const s = sec % 60
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const callHistory = [
    { id: 'c1', type: 'video', date: 'Yesterday at 10:14 PM', duration: '42 min' },
    { id: 'c2', type: 'voice', date: 'Feb 10, 2025 at 07:30 PM', duration: '18 min' },
    { id: 'c3', type: 'video', date: 'Feb 08, 2025 at 11:05 PM', duration: '1 hr 12 min' },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sanctuary</span>
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            LiveKit WebRTC · Encrypted
          </Badge>
        </div>
      </div>

      {!inCall ? (
        /* ── Pre-Call / Lobby Interface ────────────────────────────────────── */
        <div className="space-y-8">
          <div className="text-center space-y-2 max-w-md mx-auto">
            <h1 className="font-[family-name:var(--ds-font-display)] text-3xl font-bold tracking-tight text-[var(--foreground)]">
              1:1 Private Calls
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
              Real-time video and crystal-clear audio communication powered by LiveKit Cloud infrastructure. Zero recording, zero storage.
            </p>
          </div>

          <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 max-w-md mx-auto space-y-6 shadow-xs">
            <div className="relative aspect-video rounded-[var(--ds-radius)] bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center overflow-hidden">
              {cameraEnabled ? (
                <div className="text-center space-y-1">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xl mb-1">
                    ✨
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    Local Camera Preview Active
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5">
                  <VideoOff className="h-4 w-4" />
                  <span>Camera is turned off</span>
                </div>
              )}

              {/* In-preview toggles */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[var(--background)]/80 backdrop-blur-xs p-1.5 rounded-full border border-[var(--border)]">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setMicEnabled((p) => !p)}
                  aria-label={micEnabled ? 'Mute Mic' : 'Unmute Mic'}
                >
                  {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-rose-500" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setCameraEnabled((p) => !p)}
                  aria-label={cameraEnabled ? 'Disable Camera' : 'Enable Camera'}
                >
                  {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-rose-500" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setCallType('voice')
                  setInCall(true)
                }}
              >
                <PhoneCall className="h-4 w-4 mr-1.5 text-emerald-500" />
                <span>Voice Call</span>
              </Button>

              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  setCallType('video')
                  setInCall(true)
                }}
              >
                <Video className="h-4 w-4 mr-1.5" />
                <span>Video Call</span>
              </Button>
            </div>
          </div>

          {/* Call History */}
          <div className="max-w-md mx-auto space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">
              Recent Call History
            </h3>
            <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)] text-xs">
              {callHistory.map((h) => (
                <div key={h.id} className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {h.type === 'video' ? (
                      <Video className="h-4 w-4 text-[var(--primary)]" />
                    ) : (
                      <PhoneCall className="h-4 w-4 text-emerald-500" />
                    )}
                    <div>
                      <div className="font-medium text-[var(--foreground)]">
                        {h.type === 'video' ? 'Video Session' : 'Voice Call'}
                      </div>
                      <div className="text-[11px] text-[var(--muted-foreground)]">{h.date}</div>
                    </div>
                  </div>
                  <span className="font-mono text-[var(--muted-foreground)]">{h.duration}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Active In-Call Room ───────────────────────────────────────────── */
        <div className="space-y-6">
          <div className="relative aspect-video sm:aspect-21/9 w-full rounded-[var(--ds-radius)] bg-zinc-950 border border-[var(--border)] overflow-hidden flex items-center justify-center">
            {/* Remote Partner Feed */}
            <div className="text-center space-y-2 text-zinc-400">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800 text-3xl">
                ❤️
              </div>
              <div className="text-sm font-medium text-zinc-200">Connected with Partner</div>
              <div className="text-xs text-emerald-400 flex items-center justify-center gap-1.5">
                <Wifi className="h-3.5 w-3.5" />
                <span>Encrypted HD Audio &amp; Video</span>
              </div>
            </div>

            {/* Local PiP Preview in corner */}
            {cameraEnabled && (
              <div className="absolute top-4 right-4 w-28 sm:w-36 aspect-video rounded-[var(--ds-radius)] bg-zinc-900 border border-zinc-700/80 shadow-md flex items-center justify-center overflow-hidden">
                <span className="text-xs text-zinc-400">You</span>
              </div>
            )}

            {/* Duration Badge */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-mono text-white flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{formatDuration(callDuration)}</span>
            </div>
          </div>

          {/* In-Call Controls Bar */}
          <div className="flex items-center justify-center gap-3 p-4 rounded-full bg-[var(--card)] border border-[var(--border)] max-w-sm mx-auto shadow-md">
            <Button
              size="icon"
              variant={micEnabled ? 'ghost' : 'outline'}
              className="h-11 w-11 rounded-full"
              onClick={() => setMicEnabled((p) => !p)}
              aria-label={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-rose-500" />}
            </Button>

            <Button
              size="icon"
              variant={cameraEnabled ? 'ghost' : 'outline'}
              className="h-11 w-11 rounded-full"
              onClick={() => setCameraEnabled((p) => !p)}
              aria-label={cameraEnabled ? 'Disable Camera' : 'Enable Camera'}
            >
              {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5 text-rose-500" />}
            </Button>

            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              onClick={() => setInCall(false)}
              aria-label="Hang Up Call"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

