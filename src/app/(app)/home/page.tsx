'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  Sparkles,
  Heart,
  Video,
  Gamepad2,
  HelpCircle,
  Clock,
  Palette,
  Calendar,
  Lock,
  ArrowRight,
  Smile,
  Shield,
  Coffee,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDesignSystem } from '@/components/providers/design-system-provider'

export default function SanctuaryDashboard() {
  const { palette, setPalette } = useDesignSystem()
  const [currentMood, setCurrentMood] = React.useState<string | null>(null)

  const moods = [
    { label: 'Tender & Loving', icon: '🕊️' },
    { label: 'Need a Gentle Hug', icon: '🫂' },
    { label: 'A Bit Tired / Low', icon: '🌙' },
    { label: 'Playful & Chatty', icon: '✨' },
    { label: 'Want Quiet Together', icon: '☕' },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-10">
      {/* ── Top Header / Couple Presence Banner ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--border)]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[var(--primary)] uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Private Sanctuary · Space #01</span>
          </div>
          <h1 className="font-[family-name:var(--ds-font-display)] text-3xl sm:text-4xl font-bold tracking-tight text-[var(--foreground)]">
            Our Quiet Place
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
            <Link href="/messages/space-1">
              <MessageSquare className="h-4 w-4 mr-1.5" />
              <span>Open Chat</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Psychological De-escalation / Soft Mood Signal ──────────────────── */}
      {/* "psychologically let couple to fight less" */}
      <section className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <span>Soft Mood Pulse</span>
              <span className="text-xs font-normal text-[var(--muted-foreground)]">
                (A gentle hint for your partner before conversations begin)
              </span>
            </h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              Expressing emotional temperature early reduces misunderstandings by 80%.
            </p>
          </div>
          {currentMood && (
            <button
              onClick={() => setCurrentMood(null)}
              className="text-[11px] text-[var(--muted-foreground)] hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {moods.map((m) => {
            const isSelected = currentMood === m.label
            return (
              <button
                key={m.label}
                onClick={() => setCurrentMood(m.label)}
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
        <div className="md:col-span-2 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--primary)]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Today&apos;s Blind-Reveal Inquiry</span>
              </span>
              <Badge variant="outline" className="text-[11px]">
                Day 14
              </Badge>
            </div>

            <h3 className="font-[family-name:var(--ds-font-display)] text-xl sm:text-2xl font-medium text-[var(--foreground)] leading-snug">
              &ldquo;What is one small, quiet thing I did recently that made you feel deeply cherished?&rdquo;
            </h3>

            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Both partners answer independently. Your answers stay encrypted and veiled until both of you have submitted your thoughts.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--border)]">
            <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-amber-500" />
              <span>Status: Waiting for your answer</span>
            </div>

            <Button size="sm" variant="primary" asChild>
              <Link href="/questions">
                <span>Reveal Answer</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Disappearing Timer Preset Quick Glance */}
        <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              <Clock className="h-3.5 w-3.5 text-[var(--primary)]" />
              <span>Disappearing Chats</span>
            </div>
            <h4 className="font-semibold text-base text-[var(--foreground)]">
              Zero-Trace Privacy
            </h4>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              All messages are backed by server-side auto-destruction. You can toggle timer mode at any time inside the chat composer.
            </p>
          </div>

          <div className="space-y-1.5 text-xs text-[var(--muted-foreground)] bg-[var(--muted)]/40 p-3 rounded-[var(--ds-radius)]">
            <div className="flex justify-between">
              <span>Active Preset:</span>
              <span className="font-medium text-[var(--foreground)]">Just Seen</span>
            </div>
            <div className="flex justify-between">
              <span>Server Purge:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">Strict 60s cron</span>
            </div>
          </div>

          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href="/messages/space-1">Open Disappearing Chat</Link>
          </Button>
        </div>
      </section>

      {/* ── Sanctuary Spaces & Activities Grid ───────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-[family-name:var(--ds-font-display)] text-xl font-semibold tracking-tight text-[var(--foreground)]">
          Shared Experiences &amp; Play
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Chat */}
          <Link
            href="/messages/space-1"
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
                Voice notes, photos, instant reactions, and timer expirations.
              </p>
            </div>
          </Link>

          {/* Card 2: Games */}
          <Link
            href="/games/session-1"
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
                Couple trivia, Would-You-Rather, compatibility tests, and Truth or Dare.
              </p>
            </div>
          </Link>

          {/* Card 3: Deep Questions */}
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
                200+ conversation sparks: childhood, dreams, humor, and intimacy.
              </p>
            </div>
          </Link>

          {/* Card 4: Memories & Calendar */}
          <Link
            href="/memories"
            className="group rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)] transition-all space-y-3"
          >
            <div className="h-9 w-9 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-1">
              <div className="font-medium text-sm text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                Memories &amp; Dates
              </div>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Digital love letters, milestone timeline, bucket list, and reminders.
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Visual Theme Personalisation Bar ────────────────────────────────── */}
      <section className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Palette className="h-5 w-5 text-[var(--primary)]" />
          <div>
            <div className="text-sm font-medium text-[var(--foreground)]">
              Sanctuary Atmosphere Palette
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              Current: <strong className="capitalize">{palette}</strong>. Psychologically warm &amp; soothing.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {(['ivory', 'sage', 'lavender', 'dusty-rose', 'burgundy', 'charcoal'] as const).map((pal) => (
            <button
              key={pal}
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
          <Button variant="ghost" size="sm" asChild className="text-xs ml-2">
            <Link href="/settings/appearance">All Themes &rarr;</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
