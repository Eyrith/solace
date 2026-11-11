'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Sparkles,
  Lock,
  Eye,
  CheckCircle2,
  RefreshCw,
  Trophy,
  ArrowRight,
  Heart,
  Smile,
} from 'lucide-react'
import { GAME_TEMPLATES, type GameTemplate } from '@/lib/games/data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function GameSessionPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = (params.sessionId as string) || 'game-trivia-01'

  // Match template or fallback to first
  const game = GAME_TEMPLATES.find((g) => g.id === gameId) || GAME_TEMPLATES[0]

  const [currentIdx, setCurrentIdx] = React.useState(0)
  const [myAnswer, setMyAnswer] = React.useState('')
  const [hasSubmitted, setHasSubmitted] = React.useState(false)
  const [partnerAnswer, setPartnerAnswer] = React.useState<string | null>(null)
  const [revealed, setRevealed] = React.useState(false)
  const [score, setScore] = React.useState(0)

  const currentQ = game.questions[currentIdx]
  const isLastQuestion = currentIdx === game.questions.length - 1

  // Submit my answer
  const handleSubmitAnswer = () => {
    if (!myAnswer.trim()) return
    setHasSubmitted(true)

    // Simulate partner answering after 1.5 seconds
    setTimeout(() => {
      let simulatedPartnerResponse = ''
      if (currentQ.options && currentQ.options.length > 0) {
        simulatedPartnerResponse = currentQ.options[0]
      } else {
        simulatedPartnerResponse = 'That quiet café where it started raining while we held hands.'
      }

      setPartnerAnswer(simulatedPartnerResponse)
      setRevealed(true)
      setScore((prev) => prev + 10)
    }, 1600)
  }

  // Next Question
  const handleNext = () => {
    if (isLastQuestion) {
      // Completed
      setCurrentIdx((prev) => prev + 1)
      return
    }

    setCurrentIdx((prev) => prev + 1)
    setMyAnswer('')
    setHasSubmitted(false)
    setPartnerAnswer(null)
    setRevealed(false)
  }

  // If completed
  if (currentIdx >= game.questions.length) {
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
            You both completed all {game.questions.length} rounds of &ldquo;{game.title}&rdquo;.
          </p>
        </div>

        <div className="p-6 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] space-y-3">
          <div className="text-xs uppercase tracking-wider text-[var(--muted-foreground)] font-medium">
            Shared Resonance Score
          </div>
          <div className="text-4xl font-bold text-[var(--primary)] font-mono">
            {score} pts
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            Every shared answer strengthens emotional intimacy and mutual trust.
          </p>
        </div>

        <div className="flex justify-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/games">More Games</Link>
          </Button>
          <Button variant="primary" asChild>
            <Link href="/messages/space-1">Talk About It in Chat</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-8">
      {/* Top Bar */}
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
            Round {currentIdx + 1} of {game.questions.length}
          </Badge>
          <span className="text-xs text-[var(--muted-foreground)] font-mono">
            Score: {score}
          </span>
        </div>
      </div>

      {/* Question Card */}
      <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="space-y-2">
          <span className="text-xs uppercase tracking-wider text-[var(--primary)] font-semibold">
            {game.title}
          </span>
          <h2 className="font-[family-name:var(--ds-font-display)] text-2xl sm:text-3xl font-bold text-[var(--foreground)] leading-snug">
            {currentQ.prompt}
          </h2>
        </div>

        {/* Answer choices or text input */}
        {!hasSubmitted ? (
          <div className="space-y-4 pt-2">
            {currentQ.options ? (
              <div className="space-y-2">
                {currentQ.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => setMyAnswer(option)}
                    className={`w-full text-left p-4 rounded-[var(--ds-radius)] text-sm transition-all cursor-pointer border ${
                      myAnswer === option
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
                value={myAnswer}
                onChange={(e) => setMyAnswer(e.target.value)}
                placeholder="Type your honest answer here... (Partner cannot see until both submit)"
                rows={4}
                className="w-full rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-3.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] resize-none"
              />
            )}

            <Button
              onClick={handleSubmitAnswer}
              variant="primary"
              className="w-full"
              disabled={!myAnswer.trim()}
            >
              <span>Lock In My Answer</span>
              <Lock className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        ) : (
          /* Submission state & Blind Reveal */
          <div className="space-y-6 pt-2">
            {!revealed ? (
              <div className="rounded-[var(--ds-radius)] bg-[var(--muted)]/40 p-6 text-center space-y-3">
                <div className="animate-spin text-2xl inline-block">⏳</div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">
                    Answer Locked!
                  </h4>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Waiting for partner to finish typing... Answers will reveal together.
                  </p>
                </div>
              </div>
            ) : (
              /* Reveal Comparison Grid */
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Answers Revealed!</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* My Answer */}
                  <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-4 space-y-1.5">
                    <span className="text-[11px] font-semibold text-[var(--primary)] uppercase tracking-wider">
                      Your Answer
                    </span>
                    <p className="text-sm text-[var(--foreground)] leading-relaxed">
                      {myAnswer}
                    </p>
                  </div>

                  {/* Partner's Answer */}
                  <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-4 space-y-1.5">
                    <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                      Partner&apos;s Answer
                    </span>
                    <p className="text-sm text-[var(--foreground)] leading-relaxed">
                      {partnerAnswer}
                    </p>
                  </div>
                </div>

                <Button onClick={handleNext} variant="primary" className="w-full mt-4">
                  <span>{isLastQuestion ? 'View Final Results' : 'Next Question'}</span>
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
