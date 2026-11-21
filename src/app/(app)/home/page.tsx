'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  Sparkles,
  Video,
  Gamepad2,
  HelpCircle,
  Clock,
  Palette,
  Calendar,
  Lock,
  ArrowRight,
  Copy,
  Check,
  UserPlus,
  Moon,
  Sun,
  BookHeart,
  Phone,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { StatusBanner } from '@/components/ui/status-banner'
import { useDesignSystem } from '@/components/providers/design-system-provider'
import { useSanctuary } from '@/components/providers/sanctuary-provider'
import {
  answerLocalDailyInquiry,
  getLocalDailyInquiry,
  listLocalCalendarEvents,
  subscribeLocalSanctuary,
  type LocalCalendarEvent,
} from '@/lib/sanctuary/local-store'
import { daysUntilDate } from '@/lib/utils'

interface DailySummary {
  id: string
  date: string
  questionId: string
  category: string
  prompt: string
  myAnswer: string | null
  hasPartnerAnswered: boolean
  partnerAnswer: string | null
  revealed: boolean
}

const MOODS = [
  { label: 'Tender & Loving', icon: '🕊️' },
  { label: 'Need a Gentle Hug', icon: '🫂' },
  { label: 'A Bit Tired / Low', icon: '🌙' },
  { label: 'Playful & Chatty', icon: '✨' },
  { label: 'Want Quiet Together', icon: '☕' },
]

const SANCTUARY_PALETTES = [
  'ivory',
  'beige',
  'sage',
  'lavender',
  'dusty-rose',
  'burgundy',
  'charcoal',
  'warm-grey',
] as const

