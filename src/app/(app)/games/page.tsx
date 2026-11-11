'use client'

import * as React from 'react'
import Link from 'next/link'
import { Gamepad2, Sparkles, Clock, Users, ArrowRight, Play, Trophy } from 'lucide-react'
import { GAME_TEMPLATES } from '@/lib/games/data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function GamesHubPage() {
  const [activeTab, setActiveTab] = React.useState<string>('all')

  const filteredGames = activeTab === 'all'
    ? GAME_TEMPLATES
    : GAME_TEMPLATES.filter((g) => g.category === activeTab)

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-10">
      <header className="border-b border-[var(--border)] pb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-medium text-[var(--primary)]">
          <Gamepad2 className="h-3.5 w-3.5" />
          <span>Sanctuary Parlour</span>
        </div>
        <h1 className="font-[family-name:var(--ds-font-display)] text-3xl sm:text-4xl font-bold tracking-tight text-[var(--foreground)]">
          Games, Quizzes &amp; Play
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] max-w-xl">
          Lighthearted, intimate games designed for two. All answers are kept hidden until both of you submit.
        </p>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-4">
          {[
            { id: 'all', label: 'All Games' },
            { id: 'couple_trivia', label: 'Couple Trivia' },
            { id: 'would_you_rather', label: 'Would You Rather' },
            { id: 'compatibility', label: 'Compatibility' },
            { id: 'truth_or_dare', label: 'Truth or Dare' },
          ].map((tab) => (
            <button
              key={tab.id}
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

      {/* Game Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredGames.map((game) => (
          <div
            key={game.id}
            className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 flex flex-col justify-between space-y-6 hover:border-[var(--primary)] transition-all shadow-xs"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl" role="img" aria-hidden="true">
                  {game.icon}
                </span>
                <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {game.durationMinutes} min
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    2 players
                  </span>
                </div>
              </div>

              <h3 className="font-[family-name:var(--ds-font-display)] text-xl font-semibold text-[var(--foreground)]">
                {game.title}
              </h3>

              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                {game.description}
              </p>
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
              <Badge variant="outline" className="text-[11px]">
                {game.questionCount} Rounds
              </Badge>

              <Button size="sm" variant="primary" asChild>
                <Link href={`/games/${game.id}`}>
                  <Play className="h-3.5 w-3.5 mr-1" />
                  <span>Start Game</span>
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

