'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Lock,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { GAME_TEMPLATES } from '@/lib/games/data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBanner } from '@/components/ui/status-banner'
import { createClient, isSupabaseClientConfigured } from '@/lib/supabase/client'
import { useSanctuary } from '@/components/providers/sanctuary-provider'
import {
  type LocalGameSession,
  advanceLocalGameRound,
  createLocalGameSession,
  getLocalGameSession,
  submitLocalGameAnswer,
  subscribeLocalSanctuary,
} from '@/lib/sanctuary/local-store'

interface DbQuestion {
  id: string
  category?: string
  content: string
  options?: string[] | null
  game_template_id?: string | null
}

interface GameSessionPayload {
  configured: boolean
  session: {
    id: string
    space_id: string
    game_type: string
    status: string
    question_ids: string[]
    current_q_idx: number
    scores?: Record<string, number>
  } | null
  questions?: DbQuestion[]
  currentQuestionId?: string | null
  myAnswer?: string | null
  hasPartnerAnswered?: boolean
  partnerAnswer?: string | null
  revealed?: boolean
}

const GAME_TYPE_TITLES: Record<string, string> = {
  couple_trivia: 'How Well Do You Know Me?',
  would_you_rather: 'Late Night Dilemmas',
  compatibility: 'Our Relationship Rhythm',
  truth_or_dare: 'Sweet Truth or Playful Dare',
  deep_questions: 'Deep Dialogue',
}

