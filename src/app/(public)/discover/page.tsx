'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEditorialCatalog } from '@/lib/editorial/use-catalog'
import { EDITORIAL_PUBLICATIONS } from '@/lib/editorial/sources'
import { SEED_ARTICLES } from '@/lib/editorial/first-party-seed'
import { ArticleFeed } from '@/components/editorial/article-feed'
import { Input } from '@/components/ui/input'
import { Search, Filter, BookOpen, Clock, Sparkles, X } from 'lucide-react'
import { classifyStealthCode, handleStealthInput } from '@/lib/sanctuary/stealth'

function DiscoverContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialQ = searchParams.get('q') || ''
  const initialCategory = searchParams.get('category') || 'all'

  const { articles } = useEditorialCatalog()
  const currentQ = searchParams.get('q') || ''
  const currentCat = searchParams.get('category') || 'all'

  const [selectedCategory, setSelectedCategory] = React.useState<string>(initialCategory)
  const [selectedPublication, setSelectedPublication] = React.useState<string>('all')
  const [searchQuery, setSearchQuery] = React.useState<string>(initialQ)
  const [prevParams, setPrevParams] = React.useState({ q: initialQ, cat: initialCategory })

  if (prevParams.q !== currentQ || prevParams.cat !== currentCat) {
    setPrevParams({ q: currentQ, cat: currentCat })
    setSearchQuery(currentQ)
    setSelectedCategory(currentCat)
  }

  // Sync state back to URL query params
  const updateUrl = React.useCallback(
    (q: string, cat: string) => {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (cat !== 'all') params.set('category', cat)
      const qs = params.toString()
      const nextUrl = qs ? `/discover?${qs}` : '/discover'
      window.history.replaceState(null, '', nextUrl)
    },
    [],
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    const codeType = classifyStealthCode(val)
    if (codeType) {
      setSearchQuery('')
      void handleStealthInput(val, router)
      return
    }
    setSearchQuery(val)
    updateUrl(val, selectedCategory)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const codeType = classifyStealthCode(searchQuery)
      if (codeType) {
        e.preventDefault()
        setSearchQuery('')
        void handleStealthInput(searchQuery, router)
      }
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const codeType = classifyStealthCode(searchQuery)
    if (codeType) {
      setSearchQuery('')
      void handleStealthInput(searchQuery, router)
    }
  }

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId)
    updateUrl(searchQuery, catId)
  }

  const categories = [
    { id: 'all', label: 'All Fields' },
    { id: 'psychology', label: 'Psychology' },
    { id: 'relationships', label: 'Relationships' },
    { id: 'philosophy', label: 'Philosophy' },
    { id: 'science', label: 'Science' },
    { id: 'literature', label: 'Literature' },
  ]

  const filteredArticles = articles.filter((article) => {
    if (classifyStealthCode(searchQuery)) return false
    if (selectedCategory !== 'all' && article.category !== selectedCategory) {
      return false
    }
    if (selectedPublication !== 'all' && article.publicationSlug !== selectedPublication) {
      return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesTitle = article.title.toLowerCase().includes(q)
      const matchesDesc = article.description.toLowerCase().includes(q)
      const matchesAuthor = article.author.toLowerCase().includes(q)
      const matchesTag = article.tags.some((t) => t.toLowerCase().includes(q))
      return matchesTitle || matchesDesc || matchesAuthor || matchesTag
    }
    return true
  })

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <header className="border-b border-[var(--border)] pb-8 space-y-4">
        <h1 className="font-[family-name:var(--ds-font-display)] text-3xl sm:text-5xl font-bold text-[var(--foreground)] tracking-tight">
          Discover Inquiries &amp; Essays
        </h1>
        <p className="text-sm sm:text-base text-[var(--muted-foreground)] max-w-2xl font-light font-[family-name:var(--ds-font-editorial)] leading-relaxed">
          Explore curated essays examining human emotion, intimate dialogue, and philosophical clarity.
        </p>

        {/* Consolidated Search Input in Discover Header */}
        <form onSubmit={handleFormSubmit} className="pt-2 max-w-xl relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
          <Input
            type="search"
            placeholder="Search by topic, keyword, or author..."
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-9 h-11 bg-[var(--card)] rounded-[var(--ds-radius)] border-[var(--border)] text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                updateUrl('', selectedCategory)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
              aria-label="Clear search query"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
      </header>

      {/* ── Original Essays & Works ───────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--primary)] font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Original Inquiries</span>
            </div>
            <h2 className="font-[family-name:var(--ds-font-display)] text-2xl font-semibold text-[var(--foreground)]">
              Original Essays &amp; Philosophical Works
            </h2>
          </div>
          <Link
            href="/studio/editorial"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ds-radius)] border border-[var(--border)] hover:bg-[var(--surface-2)] text-xs font-medium transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Editorial Studio</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SEED_ARTICLES.map((article) => (
            <Link
              key={article.id}
              href={`/articles/${article.slug}`}
              className="p-6 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--primary)]/60 hover:shadow-[var(--shadow-1)] transition-all group flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--primary)] font-medium">
                    {article.category?.name}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-mono text-[var(--muted-foreground)]">
                    <Clock className="w-3 h-3" />
                    {article.readingTimeMinutes}m
                  </span>
                </div>
                <h3 className="font-[family-name:var(--ds-font-display)] text-lg font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors leading-snug">
                  {article.title}
                </h3>
                <p className="font-[family-name:var(--ds-font-editorial)] text-xs text-[var(--muted-foreground)] line-clamp-3 leading-relaxed">
                  {article.excerpt}
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--muted-foreground)] font-mono">
                <span>Meridian Reader</span>
                <span className="text-[var(--primary)] font-medium group-hover:translate-x-0.5 transition-transform">
                  Read Essay &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Category Pills and Source Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={`px-3 py-1.5 text-xs rounded-[var(--ds-radius)] transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] font-medium'
                  : 'bg-[var(--surface-1)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <Filter className="h-3.5 w-3.5" />
          <span>Source:</span>
          <select
            value={selectedPublication}
            onChange={(e) => setSelectedPublication(e.target.value)}
            className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[var(--ds-radius)] px-2.5 py-1 text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer"
          >
            <option value="all">All Publications</option>
            {EDITORIAL_PUBLICATIONS.map((pub) => (
              <option key={pub.slug} value={pub.slug}>
                {pub.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
        <span>
          Showing {filteredArticles.length} {filteredArticles.length === 1 ? 'essay' : 'essays'}
        </span>
        {(selectedCategory !== 'all' || selectedPublication !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedCategory('all')
              setSelectedPublication('all')
              setSearchQuery('')
              updateUrl('', 'all')
            }}
            className="text-[var(--primary)] hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Articles Feed */}
      <ArticleFeed articles={filteredArticles} />
    </div>
  )
}

export default function DiscoverPage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-xs text-[var(--muted-foreground)]">
          Loading inquiries...
        </div>
      }
    >
      <DiscoverContent />
    </React.Suspense>
  )
}
