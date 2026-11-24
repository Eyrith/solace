'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, PhoneOff, Maximize2, Sparkles, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getInitials } from '@/components/sanctuary/private-shell'
import { triggerHaptic, useScreenWakeLock } from '@/lib/sanctuary/mobile-haptics'

export interface CallCompanionBarProps {
  partnerName: string
  partnerAvatar?: string
  isInCall?: boolean
  durationSec?: number
  isMuted?: boolean
  onToggleMute?: () => void
  onEndCall?: () => void
  onExpandCall?: () => void
  activeGameTitle?: string
  className?: string
}

function formatDuration(sec: number): string {
  const mins = Math.floor(sec / 60)
  const s = sec % 60
  return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function CallCompanionBar({
  partnerName,
  partnerAvatar,
  isInCall = true,
  durationSec = 0,
  isMuted = false,
  onToggleMute,
  onEndCall,
  onExpandCall,
  activeGameTitle,
  className,
}: CallCompanionBarProps) {
  const [internalMuted, setInternalMuted] = React.useState(isMuted)
  const [elapsed, setElapsed] = React.useState(durationSec)

  // Keep phone screen awake during bedtime calls
  useScreenWakeLock(isInCall)

  React.useEffect(() => {
    setInternalMuted(isMuted)
  }, [isMuted])

  React.useEffect(() => {
    if (!isInCall) return
    const interval = setInterval(() => {
      setElapsed((t) => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isInCall])

  if (!isInCall) return null

  const initials = getInitials(partnerName || 'Partner')

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        aria-label={`Active call with ${partnerName || 'Partner'}`}
        className={cn(
          'fixed top-3 left-1/2 -translate-x-1/2 z-40',
          'flex items-center gap-3 px-3.5 py-1.5 rounded-full',
          'border border-[#e2d5c3] dark:border-[#2e3146]',
          'bg-[#fffdf9]/95 dark:bg-[#151722]/95 backdrop-blur-md',
          'shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)]',
          'transition-all max-w-[94vw]',
          className
        )}
      >
        {/* Partner Mini Avatar / Presence */}
        <div className="relative flex items-center shrink-0">
          <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-br from-[#e07a5f] to-[#f4a261] text-white flex items-center justify-center font-bold text-xs ring-2 ring-[#e07a5f]/40 shadow-xs">
            {partnerAvatar ? (
              <img src={partnerAvatar} alt={partnerName} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-[#151722]" />
          </span>
        </div>

        {/* Call Info & Game sync status */}
        <div className="flex flex-col min-w-0 pr-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--foreground)] truncate max-w-[120px] sm:max-w-[180px]">
              {partnerName}
            </span>
            <span className="text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-md">
              {formatDuration(elapsed)}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)] truncate max-w-[160px] sm:max-w-[220px]">
            {activeGameTitle ? (
              <>
                <Sparkles className="h-2.5 w-2.5 text-[#e07a5f] shrink-0" />
                <span className="truncate">Playing: {activeGameTitle}</span>
              </>
            ) : (
              <span>Bedtime call · Audio synced</span>
            )}
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-1 pl-2 border-l border-[var(--border)] shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light')
              setInternalMuted(!internalMuted)
              onToggleMute?.()
            }}
            aria-label={internalMuted ? 'Unmute microphone' : 'Mute microphone'}
            className={cn(
              'p-1.5 rounded-full text-xs transition-colors cursor-pointer',
              internalMuted
                ? 'bg-rose-500 text-white hover:bg-rose-600'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]'
            )}
            title={internalMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {internalMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </button>

          {onExpandCall ? (
            <button
              type="button"
              onClick={onExpandCall}
              aria-label="Expand call full screen"
              className="p-1.5 rounded-full text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              title="Expand call full screen"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Link
              href={`/calls?partner=${encodeURIComponent(partnerName)}`}
              aria-label="Open call view"
              className="p-1.5 rounded-full text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              title="Open call view"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Link>
          )}

          {onEndCall && (
            <button
              type="button"
              onClick={onEndCall}
              aria-label="Hang up call"
              className="p-1.5 rounded-full text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer ml-0.5"
              title="Hang up call"
            >
              <PhoneOff className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}
