'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  HelpCircle,
  Sparkles,
  Shuffle,
  Bookmark,
  Check,
  Send,
  MessageSquare,
  Lock,
  Heart,
  Smile,
  Layers,
} from 'lucide-react'
import { QUESTION_LIBRARY, type QuestionItem } from '@/lib/questions/data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const CATEGORY_TABS = [
  { id: 'all', label: 'All Inquiries' },
  { id: 'romantic', label: 'Romantic' },
  { id: 'personal', label: 'Personal & Deep' },
  { id: 'funny', label: 'Playful & Funny' },
  { id: 'intimacy', label: 'Intimacy' },
  { id: 'childhood', label: 'Childhood' },
  { id: 'hypothetical', label: 'Hypothetical' },
  { id: 'future', label: 'Future' },
  { id: 'intellectual', label: 'Intellectual' },
]

export default function QuestionsLibraryPage() {
  const [selectedCat, setSelectedCat] = React.useState('all')
  const [savedIds, setSavedIds] = React.useState<string[]>([])
  const [randomQ, setRandomQ] = React.useState<QuestionItem>(QUESTION_LIBRARY[4])
  const [isShuffling, setIsShuffling] = React.useState(false)

  // Daily question is fixed by day
  const dailyQuestion = QUESTION_LIBRARY[0]

  const filtered = selectedCat === 'all'
    ? QUESTION_LIBRARY
    : QUESTION_LIBRARY.filter((q) => q.category === selectedCat)

  const toggleSave = (id: string) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleShuffle = () => {
    setIsShuffling(true)
    setTimeout(() => {
      const idx = Math.floor(Math.random() * QUESTION_LIBRARY.length)
      setRandomQ(QUESTION_LIBRARY[idx])
      setIsShuffling(false)
    }, 250)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-10">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="border-b border-[var(--border)] pb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-medium text-[var(--primary)]">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Intimate Dialogue Generator</span>
        </div>
        <h1 className="font-[family-name:var(--ds-font-display)] text-3xl sm:text-4xl font-bold tracking-tight text-[var(--foreground)]">
          Deep &amp; Playful Question Library
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] max-w-xl">
          Carefully crafted conversation prompts to spark laughter, tender memories, and profound mutual understanding.
        </p>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-4">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCat(tab.id)}
              className={`px-3 py-1 text-xs rounded-full transition-colors cursor-pointer border ${
                selectedCat === tab.id
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] font-medium'
                  : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Random Card Drawer / Highlight ──────────────────────────────────── */}
      <section className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
            <Shuffle className="h-3.5 w-3.5" />
            <span>Random Inquiry Generator</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleShuffle}
            disabled={isShuffling}
            className="text-xs"
          >
            <Shuffle className={`h-3.5 w-3.5 mr-1.5 ${isShuffling ? 'animate-spin' : ''}`} />
            <span>Draw Another Card</span>
          </Button>
        </div>

        <div className="space-y-2 py-2">
          <Badge variant="outline" className="text-[11px] capitalize">
            {randomQ.category}
          </Badge>
          <blockquote className="font-[family-name:var(--ds-font-display)] text-2xl sm:text-3xl font-medium text-[var(--foreground)] leading-snug">
            &ldquo;{randomQ.prompt}&rdquo;
          </blockquote>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSave(randomQ.id)}
            className="text-xs"
          >
            {savedIds.includes(randomQ.id) ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1 text-[var(--primary)]" />
                <span>Saved to Favourites</span>
              </>
            ) : (
              <>
                <Bookmark className="h-3.5 w-3.5 mr-1" />
                <span>Save Question</span>
              </>
            )}
          </Button>

          <Button variant="primary" size="sm" asChild>
            <Link href="/messages/space-1">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              <span>Send into Chat</span>
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Browsable Question Grid ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <span>{filtered.length} inquiries in this category</span>
          {savedIds.length > 0 && (
            <span>{savedIds.length} saved favourites</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const isSaved = savedIds.includes(item.id)
            return (
              <div
                key={item.id}
                className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 flex flex-col justify-between space-y-4 hover:border-[var(--primary)]/60 transition-all"
              >
                <div className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] font-medium capitalize">
                    {item.category}
                  </span>
                  <p className="font-[family-name:var(--ds-font-display)] text-lg font-medium text-[var(--foreground)] leading-snug">
                    {item.prompt}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]/70 text-xs">
                  <button
                    onClick={() => toggleSave(item.id)}
                    className="inline-flex items-center gap-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                  >
                    {isSaved ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[var(--primary)]" />
                        <span className="text-[var(--primary)] font-medium">Saved</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-3.5 w-3.5" />
                        <span>Save</span>
                      </>
                    )}
                  </button>

                  <Link
                    href="/messages/space-1"
                    className="text-[var(--primary)] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Discuss in chat &rarr;</span>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
