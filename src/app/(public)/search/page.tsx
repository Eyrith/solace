'use client'

import * as React from 'react'
import Link from 'next/link'
import { Search, X, BookOpen, Clock, Tag, Sparkles } from 'lucide-react'
import { CURATED_ARTICLES, type CuratedArticle } from '@/lib/editorial/articles'
import { EDITORIAL_PUBLICATIONS } from '@/lib/editorial/sources'
import { ArticleFeed } from '@/components/editorial/article-feed'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const POPULAR_SEARCH_TERMS = [
  'Vulnerability',
  'Attachment',
  'Conflict',
  'Self-Compassion',
  'Stoicism',
  'Quiet',
  'Awe',
  'Rilke',
  'Camus',
  'Attention',
]

export default function SearchPage() {
  const [query, setQuery] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState('all')
  const [selectedPub, setSelectedPub] = React.useState('all')

  const results = React.useMemo(() => {
    return CURATED_ARTICLES.filter((article) => {
      if (selectedCategory !== 'all' && article.category !== selectedCategory) return false
      if (selectedPub !== 'all' && article.publicationSlug !== selectedPub) return false

      if (!query.trim()) return true

      const q = query.toLowerCase()
      const inTitle = article.title.toLowerCase().includes(q)
      const inDesc = article.description.toLowerCase().includes(q)
      const inAuthor = article.author.toLowerCase().includes(q)
      const inTags = article.tags.some((t) => t.toLowerCase().includes(q))
      const inTakeaway = article.keyTakeaway?.toLowerCase().includes(q) ?? false

      return inTitle || inDesc || inAuthor || inTags || inTakeaway
    })
  }, [query, selectedCategory, selectedPub])

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Search Header */}
      <div className="border-b border-[var(--border)] pb-8 space-y-4">
        <div className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] uppercase tracking-wider font-medium">
          <Search className="h-3.5 w-3.5 text-[var(--primary)]" />
          <span>Library Search</span>
        </div>
        <h1 className="font-[family-name:var(--ds-font-display)] text-3xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
          Search Essays &amp; Reflections
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] max-w-xl font-light">
          Query our catalogue across psychology, relationships, philosophy, and neuroscience.
        </p>

        {/* Search Bar Input */}
        <div className="pt-2 relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords, authors, psychological concepts..."
            className="h-13 pl-12 pr-10 text-base rounded-[var(--ds-radius)] bg-[var(--card)] shadow-xs"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              aria-label="Clear search query"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Suggested keywords */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 text-xs">
          <span className="text-[var(--muted-foreground)] mr-1">Suggested inquiries:</span>
          {POPULAR_SEARCH_TERMS.map((term) => (
            <button
              key={term}
              onClick={() => setQuery(term)}
              className="px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-colors cursor-pointer"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted-foreground)] font-medium">Field:</span>
          {['all', 'psychology', 'relationships', 'philosophy', 'science', 'literature'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`capitalize px-2.5 py-1 rounded-[var(--ds-radius)] transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] font-medium'
                  : 'bg-[var(--muted)]/50 text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {cat === 'all' ? 'All Fields' : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[var(--muted-foreground)] font-medium">Publication:</span>
          <select
            value={selectedPub}
            onChange={(e) => setSelectedPub(e.target.value)}
            className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--ds-radius)] px-2 py-1 text-xs"
          >
            <option value="all">All Sources</option>
            {EDITORIAL_PUBLICATIONS.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4 pt-2">
        <div className="text-xs text-[var(--muted-foreground)] flex items-center justify-between border-b border-[var(--border)]/60 pb-2">
          <span>
            {results.length} {results.length === 1 ? 'essay matched' : 'essays matched'}
            {query && (
              <span>
                {' '}
                for &ldquo;<strong className="text-[var(--foreground)]">{query}</strong>&rdquo;
              </span>
            )}
          </span>
          {(query || selectedCategory !== 'all' || selectedPub !== 'all') && (
            <button
              onClick={() => {
                setQuery('')
                setSelectedCategory('all')
                setSelectedPub('all')
              }}
              className="text-[var(--primary)] hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>

        <ArticleFeed articles={results} />
      </div>
    </div>
  )
}
