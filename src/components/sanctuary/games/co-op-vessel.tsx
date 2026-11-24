'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Compass,
  Wind,
  Sparkles,
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Share2,
  ArrowLeft,
  Flame,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { triggerHaptic, playBedtimeSound, useScreenWakeLock } from '@/lib/sanctuary/mobile-haptics'
import { KULFI_STAKES } from '@/lib/games/data'
import { createClient, isSupabaseClientConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export type CoOpRole = 'solo_split' | 'helm' | 'engine'

interface Obstacle {
  id: number
  x: number // percentage 10 - 90
  y: number // percentage -10 to 110
  type: 'rock' | 'eddy'
  size: number
}

interface Collectible {
  id: number
  x: number // percentage 10 - 90
  y: number // percentage -10 to 110
  collected: boolean
}

interface CoOpVesselProps {
  spaceId?: string
  partnerName?: string
  defaultRole?: CoOpRole
  onBack?: () => void
  className?: string
}

export function CoOpVessel({
  spaceId = 'space-1',
  partnerName = 'Partner',
  defaultRole = 'solo_split',
  onBack,
  className,
}: CoOpVesselProps) {
  // Prevent screen dimming during late-night bed play
  useScreenWakeLock(true)

  const [role, setRole] = React.useState<CoOpRole>(defaultRole)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [isGameOver, setIsGameOver] = React.useState(false)
  const [soundEnabled, setSoundEnabled] = React.useState(true)
  const [activeStake, setActiveStake] = React.useState<string>(KULFI_STAKES[0])

  // Boat physics state
  const [boatX, setBoatX] = React.useState(50) // 10 to 90
  const [boatAngle, setBoatAngle] = React.useState(0) // -30 to 30 deg
  const [speed, setSpeed] = React.useState(1.0) // 0.4 to 2.2
  const [distance, setDistance] = React.useState(0) // 0 to 1000m
  const [score, setScore] = React.useState(0)
  const [lanternCount, setLanternCount] = React.useState(0)
  const [clashCount, setClashCount] = React.useState(0)

  // Floating river entities
  const [obstacles, setObstacles] = React.useState<Obstacle[]>([])
  const [collectibles, setCollectibles] = React.useState<Collectible[]>([])

  // Controls input refs for smooth animation frame loop
  const inputRef = React.useRef({
    steerLeft: false,
    steerRight: false,
    thrust: 1.0, // target speed
  })

  // Sound helper
  const playSfx = React.useCallback(
    (sound: 'paddle' | 'lantern' | 'clash' | 'reveal' | 'success' | 'lock') => {
      if (soundEnabled) {
        playBedtimeSound(sound)
      }
    },
    [soundEnabled]
  )

  // Multiplayer Supabase Realtime synchronization
  React.useEffect(() => {
    if (role === 'solo_split' || !isSupabaseClientConfigured() || !spaceId) return

    const supabase = createClient()
    const channel = supabase.channel(`coop-vessel:${spaceId}`)

    channel
      .on('broadcast', { event: 'vessel_input' }, (event) => {
        const payload = event.payload
        if (!payload) return
        if (payload.role === 'helm') {
          inputRef.current.steerLeft = payload.steerLeft
          inputRef.current.steerRight = payload.steerRight
        } else if (payload.role === 'engine') {
          inputRef.current.thrust = payload.thrust
        }
      })
      .on('broadcast', { event: 'vessel_game_state' }, (event) => {
        const payload = event.payload
        if (!payload) return
        if (payload.action === 'start') {
          handleStartGame(false)
        } else if (payload.action === 'restart') {
          handleReset(false)
        }
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [role, spaceId])

  // Broadcast control action to partner
  const broadcastInput = (updates: Record<string, any>) => {
    if (role === 'solo_split' || !isSupabaseClientConfigured() || !spaceId) return
    const supabase = createClient()
    const channel = supabase.channel(`coop-vessel:${spaceId}`)
    void channel.send({
      type: 'broadcast',
      event: 'vessel_input',
      payload: { role, ...updates },
    })
  }

  // Generate initial obstacles and lanterns
  const initializeRiver = () => {
    const obs: Obstacle[] = []
    const coll: Collectible[] = []
    let id = 1

    for (let y = -20; y < 110; y += 18) {
      // Random obstacle
      if (Math.random() > 0.3) {
        obs.push({
          id: id++,
          x: Math.floor(Math.random() * 70) + 15,
          y,
          type: Math.random() > 0.5 ? 'rock' : 'eddy',
          size: Math.random() > 0.5 ? 36 : 28,
        })
      }
      // Random lantern
      if (Math.random() > 0.4) {
        coll.push({
          id: id++,
          x: Math.floor(Math.random() * 70) + 15,
          y: y + 9,
          collected: false,
        })
      }
    }

    setObstacles(obs)
    setCollectibles(coll)
  }

  const handleStartGame = (broadcast = true) => {
    setIsPlaying(true)
    setIsGameOver(false)
    setDistance(0)
    setScore(0)
    setLanternCount(0)
    setClashCount(0)
    setBoatX(50)
    setBoatAngle(0)
    setSpeed(1.0)
    initializeRiver()
    triggerHaptic('medium')
    playSfx('paddle')

    if (broadcast && role !== 'solo_split' && isSupabaseClientConfigured()) {
      const supabase = createClient()
      const channel = supabase.channel(`coop-vessel:${spaceId}`)
      void channel.send({
        type: 'broadcast',
        event: 'vessel_game_state',
        payload: { action: 'start' },
      })
    }
  }

  const handleReset = (broadcast = true) => {
    setIsPlaying(false)
    setIsGameOver(false)
    setBoatX(50)
    setBoatAngle(0)
    setSpeed(1.0)
    setDistance(0)

    if (broadcast && role !== 'solo_split' && isSupabaseClientConfigured()) {
      const supabase = createClient()
      const channel = supabase.channel(`coop-vessel:${spaceId}`)
      void channel.send({
        type: 'broadcast',
        event: 'vessel_game_state',
        payload: { action: 'restart' },
      })
    }
  }

  // Main game tick loop
  React.useEffect(() => {
    if (!isPlaying || isGameOver) return

    let animFrame: number
    let lastTime = performance.now()

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1) // seconds
      lastTime = now

      // 1. Steering & Boat angle
      let steerDir = 0
      if (inputRef.current.steerLeft) steerDir -= 1
      if (inputRef.current.steerRight) steerDir += 1

      setBoatAngle((prev) => {
        const targetAngle = steerDir * 24
        return prev + (targetAngle - prev) * Math.min(dt * 8, 1)
      })

      // 2. Horizontal movement
      setBoatX((prev) => {
        const dx = steerDir * 36 * dt * (speed > 1.2 ? 1.3 : 1)
        const nextX = Math.max(12, Math.min(88, prev + dx))
        return nextX
      })

      // 3. Engine speed adjustment
      setSpeed((prev) => {
        const target = inputRef.current.thrust
        return prev + (target - prev) * Math.min(dt * 4, 1)
      })

      // 4. River Distance scroll
      const distanceDelta = speed * 40 * dt
      setDistance((prev) => {
        const nextDist = prev + distanceDelta
        if (nextDist >= 1000) {
          // River reached! Victory!
          setIsGameOver(true)
          setIsPlaying(false)
          triggerHaptic('success')
          playSfx('success')
        }
        return nextDist
      })

      // 5. Scroll entities down
      const scrollSpeed = speed * 30 * dt

      setObstacles((prev) => {
        const updated = prev.map((o) => ({ ...o, y: o.y + scrollSpeed }))
        // Collision detection with boat (at boatX, y=78)
        updated.forEach((o) => {
          if (Math.abs(o.y - 78) < 6 && Math.abs(o.x - boatX) < 10) {
            triggerHaptic('clash')
            playSfx('clash')
            setClashCount((c) => c + 1)
            setScore((s) => Math.max(0, s - 30))
            // Push obstacle away to prevent double-hitting
            o.y = 95
          }
        })
        // Recycle passed obstacles
        return updated.map((o) =>
          o.y > 105
            ? {
                ...o,
                y: -15,
                x: Math.floor(Math.random() * 70) + 15,
              }
            : o
        )
      })

      setCollectibles((prev) => {
        const updated = prev.map((c) => ({ ...c, y: c.y + scrollSpeed }))
        // Collection check with boat
        updated.forEach((c) => {
          if (!c.collected && Math.abs(c.y - 78) < 6 && Math.abs(c.x - boatX) < 9) {
            c.collected = true
            triggerHaptic('lantern')
            playSfx('lantern')
            setLanternCount((count) => count + 1)
            setScore((s) => s + 100)
          }
        })
        // Recycle passed lanterns
        return updated.map((c) =>
          c.y > 105
            ? {
                ...c,
                y: -15,
                x: Math.floor(Math.random() * 70) + 15,
                collected: false,
              }
            : c
        )
      })

      animFrame = requestAnimationFrame(tick)
    }

    animFrame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrame)
  }, [isPlaying, isGameOver, boatX, speed, playSfx])

  // Steer controls handler
  const setSteering = (left: boolean, right: boolean) => {
    inputRef.current.steerLeft = left
    inputRef.current.steerRight = right
    broadcastInput({ steerLeft: left, steerRight: right })
    if (left || right) {
      triggerHaptic('light')
      playSfx('paddle')
    }
  }

  // Throttle controls handler
  const setThrust = (val: number) => {
    inputRef.current.thrust = val
    broadcastInput({ thrust: val })
    triggerHaptic('medium')
    playSfx('paddle')
  }

  // Calculate couple synchrony rating
  const synchronyPercent = Math.max(
    50,
    Math.min(99, Math.round(98 - clashCount * 7 + lanternCount * 1.5))
  )

  return (
    <div
      className={cn(
        'relative mx-auto flex flex-col items-center justify-between overflow-hidden select-none',
        'rounded-3xl border border-[#e2d5c3] dark:border-[#2e3146]',
        'bg-[#111219] text-[#FAF6EE] shadow-2xl',
        'w-full max-w-xl h-[680px]',
        className
      )}
    >
      {/* ── River Header HUD ────────────────────────────────────────────── */}
      <header className="relative z-20 w-full px-5 py-3.5 flex items-center justify-between border-b border-[#2e3146]/70 bg-[#151722]/85 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/80 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#E07A5F] uppercase tracking-wider">
              <Compass className="h-3 w-3" />
              <span>Two-Boat River · Co-Op</span>
            </div>
            <div className="text-xs text-white/70 font-medium">
              {role === 'solo_split'
                ? 'Shared Screen (Split Controls)'
                : role === 'helm'
                  ? 'Your Role: Helm & Rudder'
                  : 'Your Role: Engine & Sails'}
            </div>
          </div>
        </div>

        {/* HUD Counters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs font-mono font-semibold text-[#81B29A] bg-[#81B29A]/15 px-2.5 py-1 rounded-full">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{lanternCount}</span>
          </div>

          <div className="flex items-center gap-1 text-xs font-mono font-semibold text-[#F28E6F] bg-[#F28E6F]/15 px-2.5 py-1 rounded-full">
            <span>{Math.round(distance)}m / 1000m</span>
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/70 transition-colors"
            aria-label={soundEnabled ? 'Mute bedtime sounds' : 'Enable bedtime sounds'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* ── River Canvas Stage ─────────────────────────────────────────── */}
      <main className="relative flex-1 w-full overflow-hidden bg-gradient-to-b from-[#0d0e15] via-[#121420] to-[#171a2a]">
        {/* Animated River Ripples & Stars */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-10 left-12 h-1 w-1 rounded-full bg-white animate-pulse" />
          <div className="absolute top-28 right-16 h-1 w-1 rounded-full bg-amber-200 animate-ping" />
          <div className="absolute top-44 left-28 h-1 w-1 rounded-full bg-cyan-200 animate-pulse" />
          <div className="absolute top-72 right-32 h-1 w-1 rounded-full bg-white animate-pulse" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#151722]/80 to-transparent" />
        </div>

        {/* River Bank Guides (left & right shores) */}
        <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-emerald-950/40 to-transparent border-r border-emerald-800/20" />
        <div className="absolute inset-y-0 right-0 w-3 bg-gradient-to-l from-emerald-950/40 to-transparent border-l border-emerald-800/20" />

        {/* Obstacles (Rocks & Eddies) */}
        {obstacles.map((obs) => (
          <div
            key={obs.id}
            style={{
              left: `${obs.x}%`,
              top: `${obs.y}%`,
              width: `${obs.size}px`,
              height: `${obs.size}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className={cn(
              'absolute rounded-full transition-all duration-75 flex items-center justify-center shadow-lg',
              obs.type === 'rock'
                ? 'bg-[#3b4252] border border-[#4c566a] shadow-[#2e3440]'
                : 'bg-cyan-900/60 border border-cyan-500/40 animate-spin shadow-cyan-900/40'
            )}
          >
            {obs.type === 'rock' ? (
              <span className="text-[10px] select-none opacity-60">🪨</span>
            ) : (
              <span className="text-[10px] select-none opacity-60">🌀</span>
            )}
          </div>
        ))}

        {/* Collectibles (Glowing Bedtime Lotus Lanterns) */}
        {collectibles.map((c) =>
          c.collected ? null : (
            <div
              key={c.id}
              style={{
                left: `${c.x}%`,
                top: `${c.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute flex items-center justify-center animate-bounce"
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute h-7 w-7 rounded-full bg-[#E07A5F]/30 animate-ping" />
                <span className="relative text-xl filter drop-shadow-[0_0_8px_#f28e6f]">
                  🪷
                </span>
              </div>
            </div>
          )
        )}

        {/* The Shared Vessel (Wooden Boat with Couple Glow) */}
        <div
          style={{
            left: `${boatX}%`,
            top: '78%',
            transform: `translate(-50%, -50%) rotate(${boatAngle}deg)`,
          }}
          className="absolute z-10 transition-transform duration-75 ease-out"
        >
          {/* Boat Wake ripple */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-6 bg-white/15 rounded-full blur-xs -z-10" />

          {/* Wooden Boat Hull */}
          <div className="relative w-12 h-20 rounded-t-[24px] rounded-b-[14px] bg-gradient-to-b from-[#b07d58] via-[#8c5836] to-[#693e24] border border-[#d6a57e] shadow-[0_8px_20px_rgba(0,0,0,0.6)] flex flex-col items-center justify-between p-2">
            {/* Helm Lantern */}
            <div className="h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_12px_#fde047] animate-pulse" />

            {/* Couple avatars inside boat */}
            <div className="flex items-center gap-1">
              <div className="h-3.5 w-3.5 rounded-full bg-[#E07A5F] ring-1 ring-white/50 flex items-center justify-center text-[7px] font-bold text-white">
                P1
              </div>
              <div className="h-3.5 w-3.5 rounded-full bg-[#81B29A] ring-1 ring-white/50 flex items-center justify-center text-[7px] font-bold text-white">
                P2
              </div>
            </div>

            {/* Stern Rudder */}
            <div className="h-1 w-4 rounded-full bg-[#4a2b16]" />
          </div>
        </div>

        {/* Pre-Game Overlay */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs p-6 text-center space-y-5">
            <div className="space-y-2">
              <span className="text-4xl">🛶</span>
              <h2 className="text-2xl font-bold font-[family-name:var(--ds-font-display)] text-white">
                Two-Boat River
              </h2>
              <p className="text-xs text-white/70 max-w-xs leading-relaxed">
                A midnight co-op journey for two. One steers the rudder, one sets the speed.
                Collect lotus lanterns and reach the sanctuary temple together!
              </p>
            </div>

            {/* Role Selector */}
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { id: 'solo_split', label: 'Shared Screen' },
                { id: 'helm', label: 'I’ll Steer (Helm)' },
                { id: 'engine', label: 'I’ll Paddle (Speed)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRole(tab.id as CoOpRole)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-full border transition-all font-medium',
                    role === tab.id
                      ? 'bg-[#E07A5F] text-white border-[#E07A5F] shadow-sm'
                      : 'bg-white/10 text-white/70 border-white/15 hover:text-white'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tonight's Stake */}
            <div className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-3 text-left space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#F28E6F]">
                <Flame className="h-3 w-3" />
                <span>Selected Bedtime Stake</span>
              </div>
              <div className="text-xs text-white font-medium">{activeStake}</div>
            </div>

            <Button
              size="lg"
              onClick={() => handleStartGame(true)}
              className="bg-[#E07A5F] hover:bg-[#d0694e] text-white font-semibold shadow-lg px-8 py-3 rounded-full"
            >
              <Play className="h-4 w-4 mr-2" />
              <span>Launch Shared Vessel</span>
            </Button>
          </div>
        )}

        {/* Victory / Game Over Screen */}
        {isGameOver && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 text-center space-y-5 animate-in fade-in duration-300">
            <div className="space-y-2">
              <div className="h-14 w-14 rounded-full bg-[#81B29A]/20 border border-[#81B29A] text-2xl flex items-center justify-center mx-auto shadow-lg shadow-[#81B29A]/20">
                🏆
              </div>
              <h2 className="text-2xl font-bold font-[family-name:var(--ds-font-display)] text-white">
                River Journey Complete!
              </h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{synchronyPercent}% Couple Telepathy</span>
              </div>
            </div>

            {/* Score Summary */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-xs text-center">
              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                <div className="text-[10px] text-white/60">Lotus Blooms</div>
                <div className="text-lg font-bold text-[#E07A5F]">{lanternCount}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                <div className="text-[10px] text-white/60">River Bumps</div>
                <div className="text-lg font-bold text-amber-400">{clashCount}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                <div className="text-[10px] text-white/60">Total Score</div>
                <div className="text-lg font-bold text-[#81B29A]">{score}</div>
              </div>
            </div>

            {/* Forfeit Result Banner */}
            <div className="w-full max-w-sm rounded-2xl border border-[#E07A5F]/40 bg-[#E07A5F]/15 p-4 text-center space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#F28E6F]">
                {synchronyPercent >= 80 ? '👑 Partner Victory Forfeit' : '🌶️ River Penalty Forfeit'}
              </div>
              <div className="text-sm font-semibold text-white">{activeStake}</div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => handleReset(true)}
                className="border-white/20 text-white hover:bg-white/10 rounded-full"
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                <span>Play Again</span>
              </Button>
              {onBack && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={onBack}
                  className="bg-[#E07A5F] hover:bg-[#d0694e] text-white rounded-full"
                >
                  <span>Return to Parlour</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Split Controls Dock ─────────────────────────────────────────── */}
      <footer className="relative z-20 w-full px-4 py-4 border-t border-[#2e3146]/70 bg-[#151722]/90 backdrop-blur-md">
        {role === 'solo_split' ? (
          /* Two-Hand / Shared Phone Split Controls */
          <div className="grid grid-cols-2 gap-4">
            {/* Left Hand: Steering / Helm */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-[#E07A5F] uppercase tracking-wider text-center">
                Player 1 · Helm (Steer)
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onMouseDown={() => setSteering(true, false)}
                  onMouseUp={() => setSteering(false, false)}
                  onTouchStart={() => setSteering(true, false)}
                  onTouchEnd={() => setSteering(false, false)}
                  className="flex-1 py-3.5 rounded-xl bg-white/10 active:bg-[#E07A5F] active:text-white border border-white/15 text-white font-bold text-sm transition-all text-center"
                >
                  ◀ Left
                </button>
                <button
                  type="button"
                  onMouseDown={() => setSteering(false, true)}
                  onMouseUp={() => setSteering(false, false)}
                  onTouchStart={() => setSteering(false, true)}
                  onTouchEnd={() => setSteering(false, false)}
                  className="flex-1 py-3.5 rounded-xl bg-white/10 active:bg-[#E07A5F] active:text-white border border-white/15 text-white font-bold text-sm transition-all text-center"
                >
                  Right ▶
                </button>
              </div>
            </div>

            {/* Right Hand: Engine / Speed */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-[#81B29A] uppercase tracking-wider text-center">
                Player 2 · Engine (Speed)
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setThrust(0.5)}
                  className={cn(
                    'flex-1 py-3.5 rounded-xl border text-xs font-semibold transition-all',
                    speed < 0.8
                      ? 'bg-[#81B29A] text-white border-[#81B29A]'
                      : 'bg-white/10 text-white/80 border-white/15'
                  )}
                >
                  Brake
                </button>
                <button
                  type="button"
                  onClick={() => setThrust(1.0)}
                  className={cn(
                    'flex-1 py-3.5 rounded-xl border text-xs font-semibold transition-all',
                    speed >= 0.8 && speed <= 1.4
                      ? 'bg-[#81B29A] text-white border-[#81B29A]'
                      : 'bg-white/10 text-white/80 border-white/15'
                  )}
                >
                  Cruise
                </button>
                <button
                  type="button"
                  onClick={() => setThrust(1.8)}
                  className={cn(
                    'flex-1 py-3.5 rounded-xl border text-xs font-semibold transition-all',
                    speed > 1.4
                      ? 'bg-[#E07A5F] text-white border-[#E07A5F]'
                      : 'bg-white/10 text-white/80 border-white/15'
                  )}
                >
                  Boost ⚡
                </button>
              </div>
            </div>
          </div>
        ) : role === 'helm' ? (
          /* Helm Role Only (Full-Width Steer Controls) */
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-[#E07A5F] uppercase tracking-wider text-center">
              Helm Master · Steer Boat
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onMouseDown={() => setSteering(true, false)}
                onMouseUp={() => setSteering(false, false)}
                onTouchStart={() => setSteering(true, false)}
                onTouchEnd={() => setSteering(false, false)}
                className="flex-1 py-4 rounded-2xl bg-white/10 active:bg-[#E07A5F] active:text-white border border-white/15 text-white font-bold text-base transition-all text-center"
              >
                ◀ Steer Left
              </button>
              <button
                type="button"
                onMouseDown={() => setSteering(false, true)}
                onMouseUp={() => setSteering(false, false)}
                onTouchStart={() => setSteering(false, true)}
                onTouchEnd={() => setSteering(false, false)}
                className="flex-1 py-4 rounded-2xl bg-white/10 active:bg-[#E07A5F] active:text-white border border-white/15 text-white font-bold text-base transition-all text-center"
              >
                Steer Right ▶
              </button>
            </div>
          </div>
        ) : (
          /* Engine Role Only (Full-Width Speed Controls) */
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-[#81B29A] uppercase tracking-wider text-center">
              Engine Room · Throttle &amp; Sails
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setThrust(0.5)}
                className={cn(
                  'flex-1 py-4 rounded-2xl border text-sm font-semibold transition-all',
                  speed < 0.8
                    ? 'bg-[#81B29A] text-white border-[#81B29A]'
                    : 'bg-white/10 text-white/80 border-white/15'
                )}
              >
                Brake / Slow
              </button>
              <button
                type="button"
                onClick={() => setThrust(1.0)}
                className={cn(
                  'flex-1 py-4 rounded-2xl border text-sm font-semibold transition-all',
                  speed >= 0.8 && speed <= 1.4
                    ? 'bg-[#81B29A] text-white border-[#81B29A]'
                    : 'bg-white/10 text-white/80 border-white/15'
                )}
              >
                Normal Cruise
              </button>
              <button
                type="button"
                onClick={() => setThrust(1.8)}
                className={cn(
                  'flex-1 py-4 rounded-2xl border text-sm font-semibold transition-all',
                  speed > 1.4
                    ? 'bg-[#E07A5F] text-white border-[#E07A5F]'
                    : 'bg-white/10 text-white/80 border-white/15'
                )}
              >
                Paddle Boost ⚡
              </button>
            </div>
          </div>
        )}
      </footer>
    </div>
  )
}
