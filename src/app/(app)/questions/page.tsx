'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  MessageSquareQuote,
  Shuffle,
  Bookmark,
  Check,
  Send,
  Plus,
  X,
  Search,
} from 'lucide-react'
import { QUESTION_LIBRARY } from '@/lib/questions/data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { StatusBanner } from '@/components/ui/status-banner'
import { useSanctuary } from '@/components/providers/sanctuary-provider'
import {
  addLocalCustomQuestion,
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

const CATEGORY_TABS = [
  { id: 'all', label: 'All Topics' },
  { id: 'saved', label: 'Saved' },
  { id: 'funny', label: 'Playful & Banter' },
  { id: 'romantic', label: 'Flirty & Romantic' },
  { id: 'personal', label: 'Deep & Late Night' },
  { id: 'hypothetical', label: 'Hypothetical' },
  { id: 'intimacy', label: 'Intimacy & Desires' },
  { id: 'intellectual', label: 'Intellectual' },
]

export default function QuestionsLibraryPage() {
  const { spaces, activeSpaceId, configured, loading } = useSanctuary()
  const targetSpaceId = activeSpaceId ?? (spaces[0]?.id || (!loading && !configured ? 'space-1' : null))
  const [selectedCat, setSelectedCat] = React.useState('all')
  const [questions, setQuestions] = React.useState<DisplayQuestion[]>(QUESTION_LIBRARY)
  const [savedIds, setSavedIds] = React.useState<string[]>([])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [randomQ, setRandomQ] = React.useState<DisplayQuestion>(() => {
    const funny = QUESTION_LIBRARY.filter((q) => q.category === 'funny')
    return funny[Math.floor(Math.random() * funny.length)] || QUESTION_LIBRARY[0]
  })
  const [isShuffling, setIsShuffling] = React.useState(false)

  // Custom question creator state
  const [showCustomForm, setShowCustomForm] = React.useState(false)
  const [customCategory, setCustomCategory] = React.useState('romantic')
  const [customPrompt, setCustomPrompt] = React.useState('')
  const [creatingCustom, setCreatingCustom] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadLocalQuestionsData = React.useCallback((spaceId: string) => {
    const customs: DisplayQuestion[] = listLocalCustomQuestions(spaceId).map((c) => ({
      id: c.id,
      category: c.category,
      prompt: c.prompt,
      isCustom: true,
    }))
    setQuestions([...customs, ...QUESTION_LIBRARY])
    setSavedIds(listSavedQuestionIds())
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

    return () => {
      active = false
    }
  }, [configured, activeSpaceId, targetSpaceId, loadLocalQuestionsData])

  const filtered = React.useMemo(() => {
    let list = questions
    if (selectedCat === 'saved') {
      list = list.filter((q) => savedIds.includes(q.id))
    } else if (selectedCat !== 'all') {
      list = list.filter((q) => q.category === selectedCat)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((item) => item.prompt.toLowerCase().includes(q))
    }
    return list
  }, [questions, selectedCat, savedIds, searchQuery])

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
    setIsShuffling(true)
    setTimeout(() => {
      const remaining = pool.filter((q) => q.id !== randomQ.id)
      const next = remaining[Math.floor(Math.random() * remaining.length)] || pool[0]
      setRandomQ(next)
      setIsShuffling(false)
    }, 150)
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
        setError(payload?.detail || payload?.error || 'Could not save prompt.')
        return
      }
      setCustomPrompt('')
      setShowCustomForm(false)
      await loadQuestions()
    } catch {
      setError('Unable to save custom prompt.')
    } finally {
      setCreatingCustom(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Header */}
      <header className="space-y-4 border-b border-[var(--border)] pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-[var(--primary)]">
              <MessageSquareQuote className="h-4 w-4" />
              <span>Conversation Starters</span>
            </div>
            <h1 className="font-[family-name:var(--ds-font-display)] text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
              Icebreakers &amp; Late-Night Prompts
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">
              Curated conversation starters to spark spontaneous banter or late-night discussions. Send directly to your private chat with one click.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomForm((v) => !v)}
              className="text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              <span>New Prompt</span>
            </Button>
          </div>
        </div>

        {/* Search & Category Pills */}
        <div className="space-y-3 pt-2">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            <Input
              type="search"
              placeholder="Filter topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs bg-[var(--card)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCat(tab.id)}
                className={`px-3 py-1 text-xs rounded-full transition-colors cursor-pointer border ${
                  selectedCat === tab.id
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] font-medium shadow-xs'
                    : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]'
                }`}
              >
                {tab.id === 'saved' ? `Saved (${savedIds.length})` : tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && (
        <StatusBanner tone="error" title="Question Action Issue" description={error} />
      )}

      {/* Custom Prompt Modal/Form */}
      {showCustomForm && (
        <form
          onSubmit={handleCreateCustom}
          className="rounded-[var(--ds-radius)] border border-[var(--primary)]/40 bg-[var(--card)] p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Add a Private Prompt
            </h2>
            <button
              type="button"
              onClick={() => setShowCustomForm(false)}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-[var(--muted-foreground)]">Category</label>
            <select
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="w-full h-8 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] px-2.5 text-xs text-[var(--foreground)]"
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
            placeholder="Write a thought-provoking or playful question..."
            required
            className="text-xs"
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

      {/* Featured Card of the Moment */}
      {randomQ && (
        <section className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[11px] capitalize font-medium">
              Featured · {randomQ.category}
            </Badge>

            <Button
              size="sm"
              variant="outline"
              onClick={handleShuffle}
              disabled={isShuffling}
              className="text-xs h-7 gap-1.5"
            >
              <Shuffle className={`h-3 w-3 ${isShuffling ? 'animate-spin' : ''}`} />
              <span>Next Card</span>
            </Button>
          </div>

          <blockquote className="font-[family-name:var(--ds-font-display)] text-xl sm:text-2xl font-medium text-[var(--foreground)] leading-snug py-1">
            &ldquo;{randomQ.prompt}&rdquo;
          </blockquote>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void toggleSave(randomQ.id)}
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              {savedIds.includes(randomQ.id) ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-[var(--primary)]" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Bookmark className="h-3.5 w-3.5 mr-1" />
                  <span>Save</span>
                </>
              )}
            </Button>

            <Button variant="primary" size="sm" asChild className="gap-1.5">
              <Link
                href={
                  targetSpaceId
                    ? `/messages/${targetSpaceId}?prompt=${encodeURIComponent(randomQ.prompt)}`
                    : '/home'
                }
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send into Chat</span>
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* Browsable Question Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {selectedCat === 'saved'
              ? `Saved Prompts (${filtered.length})`
              : `Browse Prompts (${filtered.length})`}
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-[var(--ds-radius)] border border-dashed border-[var(--border)] p-10 text-center space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">No prompts found</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {selectedCat === 'saved'
                ? 'Save questions by clicking the bookmark icon on any card.'
                : 'Try clearing your search query or selecting a different category.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col justify-between rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5 hover:border-[var(--primary)]/60 transition-all duration-150 space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {item.category}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => void toggleSave(item.id)}
                      className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                      title={savedIds.includes(item.id) ? 'Remove bookmark' : 'Bookmark prompt'}
                    >
                      {savedIds.includes(item.id) ? (
                        <Check className="h-3.5 w-3.5 text-[var(--primary)]" />
                      ) : (
                        <Bookmark className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                      )}
                    </button>
                  </div>

                  <p className="text-sm font-medium text-[var(--foreground)] leading-relaxed">
                    &ldquo;{item.prompt}&rdquo;
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--border)]/60 flex items-center justify-end">
                  <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-[var(--primary)] hover:text-[var(--primary)] gap-1">
                    <Link
                      href={
                        targetSpaceId
                          ? `/messages/${targetSpaceId}?prompt=${encodeURIComponent(item.prompt)}`
                          : '/home'
                      }
                    >
                      <Send className="h-3 w-3" />
                      <span>Send to Chat</span>
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
