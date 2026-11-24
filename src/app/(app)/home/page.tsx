'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Gamepad2,
  Flame,
  Heart,
  Lock,
  MessageCircle,
  MessageSquareQuote,
  Moon,
  Phone,
  Plus,
  Radio,
  Send,
  Sparkles,
  UserPlus,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useSanctuary } from '@/components/providers/sanctuary-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getLocalDailyInquiry,
  listLocalCalendarEvents,
  listLocalMemories,
  listLocalMessages,
  subscribeLocalSanctuary,
  type LocalMessage,
} from '@/lib/sanctuary/local-store'
import { getInitials } from '@/components/sanctuary/private-shell'
import { getDecoyPreset } from '@/lib/sanctuary/stealth'
import { KULFI_STAKES } from '@/lib/games/data'
import { triggerHaptic, playBedtimeSound } from '@/lib/sanctuary/mobile-haptics'

export { getDecoyPreset }

function formatTimeAgo(isoString?: string | null): string {
  if (!isoString) return ''
  try {
    const diffMs = Date.now() - new Date(isoString).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

export default function TodayPage() {
  const {
    spaces,
    activeSpace,
    createSpace,
    createInvite,
    demoActor,
    setDemoActor,
    isLocalSandbox,
  } = useSanctuary()

  const [copiedLink, setCopiedLink] = React.useState(false)

  // Local data state reactive to changes
  const [messages, setMessages] = React.useState<LocalMessage[]>([])
  const [dailyPrompt, setDailyPrompt] = React.useState<string>(
    'What small moment brought you quiet comfort today?'
  )
  const [latestMemory, setLatestMemory] = React.useState<string | null>(null)
  const [nextEvent, setNextEvent] = React.useState<string | null>(null)

  // Kulfi Nightcap & Stakes State
  const [selectedStake, setSelectedStake] = React.useState<string>(KULFI_STAKES[0])
  const [nightcapInput, setNightcapInput] = React.useState('')
  const [myNightcapAnswer, setMyNightcapAnswer] = React.useState<string | null>(null)
  const [partnerNightcapAnswer, setPartnerNightcapAnswer] = React.useState<string | null>(null)
  const [revealed, setRevealed] = React.useState(false)
  const [audioAmbientPlaying, setAudioAmbientPlaying] = React.useState(false)

  const currentSpace = activeSpace ?? spaces[0] ?? null
  const currentSpaceId = currentSpace?.id

  // Load and subscribe to local store updates
  React.useEffect(() => {
    const updateData = () => {
      if (!currentSpaceId) return
      try {
        const msgs = listLocalMessages(currentSpaceId)
        setMessages(msgs)

        const daily = getLocalDailyInquiry(currentSpaceId)
        if (daily?.prompt) {
          setDailyPrompt(daily.prompt)
        }

        const mems = listLocalMemories(currentSpaceId)
        if (mems.length > 0) {
          setLatestMemory(mems[0].title || mems[0].content || 'Quiet memory')
        }

        const events = listLocalCalendarEvents(currentSpaceId)
        if (events.length > 0) {
          setNextEvent(`${events[0].title} · ${events[0].eventDate}`)
        }
      } catch {
        // Continue gracefully
      }
    }

    updateData()
    const unsubscribe = subscribeLocalSanctuary(updateData)
    return () => unsubscribe()
  }, [currentSpaceId])

  const handleCopyInvite = async (text: string) => {
    if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return
    await navigator.clipboard.writeText(text)
    setCopiedLink(true)
    window.setTimeout(() => setCopiedLink(false), 2200)
  }

  const handleLockNightcap = () => {
    if (!nightcapInput.trim()) return
    triggerHaptic('heavy')
    playBedtimeSound('lock')
    setMyNightcapAnswer(nightcapInput.trim())
    setNightcapInput('')
    // In local sandbox, auto-generate partner answer for delight
    if (!partnerNightcapAnswer) {
      setPartnerNightcapAnswer('When we laughed about the silly grocery run.')
    }
  }

  const handleRevealNightcap = () => {
    triggerHaptic('lantern')
    playBedtimeSound('success')
    setRevealed(true)
  }

  const toggleBedtimeAmbience = () => {
    if (!audioAmbientPlaying) {
      playBedtimeSound('paddle')
      triggerHaptic('light')
      setAudioAmbientPlaying(true)
    } else {
      setAudioAmbientPlaying(false)
    }
  }

  // ── Empty State: Direct 1-Click Invite & Go to Chat ──────────────────────
  if (spaces.length === 0) {
    return (
      <div className="mx-auto max-w-[640px] px-4 sm:px-6 py-20 flex flex-col items-center justify-center text-center space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 shadow-sm">
          <span className="text-2xl" role="img" aria-label="Kulfi">🍨</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[var(--foreground)] font-[family-name:var(--ds-font-display)]">
            Kulfi Bedtime Sanctuary
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] max-w-sm mx-auto leading-relaxed">
            A private room designed exclusively for two phones. Share your invite link to begin nightly calls, split-control games, and intimate nightcaps.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            size="md"
            className="rounded-full px-6 py-2.5 font-semibold bg-[var(--primary)] text-white shadow-sm"
            onClick={async () => {
              try {
                const res = await createInvite(undefined)
                const url = res?.inviteUrl || `${window.location.origin}/invite/sol-${Math.random().toString(36).slice(2, 9)}`
                await handleCopyInvite(url)
              } catch {
                const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/sol-${Math.random().toString(36).slice(2, 9)}`
                await handleCopyInvite(url)
              }
            }}
          >
            {copiedLink ? (
              <>
                <Check className="h-4 w-4 mr-2 text-white" />
                <span>Invite Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                <span>Copy Partner Invite Link</span>
              </>
            )}
          </Button>
          <Button variant="outline" size="md" className="rounded-full px-5" asChild>
            <Link href="/messages">
              <MessageCircle className="h-4 w-4 mr-2 text-[var(--primary)]" />
              <span>Go to Chat</span>
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const partnerName =
    currentSpace?.partner?.displayName || currentSpace?.name || 'Partner'
  const initials = getInitials(partnerName)
  const messagesHref = '/messages'
  const callHref = `/calls?partner=${encodeURIComponent(partnerName)}`

  const lastMessage =
    messages.length > 0 ? messages[messages.length - 1] : null
  const recentMessages = messages.slice(-3).reverse()

  return (
    <div className="mx-auto max-w-[960px] px-4 sm:px-6 py-8 space-y-8">
      {/* ── 1. Kulfi Couple Hero Banner ─────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface-1)] via-[var(--surface-0)] to-[var(--surface-2)] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            {/* Interlocking Couple Avatars */}
            <div className="relative flex -space-x-3 shrink-0">
              <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-white text-base font-bold ring-4 ring-[var(--surface-1)] shadow-md">
                Y
              </span>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--secondary)] text-white text-base font-bold ring-4 ring-[var(--surface-1)] shadow-md">
                {initials}
              </span>
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] text-xs font-bold uppercase tracking-wider">
                  <Moon className="h-3.5 w-3.5" />
                  <span>Bedtime Parlour for Two</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Synced</span>
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] font-[family-name:var(--ds-font-display)] truncate">
                You &amp; {partnerName}
              </h2>

              <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[var(--primary)]" aria-hidden="true" />
                <span>Strictly 1:1 sanctuary · Zero third parties · Nightly wind-down</span>
              </p>
            </div>
          </div>

          {/* Quick Tactile Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {Boolean(!currentSpace?.partner || currentSpace?.pendingInviteUrl || currentSpace?.partner?.displayName === 'Partner pending') && (
              <Button
                variant="outline"
                className="rounded-full px-4 text-xs font-semibold"
                onClick={async () => {
                  try {
                    const res = await createInvite(currentSpaceId)
                    const url = res?.inviteUrl || `${window.location.origin}/invite/sol-${Math.random().toString(36).slice(2, 9)}`
                    await handleCopyInvite(url)
                  } catch {
                    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/sol-${Math.random().toString(36).slice(2, 9)}`
                    await handleCopyInvite(url)
                  }
                }}
              >
                {copiedLink ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5 text-green-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-1.5 text-[var(--primary)]" />
                    <span>Invite</span>
                  </>
                )}
              </Button>
            )}

            <Button
              variant="primary"
              className="rounded-full px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-semibold shadow-sm"
              asChild
            >
              <Link href={callHref}>
                <Phone className="h-4 w-4 mr-2" />
                <span>Bedtime Call</span>
              </Link>
            </Button>

            <Button
              variant="outline"
              className="rounded-full px-4.5 py-2.5 font-medium border-[var(--border)] hover:bg-[var(--surface-2)]"
              asChild
            >
              <Link href={messagesHref}>
                <MessageCircle className="h-4 w-4 mr-1.5 text-[var(--primary)]" />
                <span>Whisper Chat</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── 2. Tonight's Kulfi Nightcap (Blind-Reveal Question) ─────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-[#f0d5c5] dark:border-[#3d2720] bg-gradient-to-br from-[#fff7f2] via-[#fffdfa] to-[#faf3eb] dark:from-[#1b151b] dark:via-[#171824] dark:to-[#1b1e2a] p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f0d8ca]/60 dark:border-[#38231d]/80 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#e07a5f] uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tonight’s Kulfi Nightcap · Blind Reveal</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] font-[family-name:var(--ds-font-display)]">
              &ldquo;{dailyPrompt}&rdquo;
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Lock in your answer secretly. Neither of you can read what the other wrote until both have submitted!
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs border-[#e07a5f]/40 text-[#e07a5f] font-semibold bg-[#e07a5f]/10">
              🌙 Day Question
            </Badge>
          </div>
        </div>

        {/* Interactive Blind Reveal Box */}
        {!myNightcapAnswer ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <Input
                value={nightcapInput}
                onChange={(e) => setNightcapInput(e.target.value)}
                placeholder="Type your secret answer for your partner..."
                className="rounded-full bg-white dark:bg-[#181926] border-[var(--border)] px-4 py-2 text-sm focus:ring-[var(--primary)]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLockNightcap()
                }}
              />
              <Button
                onClick={handleLockNightcap}
                disabled={!nightcapInput.trim()}
                className="w-full sm:w-auto rounded-full px-6 bg-[var(--primary)] text-white font-semibold shrink-0"
              >
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                <span>Lock in Secret</span>
              </Button>
            </div>
          </div>
        ) : !revealed ? (
          <div className="rounded-2xl bg-white/80 dark:bg-[#181926]/80 border border-[#f5cfbd] dark:border-[#3d2720] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#e07a5f]">
                <Clock className="h-4 w-4 animate-spin text-[#e07a5f]" />
                <span>Your Answer is Sealed in the Vault!</span>
              </div>
              <Badge variant="outline" className="text-[11px] rounded-full">
                Waiting for {partnerName}
              </Badge>
            </div>

            <p className="text-sm italic text-[var(--foreground)] bg-[var(--surface-0)] rounded-xl p-3 border border-[var(--border)]">
              &ldquo;{myNightcapAnswer}&rdquo;
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-xs text-[var(--muted-foreground)]">
                Tell your partner to lock in their answer to trigger the simultaneous reveal.
              </p>
              <Button
                size="sm"
                variant="primary"
                onClick={handleRevealNightcap}
                className="rounded-full px-5 bg-[#e07a5f] hover:bg-[#d0694e] text-white font-semibold"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                <span>Simulate Reveal for Both</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Both Answers Revealed! Tonight&rsquo;s Harmony Unlocked ✨</span>
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                +25 Intimacy Points
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white dark:bg-[#181926] p-3.5 border border-[var(--border)] space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--primary)]">
                  You wrote
                </span>
                <p className="text-sm text-[var(--foreground)] font-medium">
                  {myNightcapAnswer}
                </p>
              </div>

              <div className="rounded-xl bg-white dark:bg-[#181926] p-3.5 border border-[var(--border)] space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--secondary)]">
                  {partnerName} wrote
                </span>
                <p className="text-sm text-[var(--foreground)] font-medium">
                  {partnerNightcapAnswer}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── 3. Kulfi Stakes Selector Bar ─────────────────────────────────── */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
            <Flame className="h-4 w-4" />
            <span>Tonight’s Kulfi Forfeit Stakes</span>
          </div>
          <span className="text-xs text-[var(--muted-foreground)]">
            Tap to set wager for tonight&rsquo;s games
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {KULFI_STAKES.map((stake) => {
            const isSelected = selectedStake === stake
            return (
              <button
                key={stake}
                type="button"
                onClick={() => {
                  setSelectedStake(stake)
                  triggerHaptic('light')
                  playBedtimeSound('paddle')
                }}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs scale-102 font-semibold'
                    : 'bg-[var(--surface-0)] text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]'
                }`}
              >
                {stake}
              </button>
            )
          })}
        </div>

        <div className="text-[11px] text-[var(--muted-foreground)] pt-1 flex items-center gap-1.5">
          <span>Active wager:</span>
          <span className="font-semibold text-[var(--foreground)]">&ldquo;{selectedStake}&rdquo;</span>
          <span>· Loser of tonight&rsquo;s live showdown fulfills it tomorrow!</span>
        </div>
      </section>

      {/* ── 4. Bedtime Parlour Games Cards ───────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-[var(--primary)]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">
              Bedtime Games for Two Phones
            </h3>
          </div>
          <Link
            href="/games"
            className="text-xs font-semibold text-[var(--primary)] hover:underline"
          >
            Explore all games &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Co-Op Two-Boat River */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 flex flex-col justify-between hover:border-[var(--primary)] transition-all shadow-xs space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl" role="img" aria-label="River Boat">🛶</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[11px] font-bold">
                  Split-Control Co-Op
                </span>
              </div>
              <h4 className="font-[family-name:var(--ds-font-display)] text-lg font-bold text-[var(--foreground)]">
                Two-Boat River Sanctuary
              </h4>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                One partner steers the helm while the other sets the throttle. Collect glowing lotus lanterns together on your call!
              </p>
            </div>
            <Button size="sm" variant="primary" className="w-full rounded-full bg-[var(--primary)] text-white font-semibold" asChild>
              <Link href="/games/co-op">Launch Co-Op River</Link>
            </Button>
          </div>

          {/* Card 2: Who's More Likely */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 flex flex-col justify-between hover:border-[var(--primary)] transition-all shadow-xs space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl" role="img" aria-label="Voting">🙋</span>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[11px] font-bold">
                  Simultaneous Vote
                </span>
              </div>
              <h4 className="font-[family-name:var(--ds-font-display)] text-lg font-bold text-[var(--foreground)]">
                Who&rsquo;s More Likely To?
              </h4>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Both vote Me or Them simultaneously on count of three. Match answers to build intimacy points or face tonight&rsquo;s stake!
              </p>
            </div>
            <Button size="sm" variant="outline" className="w-full rounded-full font-semibold border-[var(--border)]" asChild>
              <Link href="/games/game-likely-01">Play 3.. 2.. 1.. Vote</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── 5. Ambient Bedtime Soundscape Bar ─────────────────────────────── */}
      <section className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 px-5 py-3 text-xs">
        <div className="flex items-center gap-2.5 text-[var(--foreground)]">
          <button
            type="button"
            onClick={toggleBedtimeAmbience}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-1)] text-[var(--primary)] border border-[var(--border)] hover:scale-105 transition-transform cursor-pointer"
            title="Toggle Bedtime Soundscape"
          >
            {audioAmbientPlaying ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <div>
            <div className="font-semibold text-xs text-[var(--foreground)]">
              Bedtime Soundscape {audioAmbientPlaying ? '· Playing Gentle Ambient Chimes' : '· Paused'}
            </div>
            <div className="text-[11px] text-[var(--muted-foreground)]">
              Calming low-frequency synthesized audio for talking and winding down in bed
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleBedtimeAmbience}
          className="rounded-full text-xs text-[var(--primary)] font-semibold"
        >
          {audioAmbientPlaying ? 'Mute' : 'Play Audio'}
        </Button>
      </section>

      {/* ── 6. Three Hairline Rows ────────────────────────────────────────── */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] divide-y divide-[var(--border)] shadow-[var(--shadow-1)] overflow-hidden">
        {/* Row 1: Today's Prompt */}
        <Link
          href="/questions"
          className="group flex items-center justify-between p-4.5 sm:px-6 hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--primary)] shrink-0 group-hover:bg-[var(--surface-1)] transition-colors">
              <MessageSquareQuote className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider text-[10px]">
                Today&rsquo;s Prompt Bank
              </div>
              <div className="text-sm font-medium text-[var(--foreground)] truncate">
                {dailyPrompt}
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)] shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        {/* Row 2: Shared Memory */}
        <Link
          href="/memories"
          className="group flex items-center justify-between p-4.5 sm:px-6 hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--primary)] shrink-0 group-hover:bg-[var(--surface-1)] transition-colors">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider text-[10px]">
                Latest Memory &amp; Vault
              </div>
              <div className="text-sm font-medium text-[var(--foreground)] truncate">
                {latestMemory || 'Shared thoughts, photographs & notes'}
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)] shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        {/* Row 3: Next Calendar Date */}
        <Link
          href="/calendar"
          className="group flex items-center justify-between p-4.5 sm:px-6 hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--primary)] shrink-0 group-hover:bg-[var(--surface-1)] transition-colors">
              <Calendar className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider text-[10px]">
                Couples Calendar
              </div>
              <div className="text-sm font-medium text-[var(--foreground)] truncate">
                {nextEvent || 'No upcoming scheduled events'}
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)] shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </section>

      {/* ── 7. Recent Whispers & Activity ──────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] text-[11px]">
            Recent Whispers &amp; Notes
          </h3>
          {messages.length > 0 && (
            <Link
              href={messagesHref}
              className="text-xs font-semibold text-[var(--primary)] hover:underline underline-offset-4"
            >
              View conversation
            </Link>
          )}
        </div>

        {recentMessages.length > 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] divide-y divide-[var(--border)] shadow-[var(--shadow-1)] overflow-hidden">
            {recentMessages.map((msg) => {
              const isSelf = msg.senderRole === 'self'
              const senderName = isSelf ? 'You' : partnerName
              return (
                <div
                  key={msg.id}
                  className="flex items-center justify-between p-3.5 sm:px-5 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-[11px] font-bold text-[var(--foreground)] shrink-0 border border-[var(--border)]">
                      {isSelf ? 'Y' : initials}
                    </span>
                    <div className="truncate">
                      <span className="text-xs font-bold text-[var(--foreground)] mr-2">
                        {senderName}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {msg.text}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-[var(--muted-foreground)] shrink-0">
                    {formatTimeAgo(msg.createdAt)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-center text-xs text-[var(--muted-foreground)]">
            No whispers yet. Send a quiet note to begin your late-night conversation.
          </div>
        )}
      </section>
    </div>
  )
}
