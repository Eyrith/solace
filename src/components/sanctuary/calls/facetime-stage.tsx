'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  PhoneOff,
  Shield,
} from 'lucide-react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useConnectionState,
  useLocalParticipant,
  useTracks,
  useRoomContext,
} from '@livekit/components-react'
import { LiveKitDataChannelSignaler } from '@/lib/sanctuary/livekit-data-channel'
import { cn } from '@/lib/utils'
import { getInitials } from '@/components/sanctuary/private-shell'

export interface FaceTimeStageProps {
  partnerName: string
  partnerAvatar?: string
  callType?: 'video' | 'voice'
  isDemo?: boolean
  serverUrl?: string
  token?: string
  roomName?: string
  duration?: number
  onEndCall: () => void
  onMinimize?: () => void
  className?: string
  fullScreen?: boolean
}

export function formatFaceTimeDuration(sec: number): string {
  const mins = Math.floor(sec / 60)
  const s = sec % 60
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60)
    const remMins = mins % 60
    return `${hrs.toString().padStart(2, '0')}:${remMins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

interface StageChromeProps {
  partnerName: string
  partnerAvatar?: string
  callType: 'video' | 'voice'
  duration: number
  connectionStateLabel?: string
  micEnabled: boolean
  cameraEnabled: boolean
  facingMode: 'user' | 'environment'
  isSwapped: boolean
  controlsVisible: boolean
  onToggleMic: () => void
  onToggleCamera: () => void
  onFlipCamera: () => void
  onEndCall: () => void
  onSwapFocus: () => void
  onStageTap: () => void
  mainContent: React.ReactNode
  pipContent: React.ReactNode
  fullScreen?: boolean
  className?: string
}

function FaceTimeStageChrome({
  partnerName,
  duration,
  micEnabled,
  cameraEnabled,
  facingMode,
  controlsVisible,
  onToggleMic,
  onToggleCamera,
  onFlipCamera,
  onEndCall,
  onSwapFocus,
  onStageTap,
  mainContent,
  pipContent,
  fullScreen = true,
  className,
}: StageChromeProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [flipDegree, setFlipDegree] = React.useState(0)
  const [isCamouflaged, setIsCamouflaged] = React.useState(false)

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFlipDegree((d) => d + 180)
    onFlipCamera()
  }

  return (
    <div
      ref={containerRef}
      onClick={onStageTap}
      className={cn(
        'relative bg-black overflow-hidden select-none flex flex-col justify-between',
        fullScreen ? 'fixed inset-0 z-50 h-screen w-screen' : 'h-full w-full rounded-2xl',
        className,
      )}
    >
      {/* 1. Edge-to-Edge Immersion Main Viewport */}
      <div className="absolute inset-0 h-full w-full z-0 overflow-hidden">
        {mainContent}
      </div>

      {/* Camouflage Mask Overlay (Instant Shield) */}
      {isCamouflaged ? (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 z-25 flex flex-col justify-between bg-[var(--background)] p-6 sm:p-12 text-[var(--foreground)] select-text"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-bold">Meridian</span>
              <span className="text-xs text-[var(--muted-foreground)]">· Reading Archive</span>
            </div>
            <button
              type="button"
              onClick={() => setIsCamouflaged(false)}
              className="rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-[var(--primary-foreground)] shadow-xs hover:opacity-90"
            >
              Resume Notes
            </button>
          </div>
          <div className="max-w-xl space-y-4 py-8">
            <span className="text-[11px] font-semibold tracking-wider text-[var(--primary)] uppercase">
              Philosophy &amp; Attachment · Working Paper #104
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-snug">
              On the Necessity of Private Sanctuary in Human Connection
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-[var(--muted-foreground)]">
              A sanctuary is not an evasion of the world, but an intentional boundary within which vulnerability can be cultivated without fear of premature judgment or surveillance.
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 text-xs text-[var(--muted-foreground)]">
            <span>Archival Reference: REL-2024-09</span>
            <span>Tap &quot;Resume Notes&quot; to restore view</span>
          </div>
        </div>
      ) : null}

      {/* 2. Floating Squircle Self-View (Picture-in-Picture) */}
      <motion.div
        drag
        dragConstraints={containerRef}
        dragElastic={0.12}
        dragMomentum={false}
        whileTap={{ scale: 0.96 }}
        onTap={onSwapFocus}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 w-32 h-44 sm:w-40 sm:h-56 md:w-48 md:h-64 rounded-3xl rounded-[24px] overflow-hidden border border-white/20 shadow-2xl bg-neutral-900/90 backdrop-blur-md cursor-pointer z-20 group hover:border-white/40 transition-colors"
        title="Tap to swap view"
        aria-label="Picture-in-picture view. Tap to swap."
      >
        <div className="relative h-full w-full overflow-hidden">
          {pipContent}
          {/* Subtle hover indicator overlay */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <span className="text-[10px] text-white/90 bg-black/60 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-sm">
              Tap to swap
            </span>
          </div>
        </div>
      </motion.div>

      {/* 3. Minimalist Top HUD */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'fixed top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 sm:gap-3 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-black/45 backdrop-blur-2xl border border-white/15 shadow-2xl text-xs sm:text-sm text-white transition-opacity duration-300 ease-in-out',
          controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      >
        {/* Connection Beacon */}
        <span className="relative flex h-2.5 w-2.5 items-center justify-center" aria-hidden="true">
          <span className="inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>

        {/* Partner Name / Alias */}
        <span className="font-medium text-white/95 truncate max-w-[120px] sm:max-w-[180px]">
          {partnerName}
        </span>

        {/* Separator dot */}
        <span className="text-white/30" aria-hidden="true">
          •
        </span>

        {/* Live Duration Timer (00:00) */}
        <span className="font-mono text-white/90 tabular-nums">
          {formatFaceTimeDuration(duration)}
        </span>

        {/* End-to-end security shield */}
        <div className="flex items-center gap-1.5 pl-2.5 border-l border-white/15 text-[11px] text-emerald-400 font-medium">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span className="hidden sm:inline">E2EE</span>
        </div>
      </div>

      {/* 4. Floating Glassmorphic Pill Controls */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'fixed bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3.5 sm:gap-5 px-5 py-3 sm:px-6 sm:py-3.5 rounded-full bg-black/45 backdrop-blur-2xl border border-white/15 shadow-2xl transition-opacity duration-300 ease-in-out',
          controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      >
        {/* Microphone Toggle (active white, muted dark with slash) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleMic()
          }}
          className={cn(
            'h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer shadow-lg',
            micEnabled
              ? 'bg-white text-neutral-900 hover:bg-neutral-100'
              : 'bg-white/15 text-white/70 border border-white/10 hover:bg-white/25',
          )}
          aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
          title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {micEnabled ? (
            <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <MicOff className="h-5 w-5 sm:h-6 sm:w-6 text-white/80" />
          )}
        </button>

        {/* Camera Toggle (Video / VideoOff) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleCamera()
          }}
          className={cn(
            'h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer shadow-lg',
            cameraEnabled
              ? 'bg-white text-neutral-900 hover:bg-neutral-100'
              : 'bg-white/15 text-white/70 border border-white/10 hover:bg-white/25',
          )}
          aria-label={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
          title={cameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {cameraEnabled ? (
            <Video className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <VideoOff className="h-5 w-5 sm:h-6 sm:w-6 text-white/80" />
          )}
        </button>

        {/* Flip Camera (switch facingMode: 'user' / 'environment') */}
        <button
          type="button"
          onClick={handleFlip}
          className="h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer bg-white/15 text-white hover:bg-white/25 border border-white/10 shadow-lg"
          aria-label="Flip camera"
          title={facingMode === 'user' ? 'Switch to back camera' : 'Switch to front camera'}
        >
          <SwitchCamera
            className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300"
            style={{ transform: `rotate(${flipDegree}deg)` }}
          />
        </button>

        {/* Instant Camouflage Shield Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsCamouflaged(!isCamouflaged)
          }}
          className={cn(
            'h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer shadow-lg',
            isCamouflaged
              ? 'bg-amber-500 text-stone-950 font-bold'
              : 'bg-white/15 text-white/80 border border-white/10 hover:bg-white/25',
          )}
          aria-label={isCamouflaged ? 'Exit camouflage shield' : 'Activate camouflage shield'}
          title={isCamouflaged ? 'Exit Camouflage' : 'Quick Camouflage Shield'}
        >
          <Shield className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        {/* End Call (circular bright red #DC2626 button with PhoneOff icon) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEndCall()
          }}
          className="h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer bg-[#DC2626] hover:bg-red-700 text-white shadow-xl shadow-red-950/40"
          aria-label="End call"
          title="End Call"
        >
          <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>
    </div>
  )
}

function ContactPoster({
  partnerName,
  callType,
  statusText,
}: {
  partnerName: string
  callType: 'video' | 'voice'
  statusText?: string
}) {
  const initial = getInitials(partnerName)
  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center bg-[var(--surface-0)] text-[var(--foreground)] p-6">
      <div className="relative z-10 flex flex-col items-center space-y-4">
        <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-[var(--ds-radius)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-4xl sm:text-5xl font-semibold shadow-[var(--shadow-2)]">
          {initial}
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-medium text-[var(--foreground)]">
            {partnerName}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">
            {statusText ?? (callType === 'voice' ? 'FaceTime Audio' : 'FaceTime Video')}
          </p>
        </div>
      </div>
    </div>
  )
}

function CameraOffPlaceholder({ label }: { label: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-neutral-900 text-neutral-400 p-4 space-y-2">
      <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-white/60">
        <VideoOff className="h-5 w-5" />
      </div>
      <span className="text-[11px] text-center">{label}</span>
    </div>
  )
}

/**
 * Sandbox implementation when LiveKit is unconfigured or in demo mode.
 * Operates gracefully with local camera via getUserMedia, full flipping, toggles, and PiP swapping.
 */
function FaceTimeSandboxView({
  partnerName,
  callType = 'video',
  duration,
  onEndCall,
  fullScreen = true,
  className,
}: FaceTimeStageProps) {
  const [micEnabled, setMicEnabled] = React.useState(true)
  const [cameraEnabled, setCameraEnabled] = React.useState(callType === 'video')
  const [facingMode, setFacingMode] = React.useState<'user' | 'environment'>('user')
  const [isSwapped, setIsSwapped] = React.useState(false)
  const [controlsVisible, setControlsVisible] = React.useState(true)
  const [localDuration, setLocalDuration] = React.useState(duration ?? 0)
  const effectiveDuration = duration !== undefined ? duration : localDuration

  const streamRef = React.useRef<MediaStream | null>(null)
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const pipVideoRef = React.useRef<HTMLVideoElement | null>(null)
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)

  // Manage duration interval if not controlled by parent
  React.useEffect(() => {
    if (duration !== undefined) return
    const interval = setInterval(() => {
      setLocalDuration((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [duration])

  // Auto-hiding timer for controls
  const resetHideTimer = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setControlsVisible(false)
    }, 4500)
  }, [])

  React.useEffect(() => {
    if (controlsVisible) {
      resetHideTimer()
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [controlsVisible, resetHideTimer])

  const attachStreamToRefs = React.useCallback((stream: MediaStream | null) => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
    if (pipVideoRef.current && stream) {
      pipVideoRef.current.srcObject = stream
    }
  }, [])

  const startCamera = React.useCallback(
    async (mode: 'user' | 'environment') => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        return
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: true,
        })
        streamRef.current = stream
        stream.getAudioTracks().forEach((t) => {
          t.enabled = micEnabled
        })
        stream.getVideoTracks().forEach((t) => {
          t.enabled = cameraEnabled
        })
        attachStreamToRefs(stream)
      } catch {
        // Fallback to generic video if facingMode constraint fails (e.g. desktop webcam)
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          })
          streamRef.current = fallbackStream
          fallbackStream.getAudioTracks().forEach((t) => {
            t.enabled = micEnabled
          })
          fallbackStream.getVideoTracks().forEach((t) => {
            t.enabled = cameraEnabled
          })
          attachStreamToRefs(fallbackStream)
        } catch {
          // Camera unavailable or permission denied; continue in audio/avatar mode
        }
      }
    },
    [attachStreamToRefs, cameraEnabled, micEnabled],
  )

  React.useEffect(() => {
    if (cameraEnabled) {
      void startCamera(facingMode)
    } else if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = false
      })
    }
  }, [cameraEnabled, facingMode, startCamera])

  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleToggleMic = () => {
    const next = !micEnabled
    setMicEnabled(next)
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = next
      })
    }
    resetHideTimer()
  }

  const handleToggleCamera = () => {
    const next = !cameraEnabled
    setCameraEnabled(next)
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = next
      })
    }
    resetHideTimer()
  }

  const handleFlipCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(nextMode)
    void startCamera(nextMode)
    resetHideTimer()
  }

  const handleSwapFocus = () => {
    setIsSwapped((prev) => !prev)
    resetHideTimer()
  }

  const handleStageTap = () => {
    setControlsVisible((prev) => {
      const next = !prev
      if (next) resetHideTimer()
      return next
    })
  }

  // Local camera preview element
  const renderLocalVideo = (isPip: boolean) => {
    if (!cameraEnabled) {
      return <CameraOffPlaceholder label="Self Camera Off" />
    }
    return (
      <video
        ref={isPip ? pipVideoRef : videoRef}
        autoPlay
        muted
        playsInline
        className={cn(
          'h-full w-full object-cover',
          facingMode === 'user' && 'scale-x-[-1]',
        )}
      />
    )
  }

  // Simulated partner content in sandbox mode
  const renderPartnerView = (isPip: boolean) => {
    if (isPip) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-neutral-900 text-white p-2">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-semibold mb-1">
            {partnerName.trim().charAt(0).toUpperCase() || 'P'}
          </div>
          <span className="text-[10px] text-neutral-300 truncate max-w-full font-medium">
            {partnerName}
          </span>
          <span className="text-[9px] text-emerald-400">Sandbox</span>
        </div>
      )
    }
    return (
      <ContactPoster
        partnerName={partnerName}
        callType={callType}
        statusText="Local Sandbox Lounge · WebRTC Ready"
      />
    )
  }

  // In sandbox:
  // When !isSwapped: Main is local camera preview (Requirement 1), PiP is partner.
  // When isSwapped: Main is partner, PiP is local camera preview.
  const mainContent = !isSwapped ? renderLocalVideo(false) : renderPartnerView(false)
  const pipContent = !isSwapped ? renderPartnerView(true) : renderLocalVideo(true)

  return (
    <FaceTimeStageChrome
      partnerName={partnerName}
      callType={callType}
      duration={effectiveDuration}
      micEnabled={micEnabled}
      cameraEnabled={cameraEnabled}
      facingMode={facingMode}
      isSwapped={isSwapped}
      controlsVisible={controlsVisible}
      onToggleMic={handleToggleMic}
      onToggleCamera={handleToggleCamera}
      onFlipCamera={handleFlipCamera}
      onEndCall={onEndCall}
      onSwapFocus={handleSwapFocus}
      onStageTap={handleStageTap}
      mainContent={mainContent}
      pipContent={pipContent}
      fullScreen={fullScreen}
      className={className}
    />
  )
}

/**
 * LiveKit connected room stage.
 * Executes within a LiveKitRoom context and subscribes to audio/video tracks.
 */
function FaceTimeLiveKitContent({
  partnerName,
  callType = 'video',
  duration,
  onEndCall,
  fullScreen = true,
  className,
}: FaceTimeStageProps) {
  const connectionState = useConnectionState()
  const { localParticipant } = useLocalParticipant()
  const tracks = useTracks()
  const room = useRoomContext()
  const signalerRef = React.useRef<LiveKitDataChannelSignaler | null>(null)

  const [micEnabled, setMicEnabled] = React.useState(true)
  const [cameraEnabled, setCameraEnabled] = React.useState(callType === 'video')
  const [partnerMicMuted, setPartnerMicMuted] = React.useState(false)
  const [facingMode, setFacingMode] = React.useState<'user' | 'environment'>('user')
  const [isSwapped, setIsSwapped] = React.useState(false)
  const [controlsVisible, setControlsVisible] = React.useState(true)
  const [localDuration, setLocalDuration] = React.useState(duration ?? 0)
  const effectiveDuration = duration !== undefined ? duration : localDuration

  // Initialize direct LiveKit Data Channel signaling for ultra-low-latency peer coordination
  React.useEffect(() => {
    if (!room) return
    const signaler = new LiveKitDataChannelSignaler(room, 'me')
    signalerRef.current = signaler

    const unsub = signaler.onSignal('mute_state', (packet) => {
      if (packet.payload?.micMuted !== undefined) {
        setPartnerMicMuted(Boolean(packet.payload.micMuted))
      }
    })

    return () => {
      unsub()
      signaler.destroy()
      signalerRef.current = null
    }
  }, [room])

  // Broadcast mute state immediately over direct SCTP WebRTC Data Channel
  React.useEffect(() => {
    void signalerRef.current?.sendMuteState(!micEnabled, !cameraEnabled)
  }, [micEnabled, cameraEnabled])

  const timerRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    if (duration !== undefined) return
    const interval = setInterval(() => {
      setLocalDuration((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [duration])

  const resetHideTimer = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setControlsVisible(false)
    }, 4500)
  }, [])

  React.useEffect(() => {
    if (controlsVisible) {
      resetHideTimer()
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [controlsVisible, resetHideTimer])

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

  const handleToggleMic = () => {
    setMicEnabled((prev) => !prev)
    resetHideTimer()
  }

  const handleToggleCamera = () => {
    setCameraEnabled((prev) => !prev)
    resetHideTimer()
  }

  const handleFlipCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(nextMode)
    try {
      await localParticipant.setCameraEnabled(false)
      await localParticipant.setCameraEnabled(true, {
        facingMode: nextMode,
      })
    } catch {
      // Fallback
    }
    resetHideTimer()
  }

  const handleSwapFocus = () => {
    setIsSwapped((prev) => !prev)
    resetHideTimer()
  }

  const handleStageTap = () => {
    setControlsVisible((prev) => {
      const next = !prev
      if (next) resetHideTimer()
      return next
    })
  }

  // Render components for LiveKit
  const renderRemoteView = (isPip: boolean) => {
    if (remoteVideoTrack) {
      return (
        <VideoTrack
          trackRef={remoteVideoTrack}
          className="h-full w-full object-cover"
        />
      )
    }
    if (isPip) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-neutral-900 text-white p-2">
          <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center font-semibold mb-1">
            {partnerName.trim().charAt(0).toUpperCase() || 'P'}
          </div>
          <span className="text-[10px] text-neutral-300 truncate max-w-full font-medium">
            {partnerName}
          </span>
          <span className="text-[9px] text-amber-300">Connecting...</span>
        </div>
      )
    }
    return (
      <ContactPoster
        partnerName={partnerName}
        callType={callType}
        statusText={
          String(connectionState) === 'connected'
            ? callType === 'voice'
              ? 'Private Audio Channel Live'
              : 'Waiting for partner camera...'
            : 'Connecting to LiveKit Room...'
        }
      />
    )
  }

  const renderLocalView = () => {
    if (!cameraEnabled || !localVideoTrack) {
      return <CameraOffPlaceholder label="Camera Off" />
    }
    return (
      <VideoTrack
        trackRef={localVideoTrack}
        className={cn(
          'h-full w-full object-cover',
          facingMode === 'user' && 'scale-x-[-1]',
        )}
      />
    )
  }

  // LiveKit normal layout:
  // When !isSwapped: Main is Remote, PiP is Local.
  // When isSwapped: Main is Local, PiP is Remote.
  const mainContent = !isSwapped ? renderRemoteView(false) : renderLocalView()
  const pipContent = !isSwapped ? renderLocalView() : renderRemoteView(true)

  return (
    <>
      <RoomAudioRenderer />
      <FaceTimeStageChrome
        partnerName={partnerName}
        callType={callType}
        duration={effectiveDuration}
        connectionStateLabel={String(connectionState)}
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        facingMode={facingMode}
        isSwapped={isSwapped}
        controlsVisible={controlsVisible}
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        onFlipCamera={handleFlipCamera}
        onEndCall={onEndCall}
        onSwapFocus={handleSwapFocus}
        onStageTap={handleStageTap}
        mainContent={mainContent}
        pipContent={pipContent}
        fullScreen={fullScreen}
        className={className}
      />
    </>
  )
}

/**
 * Top-level FaceTime Stage component.
 * Gracefully routes between LiveKit Room WebRTC and Sandbox Fallback.
 */
export function FaceTimeStage(props: FaceTimeStageProps) {
  const isLiveKitConfigured = Boolean(
    props.serverUrl && props.token && !props.isDemo,
  )

  if (isLiveKitConfigured) {
    return (
      <LiveKitRoom
        serverUrl={props.serverUrl}
        token={props.token}
        connect={true}
        audio={true}
        video={props.callType !== 'voice'}
        onDisconnected={props.onEndCall}
        className={cn(
          'h-full w-full',
          props.fullScreen !== false && 'fixed inset-0 z-50 bg-black',
        )}
      >
        <FaceTimeLiveKitContent {...props} />
      </LiveKitRoom>
    )
  }

  return <FaceTimeSandboxView {...props} />
}
