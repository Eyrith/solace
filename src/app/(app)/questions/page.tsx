'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  HelpCircle,
  Sparkles,
  Shuffle,
  Bookmark,
  Check,
  MessageSquare,
  Lock,
  Plus,
  CheckCircle2,
} from 'lucide-react'
import { QUESTION_LIBRARY } from '@/lib/questions/data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { StatusBanner } from '@/components/ui/status-banner'
import { createClient, isSupabaseClientConfigured } from '@/lib/supabase/client'
import { useSanctuary } from '@/components/providers/sanctuary-provider'
import {
  addLocalCustomQuestion,
  answerLocalDailyInquiry,
  getLocalDailyInquiry,
  listLocalCustomQuestions,
  listSavedQuestionIds,
  subscribeLocalSanctuary,
  toggleSavedQuestion,
} from '@/lib/sanctuary/local-store'

interface DisplayQuestion {
  id: string
  category: string
  prompt: string
  isCustom?: boolean
}

interface DailyInquiry {
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

const CATEGORY_TABS = [
  { id: 'all', label: 'All Inquiries' },
  { id: 'saved', label: 'Saved Favorites' },
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
  const { activeSpaceId, configured, isLocalSandbox, loading, demoActor, setDemoActor } = useSanctuary()
  const [selectedCat, setSelectedCat] = React.useState('all')
  const [questions, setQuestions] = React.useState<DisplayQuestion[]>(QUESTION_LIBRARY)
  const [savedIds, setSavedIds] = React.useState<string[]>([])
  const [randomQ, setRandomQ] = React.useState<DisplayQuestion>(QUESTION_LIBRARY[4])
  const [isShuffling, setIsShuffling] = React.useState(false)

  // Daily Blind-Reveal state
  const [daily, setDaily] = React.useState<DailyInquiry | null>(null)
  const [dailyDraft, setDailyDraft] = React.useState('')
  const [submittingDaily, setSubmittingDaily] = React.useState(false)

  // Custom question creator state
  const [showCustomForm, setShowCustomForm] = React.useState(false)
  const [customCategory, setCustomCategory] = React.useState('romantic')
  const [customPrompt, setCustomPrompt] = React.useState('')
  const [creatingCustom, setCreatingCustom] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const targetSpaceId = activeSpaceId ?? (!loading && !configured ? 'space-1' : null)
  const chatBaseHref = targetSpaceId ? `/messages/${targetSpaceId}` : '/home'

  const loadLocalQuestionsData = React.useCallback((spaceId: string) => {
    const customs: DisplayQuestion[] = listLocalCustomQuestions(spaceId).map((c) => ({
      id: c.id,
      category: c.category,
      prompt: c.prompt,
      isCustom: true,
    }))
    setQuestions([...customs, ...QUESTION_LIBRARY])
    setSavedIds(listSavedQuestionIds())
    setDaily(getLocalDailyInquiry(spaceId))
  }, [])

  const loadQuestions = React.useCallback(async () => {
    if (!configured) {
      setQuestions(QUESTION_LIBRARY)
      return
    }
    try {
      const qs = activeSpaceId ? `?spaceId=${encodeURIComponent(activeSpaceId)}` : ''
      const res = await fetch(`/api/questions${qs}`, { cache: 'no-store' })
      if (!res.ok) return
      const payload = await res.json()
      if (Array.isArray(payload.questions) && payload.questions.length > 0) {
        const mapped: DisplayQuestion[] = payload.questions.map(
          (row: { id: string; category: string; content: string; is_custom?: boolean }) => ({
            id: row.id,
            category: row.category,
            prompt: row.content,
            isCustom: Boolean(row.is_custom),
          }),
        )
        setQuestions(mapped)
        setRandomQ((prev) => mapped.find((m) => m.id === prev.id) ?? mapped[0])
      }
      if (Array.isArray(payload.savedIds)) {
        setSavedIds(payload.savedIds as string[])
      }
    } catch {}
  }, [configured, activeSpaceId])

  const loadDaily = React.useCallback(async () => {
    if (!configured || !activeSpaceId) {
      setDaily(null)
      return
    }
    try {
      const res = await fetch(`/api/questions/daily?spaceId=${encodeURIComponent(activeSpaceId)}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const payload = await res.json()
      if (payload?.daily) {
        setDaily(payload.daily as DailyInquiry)
      }
    } catch {}
  }, [configured, activeSpaceId])

  React.useEffect(() => {
    let active = true
    if (!configured) {
      if (targetSpaceId) {
        Promise.resolve().then(() => {
          if (active) loadLocalQuestionsData(targetSpaceId)
        })
        return subscribeLocalSanctuary(() => loadLocalQuestionsData(targetSpaceId))
      }
      return () => {
        active = false
      }
    }

    const qs = activeSpaceId ? `?spaceId=${encodeURIComponent(activeSpaceId)}` : ''
    fetch(`/api/questions${qs}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active || !payload) return
        if (Array.isArray(payload.questions) && payload.questions.length > 0) {
          const mapped: DisplayQuestion[] = payload.questions.map(
            (row: { id: string; category: string; content: string; is_custom?: boolean }) => ({
              id: row.id,
              category: row.category,
              prompt: row.content,
              isCustom: Boolean(row.is_custom),
            }),
          )
          setQuestions(mapped)
          setRandomQ((prev) => mapped.find((m) => m.id === prev.id) ?? mapped[0])
        }
        if (Array.isArray(payload.savedIds)) {
          setSavedIds(payload.savedIds as string[])
        }
      })
      .catch(() => {})

    if (activeSpaceId) {
      fetch(`/api/questions/daily?spaceId=${encodeURIComponent(activeSpaceId)}`, {
        cache: 'no-store',
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => {
          if (active && payload?.daily) {
            setDaily(payload.daily as DailyInquiry)
          }
        })
        .catch(() => {})
    } else {
      Promise.resolve().then(() => {
        if (active) setDaily(null)
      })
    }

    return () => {
      active = false
    }
  }, [configured, activeSpaceId, targetSpaceId, loadLocalQuestionsData])

  React.useEffect(() => {
    if (!configured || !daily?.id || !isSupabaseClientConfigured()) return
    const supabase = createClient()
    const channel = supabase
      .channel(`daily-q:${daily.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_question_answers',
          filter: `daily_question_id=eq.${daily.id}`,
        },
        () => {
          void loadDaily()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [configured, daily?.id, loadDaily])

  const filtered = React.useMemo(() => {
    if (selectedCat === 'all') return questions
    if (selectedCat === 'saved') return questions.filter((q) => savedIds.includes(q.id))
    return questions.filter((q) => q.category === selectedCat)
  }, [questions, selectedCat, savedIds])

  const toggleSave = async (id: string) => {
    if (!configured) {
      setSavedIds(toggleSavedQuestion(id))
      return
    }
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
    await fetch('/api/questions/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: id }),
    }).catch(() => {})
  }

  const handleShuffle = () => {
    const pool = filtered.length > 0 ? filtered : questions
    if (pool.length === 0) return
    setIsShuffling(true)
    window.setTimeout(() => {
      const candidates = pool.length > 1 ? pool.filter((q) => q.id !== randomQ.id) : pool
      const idx = Math.floor(Math.random() * candidates.length)
      setRandomQ(candidates[idx])
      setIsShuffling(false)
    }, 180)
  }

  const handleSubmitDaily = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!daily?.id || !targetSpaceId || !dailyDraft.trim()) return

    if (!configured) {
      const updated = answerLocalDailyInquiry(targetSpaceId, dailyDraft.trim())
      setDaily(updated)
      setDailyDraft('')
      return
    }

    setSubmittingDaily(true)
    setError(null)
    try {
      const res = await fetch('/api/questions/daily/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: targetSpaceId,
          dailyQuestionId: daily.id,
          answer: dailyDraft.trim(),
        }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        setError(payload?.detail || payload?.error || 'Could not submit daily response.')
        return
      }
      if (payload?.daily) {
        setDaily(payload.daily as DailyInquiry)
        setDailyDraft('')
      }
    } catch {
      setError('Failed to save daily response.')
    } finally {
      setSubmittingDaily(false)
    }
  }

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetSpaceId || customPrompt.trim().length < 5) return

    if (!configured) {
      addLocalCustomQuestion(targetSpaceId, customCategory, customPrompt.trim())
      setCustomPrompt('')
      setShowCustomForm(false)
      loadLocalQuestionsData(targetSpaceId)
      return
    }

    setCreatingCustom(true)
    setError(null)
    try {
      const res = await fetch('/api/questions/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: targetSpaceId,
          category: customCategory,
          content: customPrompt.trim(),
        }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        setError(payload?.detail || payload?.error || 'Could not save custom prompt.')
        return
      }
      setCustomPrompt('')
      setShowCustomForm(false)
      await loadQuestions()
    } catch {
      setError('Unable to create custom prompt.')
    } finally {
      setCreatingCustom(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-10">
      <header className="border-b border-[var(--border)] pb-6 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-medium text-[var(--primary)]">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Intimate Dialogue Generator</span>
            </div>
            <h1 className="font-[family-name:var(--ds-font-display)] text-3xl sm:text-4xl font-bold tracking-tight text-[var(--foreground)]">
              Deep &amp; Playful Question Library
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] max-w-xl">
              Conversation prompts to spark laughter, tender memories, and mutual understanding.
            </p>
          </div>

          {targetSpaceId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomForm((v) => !v)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              <span>Add Custom Prompt</span>
            </Button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-4">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCat(tab.id)}
              className={`px-3 py-1 text-xs rounded-full transition-colors cursor-pointer border ${
                selectedCat === tab.id
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] font-medium'
                  : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]'
              }`}
            >
              {tab.id === 'saved' ? `Saved (${savedIds.length})` : tab.label}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <StatusBanner tone="error" title="Question Action Issue" description={error} />
      )}

      {showCustomForm && targetSpaceId && (
        <form
          onSubmit={handleCreateCustom}
          className="rounded-[var(--ds-radius)] border border-[var(--primary)]/40 bg-[var(--card)] p-5 space-y-4 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Add a Private Question for Your Space
            </h2>
            <select
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs"
            >
              {CATEGORY_TABS.filter((c) => c.id !== 'all' && c.id !== 'saved').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Write a question only visible in this sanctuary..."
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowCustomForm(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={creatingCustom}>
              Save Prompt
            </Button>
          </div>
        </form>
      )}

      {/* ── Today's Blind-Reveal Daily Inquiry ─────────────────────────────── */}
      {daily && (
        <section className="rounded-[var(--ds-radius)] border border-[var(--primary)]/30 bg-[var(--card)] p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Today&apos;s Blind-Reveal Inquiry</span>
            </span>
            <Badge variant="outline" className="text-[11px] capitalize">
              {daily.date} · {daily.category}
            </Badge>
          </div>

          <h2 className="font-[family-name:var(--ds-font-display)] text-2xl font-medium text-[var(--foreground)] leading-snug">
            &ldquo;{daily.prompt}&rdquo;
          </h2>

          {daily.revealed ? (
            <div className="space-y-3 pt-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Both Answered — Revealed Together</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-4 space-y-1">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--primary)]">
                    {demoActor === 'partner' ? 'Partner Perspective' : 'Your Answer'}
                  </div>
                  <p className="text-sm text-[var(--foreground)]">{daily.myAnswer}</p>
                </div>
                <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-4 space-y-1">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-purple-600 dark:text-purple-400">
                    {demoActor === 'partner' ? 'You' : "Partner's Answer"}
                  </div>
                  <p className="text-sm text-[var(--foreground)]">{daily.partnerAnswer}</p>
                </div>
              </div>
              <div className="pt-1">
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`${chatBaseHref}?prompt=${encodeURIComponent(
                      `Reflecting on today's question ("${daily.prompt}"): I loved reading your answer!`,
                    )}`}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    <span>Discuss Reveal in Chat</span>
                  </Link>
                </Button>
              </div>
            </div>
          ) : daily.myAnswer ? (
            <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--muted)]/30 p-4 space-y-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--foreground)]">
                <Lock className="h-3.5 w-3.5 text-amber-500" />
                <span>Your answer is sealed — waiting for your partner</span>
              </div>
              <p className="text-[var(--muted-foreground)]">Your note: &ldquo;{daily.myAnswer}&rdquo;</p>
              {isLocalSandbox && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDemoActor(demoActor === 'self' ? 'partner' : 'self')}
                >
                  <span>Switch to {demoActor === 'self' ? 'Partner' : 'You'} to Answer &amp; Reveal</span>
                </Button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmitDaily} className="space-y-3 pt-1">
              <textarea
                value={dailyDraft}
                onChange={(e) => setDailyDraft(e.target.value)}
                rows={3}
                placeholder="Write your reflection... Your partner cannot read it until they submit theirs."
                className="w-full rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] resize-none"
                required
              />
              <Button type="submit" variant="primary" size="sm" isLoading={submittingDaily}>
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                <span>Lock In Today&apos;s Answer</span>
              </Button>
            </form>
          )}
        </section>
      )}

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
            onClick={() => void toggleSave(randomQ.id)}
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
            <Link
              href={
                targetSpaceId
                  ? `/messages/${targetSpaceId}?prompt=${encodeURIComponent(randomQ.prompt)}`
                  : '/home'
              }
            >
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
          {savedIds.length > 0 && <span>{savedIds.length} saved favourites</span>}
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
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] font-medium capitalize">
                      {item.category}
                    </span>
                    {item.isCustom && (
                      <Badge variant="outline" className="text-[10px]">
                        Private Custom
                      </Badge>
                    )}
                  </div>
                  <p className="font-[family-name:var(--ds-font-display)] text-lg font-medium text-[var(--foreground)] leading-snug">
                    {item.prompt}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]/70 text-xs">
                  <button
                    type="button"
                    onClick={() => void toggleSave(item.id)}
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
                    href={
                      targetSpaceId
                        ? `/messages/${targetSpaceId}?prompt=${encodeURIComponent(item.prompt)}`
                        : chatBaseHref
                    }
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