export default function SanctuaryDashboard() {
  const { palette, setPalette, mode, toggleMode } = useDesignSystem()
  const {
    configured,
    isLocalSandbox,
    loading,
    demoActor,
    setDemoActor,
    activeSpace,
    createSpace,
    createInvite,
    setMood,
  } = useSanctuary()

  const [newSpaceName, setNewSpaceName] = React.useState('Our Quiet Place')
  const [creatingSpace, setCreatingSpace] = React.useState(false)
  const [inviteLoading, setInviteLoading] = React.useState(false)
  const [generatedInvite, setGeneratedInvite] = React.useState<{
    spaceId: string
    url: string
  } | null>(null)
  const [copiedInvite, setCopiedInvite] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [dailyRecord, setDailyRecord] = React.useState<{
    spaceId: string
    data: DailySummary
  } | null>(null)
  const [inlineDailyDraft, setInlineDailyDraft] = React.useState('')
  const [localEvents, setLocalEvents] = React.useState<LocalCalendarEvent[]>([])

  const currentMood = activeSpace?.myMood ?? null
  const chatHref = activeSpace
    ? `/messages/${activeSpace.id}`
    : !loading && !configured
      ? '/messages/space-1'
      : '/home'
  const inviteUrl =
    (generatedInvite?.spaceId === activeSpace?.id ? generatedInvite?.url : null) ??
    activeSpace?.pendingInviteUrl ??
    null
  const daily =
    activeSpace?.id && dailyRecord?.spaceId === activeSpace.id
      ? dailyRecord.data
      : null

  const refreshLocalSnapshot = React.useCallback((spaceId: string) => {
    setDailyRecord({ spaceId, data: getLocalDailyInquiry(spaceId) })
    setLocalEvents(listLocalCalendarEvents(spaceId))
  }, [])

  React.useEffect(() => {
    const spaceId = activeSpace?.id
    if (!spaceId) return

    if (!configured && !loading) {
      Promise.resolve().then(() => refreshLocalSnapshot(spaceId))
      return subscribeLocalSanctuary(() => refreshLocalSnapshot(spaceId))
    }

    if (!configured) return

    let active = true
    fetch(`/api/questions/daily?spaceId=${encodeURIComponent(spaceId)}`, {
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (active && payload?.daily) {
          setDailyRecord({ spaceId, data: payload.daily as DailySummary })
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [configured, loading, activeSpace?.id, demoActor, refreshLocalSnapshot])

  const handleSelectMood = async (label: string) => {
    if (!activeSpace?.id) return
    await setMood(label, activeSpace.id)
  }

  const handleQuickDailySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSpace?.id || !inlineDailyDraft.trim()) return
    if (!configured) {
      const updated = answerLocalDailyInquiry(activeSpace.id, inlineDailyDraft.trim())
      setDailyRecord({ spaceId: activeSpace.id, data: updated })
      setInlineDailyDraft('')
      return
    }
    const res = await fetch('/api/questions/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spaceId: activeSpace.id, answer: inlineDailyDraft.trim() }),
    })
    if (res.ok) {
      const payload = await res.json()
      if (payload?.daily) {
        setDailyRecord({ spaceId: activeSpace.id, data: payload.daily as DailySummary })
      }
      setInlineDailyDraft('')
    }
  }

  const upcomingMilestone = React.useMemo(() => {
    if (localEvents.length === 0) return null
    return [...localEvents].sort(
      (a, b) =>
        daysUntilDate(a.eventDate, a.recurringYearly) -
        daysUntilDate(b.eventDate, b.recurringYearly),
    )[0]
  }, [localEvents])

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSpaceName.trim()) return
    setActionError(null)
    setCreatingSpace(true)
    try {
      await createSpace(newSpaceName.trim())
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Unable to create space.')
    } finally {
      setCreatingSpace(false)
    }
  }

  const handleGenerateInvite = async () => {
    if (!activeSpace?.id) return
    setActionError(null)
    setInviteLoading(true)
    try {
      const res = await createInvite(activeSpace.id)
      setGeneratedInvite({ spaceId: activeSpace.id, url: res.inviteUrl })
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Unable to generate invite link.')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleCopyInvite = async () => {
    if (!inviteUrl || typeof navigator === 'undefined' || !navigator.clipboard) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopiedInvite(true)
    window.setTimeout(() => setCopiedInvite(false), 2000)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-10">
      {actionError && (
        <StatusBanner tone="error" title="Sanctuary Action Issue" description={actionError} />
      )}

      {/* ── Onboarding when authenticated user has no space yet ───────────────── */}
      {configured && !loading && !activeSpace && (
        <section className="rounded-[var(--ds-radius)] border border-[var(--primary)]/40 bg-[var(--card)] p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="space-y-1.5">
            <Badge variant="outline">First Step</Badge>
            <h2 className="font-[family-name:var(--ds-font-display)] text-2xl font-bold text-[var(--foreground)]">
              Create Your Two-Person Sanctuary
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] max-w-xl leading-relaxed">
              Give your private space a quiet name, then generate a single-use invitation link to connect with your partner.
            </p>
          </div>
          <form onSubmit={handleCreateSpace} className="flex flex-col sm:flex-row gap-3 max-w-lg">
            <Input
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              placeholder="e.g. Our Quiet Place"
              required
            />
            <Button type="submit" variant="primary" isLoading={creatingSpace}>
              <span>Create Sanctuary</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </form>
        </section>
      )}

      {/* ── Top Header / Couple Presence Banner ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--border)]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[var(--primary)] uppercase tracking-wider">
            <span
              className={`h-2 w-2 rounded-full ${
                activeSpace?.partner ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>
              {activeSpace
                ? activeSpace.partner
                  ? `Private Sanctuary · With ${activeSpace.partner.displayName}`
                  : 'Private Sanctuary · Waiting for Partner'
                : configured
                  ? 'Private Sanctuary · Ready to Initialize'
                  : 'Private Sanctuary · Preview Mode'}
            </span>
          </div>
          <h1 className="font-[family-name:var(--ds-font-display)] text-3xl sm:text-4xl font-bold tracking-tight text-[var(--foreground)]">
            {activeSpace?.name ?? 'Our Quiet Place'}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">
            A private room built for tender communication, playful games, and no harsh distractions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/calls">
              <Video className="h-4 w-4 mr-1.5 text-[var(--primary)]" />
              <span>Start 1:1 Call</span>
            </Link>
          </Button>
          <Button variant="primary" size="sm" asChild>
            <Link href={chatHref}>
              <MessageSquare className="h-4 w-4 mr-1.5" />
              <span>Open Chat</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Invite Partner Card ───────────────────────────────────────────────── */}
      {activeSpace && (!activeSpace.partner || isLocalSandbox) && (
        <section className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[var(--primary)]" />
              <span>
                {activeSpace.partner
                  ? 'Partner Invite & Two-Person Sandbox'
                  : 'Invite Your Partner (Strictly 2 People Max)'}
              </span>
            </h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              {isLocalSandbox
                ? 'Generate a local sandbox invite link or switch perspective between You and Partner.'
                : 'Single-use cryptographic token valid for 24 hours. Only your partner can accept it.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {inviteUrl ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md w-full">
                <Input value={inviteUrl} readOnly className="text-xs font-mono" />
                <Button variant="outline" size="sm" onClick={handleCopyInvite}>
                  {copiedInvite ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  <span>{copiedInvite ? 'Copied' : 'Copy'}</span>
                </Button>
                {isLocalSandbox && inviteUrl.includes('/invite/') && (
                  <Button variant="subtle" size="sm" asChild>
                    <Link href={new URL(inviteUrl, 'http://localhost').pathname}>
                      Test Link
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={handleGenerateInvite} isLoading={inviteLoading}>
                <span>Generate Invite Link</span>
              </Button>
            )}
          </div>
        </section>
      )}

      {/* ── Psychological De-escalation / Soft Mood Signal ──────────────────── */}
      <section className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <span>Soft Mood Pulse</span>
              <span className="text-xs font-normal text-[var(--muted-foreground)]">
                (A gentle hint for your partner before conversations begin)
              </span>
            </h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              Share your emotional temperature quietly so both of you enter conversations with care.
            </p>
          </div>
          {activeSpace?.partnerMood && (
            <Badge variant="outline" className="text-xs">
              {activeSpace.partner?.displayName ?? 'Partner'} feels: {activeSpace.partnerMood}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {MOODS.map((m) => {
            const isSelected = currentMood === m.label
            return (
              <button
                key={m.label}
                type="button"
                onClick={() => void handleSelectMood(m.label)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs transition-all cursor-pointer border ${
                  isSelected
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)] font-medium ring-1 ring-[var(--primary)]'
                    : 'border-[var(--border)] bg-[var(--muted)]/40 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Daily Question & Blind Reveal Highlight ─────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--primary)]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Today&apos;s Blind-Reveal Inquiry</span>
              </span>
              <Badge variant="outline" className="text-[11px]">
                {daily?.date ?? 'Daily Inquiry'}
              </Badge>
            </div>

            <h3 className="font-[family-name:var(--ds-font-display)] text-xl sm:text-2xl font-medium text-[var(--foreground)] leading-snug">
              &ldquo;
              {daily?.prompt ||
                'What is one small, quiet thing I did recently that made you feel deeply cherished?'}
              &rdquo;
            </h3>

            {!daily?.revealed ? (
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Both partners answer independently. Responses stay sealed until both answers are submitted.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-3 space-y-1">
                  <div className="text-[11px] font-medium text-[var(--primary)]">
                    {demoActor === 'partner' ? 'Partner View' : 'Your Answer'}
                  </div>
                  <p className="text-xs text-[var(--foreground)] leading-relaxed">{daily.myAnswer}</p>
                </div>
                <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-3 space-y-1">
                  <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    {activeSpace?.partner?.displayName ?? 'Partner'}&apos;s Answer
                  </div>
                  <p className="text-xs text-[var(--foreground)] leading-relaxed">{daily.partnerAnswer}</p>
                </div>
              </div>
            )}

            {daily && !daily.myAnswer && (
              <form onSubmit={handleQuickDailySubmit} className="flex flex-col sm:flex-row gap-2 pt-2">
                <Input
                  value={inlineDailyDraft}
                  onChange={(e) => setInlineDailyDraft(e.target.value)}
                  placeholder="Write your blind answer right here..."
                  className="text-xs"
                />
                <Button type="submit" size="sm" variant="primary" disabled={!inlineDailyDraft.trim()}>
                  Lock Answer
                </Button>
              </form>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border)]">
            <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-amber-500" />
              <span>
                {daily?.revealed
                  ? 'Revealed: both partners have answered'
                  : daily?.myAnswer
                    ? daily.hasPartnerAnswered
                      ? 'Both answered — opening reveal'
                      : 'Your answer is sealed; waiting for your partner'
                    : daily?.hasPartnerAnswered
                      ? 'Partner already answered — reply to reveal together'
                      : 'Status: Waiting for both answers'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isLocalSandbox && daily?.myAnswer && !daily?.revealed && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDemoActor(demoActor === 'self' ? 'partner' : 'self')}
                >
                  <Users className="h-3.5 w-3.5 mr-1 text-[var(--primary)]" />
                  <span>Reply as {demoActor === 'self' ? 'Partner' : 'You'}</span>
                </Button>
              )}
              <Button size="sm" variant={daily?.revealed ? 'outline' : 'primary'} asChild>
                <Link href="/questions">
                  <span>{daily?.revealed ? 'Discuss / Explore Prompts' : daily?.myAnswer ? 'Open Question Library' : 'Answer & Reveal'}</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side Column: Upcoming Milestone + Disappearing Chat Glance */}
        <div className="space-y-4 flex flex-col justify-between">
          {upcomingMilestone && (
            <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium uppercase tracking-wider text-[var(--primary)]">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Next Milestone</span>
                </span>
                <span className="font-semibold tabular-nums text-[var(--foreground)]">
                  {daysUntilDate(upcomingMilestone.eventDate, upcomingMilestone.recurringYearly)}d left
                </span>
              </div>
              <div className="font-[family-name:var(--ds-font-display)] text-base font-semibold text-[var(--foreground)]">
                {upcomingMilestone.title}
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <span>{upcomingMilestone.eventDate}</span>
                <Link href="/calendar" className="text-[var(--primary)] hover:underline">
                  Calendar &rarr;
                </Link>
              </div>
            </div>
          )}

          <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                <Clock className="h-3.5 w-3.5 text-[var(--primary)]" />
                <span>Disappearing Chats</span>
              </div>
              <h4 className="font-semibold text-sm text-[var(--foreground)]">
                Client WebCrypto &amp; Timed Purge
              </h4>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Attachments encrypt client-side via AES-256-CTR before storage; disappearing timers expire live.
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-[var(--muted-foreground)] bg-[var(--muted)]/40 p-3 rounded-[var(--ds-radius)]">
              <div className="flex justify-between">
                <span>Room Mode:</span>
                <span className="font-medium text-[var(--foreground)] truncate max-w-[140px]">
                  {activeSpace?.matrixRoomId
                    ? 'Matrix E2EE Linked'
                    : isLocalSandbox
                      ? 'Local Sandbox + WebCrypto'
                      : activeSpace
                        ? 'Supabase Workspace'
                        : 'Not paired'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Boundary:</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">2 Members Max</span>
              </div>
            </div>

            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href={chatHref}>Open Disappearing Chat</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Sanctuary Spaces & Activities Grid ───────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-[family-name:var(--ds-font-display)] text-xl font-semibold tracking-tight text-[var(--foreground)]">
          Shared Experiences &amp; Play
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href={chatHref}
            className="group rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)] transition-all space-y-3"
          >
            <div className="h-9 w-9 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <MessageSquare className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-1">
              <div className="font-medium text-sm text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                Private Messaging
              </div>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Encrypted voice/photos, reactions, edits, pinned keepsakes, and live countdown timers.
              </p>
            </div>
          </Link>

          <Link
            href="/games"
            className="group rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)] transition-all space-y-3"
          >
            <div className="h-9 w-9 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Gamepad2 className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-1">
              <div className="font-medium text-sm text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                Games &amp; Quizzes
              </div>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Couple trivia, Would-You-Rather, compatibility, and synchronized blind-reveal rounds.
              </p>
            </div>
          </Link>

          <Link
            href="/questions"
            className="group rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)] transition-all space-y-3"
          >
            <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <HelpCircle className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-1">
              <div className="font-medium text-sm text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                Question Library
              </div>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Curated conversation sparks across 8 domains plus custom shared prompts &amp; favorites.
              </p>
            </div>
          </Link>

          <Link
            href="/memories"
            className="group rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)] transition-all space-y-3"
          >
            <div className="h-9 w-9 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <BookHeart className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-1">
              <div className="font-medium text-sm text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                Memories &amp; Letters
              </div>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Open love letters, shared milestone timeline, and private reflection journals.
              </p>
            </div>
          </Link>

          <Link
            href="/calendar"
            className="group rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)] transition-all space-y-3"
          >
            <div className="h-9 w-9 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-1">
              <div className="font-medium text-sm text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                Relationship Calendar
              </div>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Countdowns for anniversaries, recurring dates, trips, and quiet evenings together.
              </p>
            </div>
          </Link>

          <Link
            href="/calls"
            className="group rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)] transition-all space-y-3"
          >
            <div className="h-9 w-9 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Phone className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-1">
              <div className="font-medium text-sm text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                Voice &amp; Video Room
              </div>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Quiet 1:1 audio/video check-ins with camera preview and call duration log.
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Visual Theme Personalisation Bar ────────────────────────────────── */}
      <section className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Palette className="h-5 w-5 text-[var(--primary)] shrink-0" />
          <div>
            <div className="text-sm font-medium text-[var(--foreground)]">
              Sanctuary Atmosphere Palette
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              Current: <strong className="capitalize">{palette.replace('-', ' ')}</strong> ({mode}). Psychologically warm &amp; soothing.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {SANCTUARY_PALETTES.map((pal) => (
            <button
              key={pal}
              type="button"
              onClick={() => setPalette(pal)}
              title={`Switch to ${pal.replace('-', ' ')} palette`}
              className={`h-7 px-2.5 rounded-full text-xs font-medium capitalize transition-all cursor-pointer border ${
                palette === pal
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'border-[var(--border)] bg-[var(--muted)]/50 text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {pal.replace('-', ' ')}
            </button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleMode}
            className="h-7 px-2.5 text-xs ml-1"
            aria-label="Toggle Light/Dark mode"
          >
            {mode === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link href="/settings/appearance">All Themes &rarr;</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
