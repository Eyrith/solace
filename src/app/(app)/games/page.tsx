'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Gamepad2, Clock, Users, Play, Trophy, ArrowRight } from 'lucide-react'
import { GAME_TEMPLATES } from '@/lib/games/data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBanner } from '@/components/ui/status-banner'
import { useSanctuary } from '@/components/providers/sanctuary-provider'
import {
  createLocalGameSession,
  listLocalGames,
  subscribeLocalSanctuary,
} from '@/lib/sanctuary/local-store'

interface GameSessionSummary {
  id: string
  space_id: string
  game_type: string
  status: string
  question_ids: string[]
  current_q_idx: number
  created_at?: string | null
}

const GAME_TYPE_LABELS: Record<string, string> = {
  couple_trivia: 'Couple Trivia',
  would_you_rather: 'Late Night Dilemmas',
  guess_partner: "Who's More Likely",
  compatibility: 'Compatibility Check',
  truth_or_dare: 'Truth or Dare',
  deep_questions: 'Deep Questions',
  co_op: 'Split-Control Co-Op',
}

export default function GamesHubPage() {
  const router = useRouter()
  const { activeSpaceId, configured, loading } = useSanctuary()
  const [activeTab, setActiveTab] = React.useState<string>('all')
  const [sessionsRecord, setSessionsRecord] = React.useState<{
    spaceId: string
    items: GameSessionSummary[]
  }>({ spaceId: '', items: [] })
  const [startingTemplateId, setStartingTemplateId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const targetSpaceId = activeSpaceId ?? (!loading && !configured ? 'space-1' : null)

  const sessions =
    targetSpaceId && sessionsRecord.spaceId === targetSpaceId
      ? sessionsRecord.items
      : []

  const loadLocalSessions = React.useCallback((spaceId: string) => {
    const localItems = listLocalGames(spaceId)
    const mapped: GameSessionSummary[] = localItems.map((g) => {
      const tpl = GAME_TEMPLATES.find((t) => t.id === g.templateId)
      return {
        id: g.id,
        space_id: g.spaceId,
        game_type: g.category,
        status: g.status,
        question_ids: tpl ? tpl.questions.map((q) => q.id) : [],
        current_q_idx: g.currentQuestionIndex,
        created_at: g.createdAt,
      }
    })
    setSessionsRecord({ spaceId, items: mapped })
  }, [])

  React.useEffect(() => {
    if (!targetSpaceId) return

    if (!configured && !loading) {
      Promise.resolve().then(() => loadLocalSessions(targetSpaceId))
      return subscribeLocalSanctuary(() => loadLocalSessions(targetSpaceId))
    }

    if (!configured) return

    let active = true
    fetch(`/api/games/sessions?spaceId=${encodeURIComponent(targetSpaceId)}`, {
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (active && Array.isArray(payload?.sessions)) {
          setSessionsRecord({
            spaceId: targetSpaceId,
            items: payload.sessions as GameSessionSummary[],
          })
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [configured, loading, targetSpaceId, loadLocalSessions])

  const filteredGames =
    activeTab === 'all'
      ? GAME_TEMPLATES
      : GAME_TEMPLATES.filter((g) => g.category === activeTab)

  const handleStartGame = async (templateId: string) => {
    setError(null)
    if (templateId === 'game-coop-river-01') {
      router.push('/games/co-op')
      return
    }
    if (!configured) {
      const sid = targetSpaceId ?? 'space-1'
      const created = createLocalGameSession(sid, templateId)
      router.push(`/games/${created.id}`)
      return
    }
    if (!activeSpaceId) {
      router.push(`/games/${templateId}`)
      return
    }
    setStartingTemplateId(templateId)
    try {
      const res = await fetch('/api/games/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId: activeSpaceId, templateId }),
      })
      const payload = await res.json()
      if (!res.ok) {
        setError(payload?.detail || payload?.error || 'Could not start game session.')
        return
      }
      const sid = payload?.session?.id || templateId
      router.push(`/games/${sid}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to start game.')
    } finally {
      setStartingTemplateId(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-10">
      <header className="border-b border-[var(--border)] pb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-[var(--primary)]">
          <Gamepad2 className="h-3.5 w-3.5" />
          <span>Bedtime Parlour · Kulfi Games for Two</span>
        </div>
        <h1 className="font-[family-name:var(--ds-font-display)] text-3xl sm:text-4xl font-bold tracking-tight text-[var(--foreground)]">
          Games, Quizzes &amp; Play
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] max-w-xl">
          Late-night games designed for two phones. Split controls, simultaneous voting, and secret answers revealed together while on your call.
        </p>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-4">
          {[
            { id: 'all', label: 'All Games' },
            { id: 'co_op', label: 'Split-Control Co-Op' },
            { id: 'guess_partner', label: "Who's More Likely" },
            { id: 'would_you_rather', label: 'Late Night Dilemmas' },
            { id: 'couple_trivia', label: 'Couple Trivia' },
            { id: 'compatibility', label: 'Compatibility' },
            { id: 'truth_or_dare', label: 'Truth or Dare' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-xs rounded-full transition-colors cursor-pointer border ${
                activeTab === tab.id
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] font-medium'
                  : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <StatusBanner tone="error" title="Game Session Issue" description={error} />
      )}

      {configured && !activeSpaceId && (
        <StatusBanner
          tone="info"
          title="No Private Space Selected"
          description="Connect with a partner on Sanctuary Home first to play live blind-reveal games together."
        />
      )}

      {/* Active & Recent Live Sessions */}
      {sessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--ds-font-display)] text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[var(--primary)]" />
            <span>Your Sanctuary Sessions</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.slice(0, 6).map((s) => (
              <Link
                key={s.id}
                href={`/games/${s.id}`}
                className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-4 flex items-center justify-between hover:border-[var(--primary)] transition-colors"
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium text-[var(--foreground)]">
                    {GAME_TYPE_LABELS[s.game_type] ?? s.game_type}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    Round {Math.min((s.current_q_idx || 0) + 1, Math.max(s.question_ids?.length || 1, 1))} of{' '}
                    {s.question_ids?.length || 1} ·{' '}
                    <span className="capitalize">{s.status}</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--primary)] shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Kulfi Split-Control Game Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-[#e07a5f]/30 bg-gradient-to-br from-[#111219] via-[#1a1d2e] to-[#251f28] p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#e07a5f]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e07a5f]/20 text-[#f28e6f] border border-[#e07a5f]/30 text-xs font-bold uppercase tracking-wider">
              <span>🛶 Featured Kulfi Co-Op Mechanic</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--ds-font-display)] text-white">
              Two-Boat River · Split-Control Sanctuary
            </h2>
            <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
              Steer the rudder while your partner sets the paddle speed. Navigate a midnight star-lit river together in real time on your phone while on your call!
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <Button
              size="lg"
              variant="primary"
              asChild
              className="bg-[#e07a5f] hover:bg-[#d0694e] text-white font-semibold rounded-full px-6 py-3 shadow-lg"
            >
              <Link href="/games/co-op">
                <Play className="h-4 w-4 mr-2" />
                <span>Launch River Journey</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Game Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredGames.map((game) => (
          <div
            key={game.id}
            className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 flex flex-col justify-between space-y-6 hover:border-[var(--primary)] transition-all shadow-sm hover:shadow-md"
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-2xl shadow-xs" role="img" aria-hidden="true">
                  {game.icon}
                </span>
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {game.durationMinutes} min
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    2 phones
                  </span>
                </div>
              </div>

              <h3 className="font-[family-name:var(--ds-font-display)] text-xl sm:text-2xl font-bold text-[var(--foreground)]">
                {game.title}
              </h3>

              <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
                {game.description}
              </p>
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
              <Badge variant="outline" className="text-[11px] rounded-full px-3 py-1 font-semibold border-[var(--primary)]/30 text-[var(--primary)] bg-[var(--primary)]/10">
                {game.questionCount} Rounds
              </Badge>

              <Button
                size="sm"
                variant="primary"
                className="rounded-full px-5 py-2 font-semibold bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white shadow-xs"
                isLoading={startingTemplateId === game.id}
                onClick={() => void handleStartGame(game.id)}
              >
                <Play className="h-3.5 w-3.5 mr-1.5" />
                <span>{configured ? 'Start Live Match' : 'Play 2-Phone Session'}</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