export default function GameSessionPage() {
  const params = useParams()
  const router = useRouter()
  const { activeSpaceId, currentUserId, configured, isLocalSandbox, demoActor, setDemoActor, loading: spaceLoading } =
    useSanctuary()
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : ''
  const previewTemplate = GAME_TEMPLATES.find((g) => g.id === sessionId) ?? null
  const targetSpaceId = activeSpaceId ?? 'space-1'

  // Live DB session state
  const [loading, setLoading] = React.useState(!previewTemplate && configured)
  const [sessionData, setSessionData] = React.useState<GameSessionPayload | null>(null)
  const [localSession, setLocalSession] = React.useState<LocalGameSession | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [advancing, setAdvancing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Local input + preview-only state (for unconfigured template previews)
  const [previewIdx, setPreviewIdx] = React.useState(0)
  const [previewLockedAnswer, setPreviewLockedAnswer] = React.useState<string | null>(null)
  const currentQIdx = localSession
    ? localSession.currentQuestionIndex
    : sessionData?.session?.current_q_idx ?? 0
  const activeRoundKey = previewTemplate
    ? `preview-${previewIdx}`
    : `round-${currentQIdx}-${demoActor}`
  const [draftByRound, setDraftByRound] = React.useState<{ key: string; text: string }>({
    key: activeRoundKey,
    text: '',
  })
  const myAnswerInput = draftByRound.key === activeRoundKey ? draftByRound.text : ''
  const setMyAnswerInput = (text: string) =>
    setDraftByRound({ key: activeRoundKey, text })

  const loadLocalSession = React.useCallback(() => {
    const found = getLocalGameSession(targetSpaceId, sessionId)
    setLocalSession(found)
    setLoading(false)
  }, [targetSpaceId, sessionId])

  const loadSession = React.useCallback(async () => {
    if (!sessionId || previewTemplate) return
    if (!configured) {
      loadLocalSession()
      return
    }
    try {
      const res = await fetch(`/api/games/sessions/${encodeURIComponent(sessionId)}`, {
        cache: 'no-store',
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        setError(payload?.detail || payload?.error || 'Unable to load game session.')
        return
      }
      setSessionData(payload as GameSessionPayload)
      setError(null)
    } catch {
      setError('Unable to reach server for game session.')
    } finally {
      setLoading(false)
    }
  }, [sessionId, previewTemplate, configured, loadLocalSession])

  React.useEffect(() => {
    if (!sessionId || previewTemplate || spaceLoading) return
    if (!configured) {
      Promise.resolve().then(loadLocalSession)
      return subscribeLocalSanctuary(loadLocalSession)
    }

    let active = true
    fetch(`/api/games/sessions/${encodeURIComponent(sessionId)}`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        const payload = await res.json().catch(() => null)
        if (!active) return
        if (!res.ok) {
          setError(payload?.detail || payload?.error || 'Unable to load game session.')
          return
        }
        setSessionData(payload as GameSessionPayload)
        setError(null)
      })
      .catch(() => {
        if (active) setError('Unable to reach server for game session.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [sessionId, previewTemplate, spaceLoading, configured, loadLocalSession])

  React.useEffect(() => {
    if (previewTemplate || !configured || !isSupabaseClientConfigured() || !sessionId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`game-session:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
        () => {
          void loadSession()
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_answers',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          void loadSession()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [previewTemplate, configured, sessionId, loadSession])

  // Interactive 2-Player Local Sandbox Session
  if (!configured && localSession) {
    const template =
      GAME_TEMPLATES.find((t) => t.id === localSession.templateId) ?? GAME_TEMPLATES[0]
    const questions = template.questions
    const roundIdx = Math.min(localSession.currentQuestionIndex, Math.max(0, questions.length - 1))
    const currentQ = questions[roundIdx]
    const roundAnswers = localSession.answersByQuestion[currentQ.id] ?? {}
    const myKey: 'self' | 'partner' = demoActor
    const otherKey: 'self' | 'partner' = demoActor === 'self' ? 'partner' : 'self'
    const myAnswer = roundAnswers[myKey] ?? null
    const otherAnswer = roundAnswers[otherKey] ?? null
    const revealed = Boolean(myAnswer && otherAnswer)
    const isLastQuestion = roundIdx >= questions.length - 1

    const matchedRounds = questions.filter((q) => {
      const a = localSession.answersByQuestion[q.id]
      if (!a?.self || !a?.partner) return false
      return q.type === 'choice'
        ? a.self === a.partner
        : Boolean(a.self.trim() && a.partner.trim())
    }).length

    const localScore = matchedRounds * 25
    const chatHref = `/messages/${targetSpaceId}`

    if (localSession.status === 'completed' && revealed && isLastQuestion) {
      return (
        <div className="mx-auto max-w-xl px-4 py-12 text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-3xl">
            🎉
          </div>
          <div className="space-y-2">
            <h1 className="font-[family-name:var(--ds-font-display)] text-3xl font-bold tracking-tight text-[var(--foreground)]">
              Game Completed!
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Both perspectives answered all {questions.length} rounds of &ldquo;{localSession.title}&rdquo;.
            </p>
          </div>

          <div className="p-6 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] space-y-3">
            <div className="text-xs uppercase tracking-wider text-[var(--muted-foreground)] font-medium">
              Synchronized Resonance Score
            </div>
            <div className="text-4xl font-bold text-[var(--primary)] font-mono">
              {localScore} pts
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              {matchedRounds} of {questions.length} rounds aligned
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/games">More Games</Link>
            </Button>
            <Button variant="primary" asChild>
              <Link
                href={`${chatHref}?prompt=${encodeURIComponent(
                  `Just finished "${localSession.title}" (${localScore} pts)! Which round surprised you most?`,
                )}`}
              >
                Talk About It in Chat
              </Link>
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <Link
            href="/games"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Games</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDemoActor(demoActor === 'self' ? 'partner' : 'self')}
              className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-medium text-[var(--foreground)] hover:border-[var(--primary)] cursor-pointer"
            >
              Playing as: {demoActor === 'self' ? 'You' : 'Partner'} (Switch)
            </button>
            <Badge variant="outline" className="text-xs">
              Round {roundIdx + 1} of {questions.length}
            </Badge>
            <span className="text-xs text-[var(--muted-foreground)] font-mono">
              {localScore} pts
            </span>
          </div>
        </div>

        <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-[var(--primary)] font-semibold">
              {localSession.title}
            </span>
            <h2 className="font-[family-name:var(--ds-font-display)] text-2xl sm:text-3xl font-bold text-[var(--foreground)] leading-snug">
              {currentQ.prompt}
            </h2>
          </div>

          {!myAnswer ? (
            <div className="space-y-4">
              {currentQ.options ? (
                <div className="space-y-2">
                  {currentQ.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setMyAnswerInput(option)}
                      className={`w-full text-left p-4 rounded-[var(--ds-radius)] text-sm transition-all cursor-pointer border ${
                        myAnswerInput === option
                          ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)] font-medium ring-1 ring-[var(--primary)]'
                          : 'border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={myAnswerInput}
                  onChange={(e) => setMyAnswerInput(e.target.value)}
                  placeholder="Write your candid answer... (Partner cannot read it until they answer too)"
                  rows={4}
                  className="w-full rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-3.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] resize-none"
                />
              )}

              <Button
                onClick={() => {
                  const next = submitLocalGameAnswer(
                    targetSpaceId,
                    localSession.id,
                    currentQ.id,
                    myAnswerInput,
                    demoActor,
                  )
                  setLocalSession(next)
                  setMyAnswerInput('')
                }}
                variant="primary"
                className="w-full"
                disabled={!myAnswerInput.trim()}
              >
                <span>Lock In Answer ({demoActor === 'self' ? 'You' : 'Partner'})</span>
                <Lock className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          ) : !revealed ? (
            <div className="rounded-[var(--ds-radius)] bg-[var(--muted)]/40 p-6 text-center space-y-3">
              <Clock className="h-7 w-7 mx-auto text-[var(--primary)]" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-[var(--foreground)]">
                  Answer Sealed!
                </h4>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {demoActor === 'self'
                    ? 'Waiting for Partner to answer this round before revealing side-by-side.'
                    : 'Waiting for You to answer this round before revealing side-by-side.'}
                </p>
              </div>
              {isLocalSandbox && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDemoActor(demoActor === 'self' ? 'partner' : 'self')}
                >
                  Switch to {demoActor === 'self' ? 'Partner' : 'You'} &amp; Answer Round
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4" />
                <span>Answers Revealed!</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-4 space-y-1.5">
                  <span className="text-[11px] font-semibold text-[var(--primary)] uppercase tracking-wider">
                    {demoActor === 'self' ? 'Your Answer' : 'Partner View'}
                  </span>
                  <p className="text-sm text-[var(--foreground)] leading-relaxed">{myAnswer}</p>
                </div>

                <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-4 space-y-1.5">
                  <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    {demoActor === 'self' ? "Partner's Answer" : "You"}
                  </span>
                  <p className="text-sm text-[var(--foreground)] leading-relaxed">{otherAnswer}</p>
                </div>
              </div>

              {!isLastQuestion && (
                <Button
                  onClick={() => {
                    const next = advanceLocalGameRound(
                      targetSpaceId,
                      localSession.id,
                      roundIdx + 1,
                    )
                    setLocalSession(next)
                  }}
                  variant="primary"
                  className="w-full"
                >
                  <span>Next Question</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Template preview branch (direct bookmark to template ID)
  if (previewTemplate) {
    const questions = previewTemplate.questions
    const currentQ = questions[previewIdx]
    const isComplete = previewIdx >= questions.length

    if (isComplete) {
      return (
        <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-3xl">
            ✨
          </div>
          <div className="space-y-2">
            <h1 className="font-[family-name:var(--ds-font-display)] text-3xl font-bold tracking-tight text-[var(--foreground)]">
              Template Preview Complete
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Connect Supabase in .env.local to invite your partner and unlock synchronized two-player reveals for &ldquo;{previewTemplate.title}&rdquo;.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/games">More Games</Link>
            </Button>
            <Button variant="primary" asChild>
              <Link href={activeSpaceId ? `/messages/${activeSpaceId}` : '/home'}>
                Back to Sanctuary
              </Link>
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <Link
            href="/games"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Exit Preview</span>
          </Link>
          <Badge variant="outline" className="text-xs">
            Preview Round {previewIdx + 1} of {questions.length}
          </Badge>
        </div>

        <div className="rounded-[var(--ds-radius)] border border-[var(--primary)]/30 bg-[var(--card)] p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5 text-xs">
            <div className="font-semibold text-[var(--foreground)]">Want full two-player Blind Reveal?</div>
            <div className="text-[var(--muted-foreground)]">Launch a persistent sandbox session saved in your browser.</div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const created = createLocalGameSession(targetSpaceId, previewTemplate.id)
              router.push(`/games/${created.id}`)
            }}
          >
            Start 2-Player Sandbox Session
          </Button>
        </div>

        <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-[var(--primary)] font-semibold">
              {previewTemplate.title}
            </span>
            <h2 className="font-[family-name:var(--ds-font-display)] text-2xl sm:text-3xl font-bold text-[var(--foreground)] leading-snug">
              {currentQ.prompt}
            </h2>
          </div>

          {!previewLockedAnswer ? (
            <div className="space-y-4">
              {currentQ.options ? (
                <div className="space-y-2">
                  {currentQ.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setMyAnswerInput(option)}
                      className={`w-full text-left p-4 rounded-[var(--ds-radius)] text-sm transition-all cursor-pointer border ${
                        myAnswerInput === option
                          ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)] font-medium ring-1 ring-[var(--primary)]'
                          : 'border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={myAnswerInput}
                  onChange={(e) => setMyAnswerInput(e.target.value)}
                  placeholder="Try drafting your answer for this prompt..."
                  rows={4}
                  className="w-full rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-3.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] resize-none"
                />
              )}

              <Button
                onClick={() => setPreviewLockedAnswer(myAnswerInput)}
                variant="primary"
                className="w-full"
                disabled={!myAnswerInput.trim()}
              >
                <span>Preview Lock Answer</span>
                <Lock className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-4 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--primary)]">
                  Your Drafted Answer
                </span>
                <p className="text-sm text-[var(--foreground)]">{previewLockedAnswer}</p>
              </div>
              <Button
                onClick={() => {
                  setPreviewIdx((i) => i + 1)
                  setPreviewLockedAnswer(null)
                  setMyAnswerInput('')
                }}
                variant="primary"
                className="w-full"
              >
                <span>Next Preview Round</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-[var(--muted-foreground)]">
        Loading game session...
      </div>
    )
  }

  const session = sessionData?.session
  const questions = sessionData?.questions ?? []
  const currentQuestion =
    questions.find((q) => q.id === sessionData?.currentQuestionId) ?? questions[currentQIdx]
  const totalRounds = Math.max(questions.length, session?.question_ids?.length ?? 0)
  const isCompleted = session?.status === 'complete' || !currentQuestion
  const isLastQuestion = currentQIdx >= totalRounds - 1
  const myScore = currentUserId && session?.scores ? session.scores[currentUserId] ?? 0 : 0
  const gameTitle = session ? GAME_TYPE_TITLES[session.game_type] ?? 'Sanctuary Game' : 'Game'
  const chatHref = `/messages/${session?.space_id ?? activeSpaceId ?? 'space-1'}`

  const handleSubmitDbAnswer = async () => {
    if (!myAnswerInput.trim() || !currentQuestion?.id) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/games/sessions/${encodeURIComponent(sessionId)}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          answer: myAnswerInput.trim(),
        }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        setError(payload?.detail || payload?.error || 'Could not submit answer.')
        return
      }
      setSessionData(payload as GameSessionPayload)
    } catch {
      setError('Unable to submit answer right now.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdvanceRound = async () => {
    setAdvancing(true)
    setError(null)
    try {
      const res = await fetch(`/api/games/sessions/${encodeURIComponent(sessionId)}/advance`, {
        method: 'POST',
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        setError(payload?.detail || payload?.error || 'Could not advance round.')
        return
      }
      setSessionData(payload as GameSessionPayload)
    } catch {
      setError('Unable to advance to next round.')
    } finally {
      setAdvancing(false)
    }
  }

  if (error && !session) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 space-y-4">
        <StatusBanner tone="error" title="Session Unavailable" description={error} />
        <Button variant="outline" asChild>
          <Link href="/games">Back to Games Hub</Link>
        </Button>
      </div>
    )
  }

  if (isCompleted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-6">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-3xl">
          🎉
        </div>
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--ds-font-display)] text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Game Completed!
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            You completed all {totalRounds} rounds of &ldquo;{gameTitle}&rdquo;.
          </p>
        </div>

        <div className="p-6 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] space-y-3">
          <div className="text-xs uppercase tracking-wider text-[var(--muted-foreground)] font-medium">
            Your Completed Rounds Score
          </div>
          <div className="text-4xl font-bold text-[var(--primary)] font-mono">
            {myScore} pts
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/games">More Games</Link>
          </Button>
          <Button variant="primary" asChild>
            <Link href={chatHref}>Talk About It in Chat</Link>
          </Button>
        </div>
      </div>
    )
  }

  const hasSubmitted = Boolean(sessionData?.myAnswer)
  const revealed = Boolean(sessionData?.revealed)

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-8">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <Link
          href="/games"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Exit Game</span>
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Round {currentQIdx + 1} of {totalRounds}
          </Badge>
          <span className="text-xs text-[var(--muted-foreground)] font-mono">
            Score: {myScore}
          </span>
        </div>
      </div>

      {error && (
        <StatusBanner tone="error" title="Update Error" description={error} />
      )}

      <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="space-y-2">
          <span className="text-xs uppercase tracking-wider text-[var(--primary)] font-semibold">
            {gameTitle}
          </span>
          <h2 className="font-[family-name:var(--ds-font-display)] text-2xl sm:text-3xl font-bold text-[var(--foreground)] leading-snug">
            {currentQuestion.content}
          </h2>
        </div>

        {!hasSubmitted ? (
          <div className="space-y-4 pt-2">
            {Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 ? (
              <div className="space-y-2">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMyAnswerInput(option)}
                    className={`w-full text-left p-4 rounded-[var(--ds-radius)] text-sm transition-all cursor-pointer border ${
                      myAnswerInput === option
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)] font-medium ring-1 ring-[var(--primary)]'
                        : 'border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                value={myAnswerInput}
                onChange={(e) => setMyAnswerInput(e.target.value)}
                placeholder="Type your honest answer here... (Partner cannot see until both submit)"
                rows={4}
                className="w-full rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-3.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] resize-none"
              />
            )}

            <Button
              onClick={() => void handleSubmitDbAnswer()}
              variant="primary"
              className="w-full"
              disabled={!myAnswerInput.trim()}
              isLoading={submitting}
            >
              <span>Lock In My Answer</span>
              <Lock className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {!revealed ? (
              <div className="rounded-[var(--ds-radius)] bg-[var(--muted)]/40 p-6 text-center space-y-3">
                <Clock className="h-7 w-7 mx-auto text-[var(--primary)]" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">
                    Answer Locked!
                  </h4>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Waiting for your partner to submit their response in this session. Both answers will reveal together automatically via Supabase Realtime.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void loadSession()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  <span>Check Reveal Status</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Answers Revealed!</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-4 space-y-1.5">
                    <span className="text-[11px] font-semibold text-[var(--primary)] uppercase tracking-wider">
                      Your Answer
                    </span>
                    <p className="text-sm text-[var(--foreground)] leading-relaxed">
                      {sessionData?.myAnswer}
                    </p>
                  </div>

                  <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-4 space-y-1.5">
                    <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                      Partner&apos;s Answer
                    </span>
                    <p className="text-sm text-[var(--foreground)] leading-relaxed">
                      {sessionData?.partnerAnswer}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => void handleAdvanceRound()}
                  variant="primary"
                  className="w-full mt-4"
                  isLoading={advancing}
                >
                  <span>{isLastQuestion ? 'Complete Game & See Score' : 'Next Question'}</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
