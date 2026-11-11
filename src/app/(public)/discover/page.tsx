'use client'

import * as React from 'react'
import { CURATED_ARTICLES, type CuratedArticle } from '@/lib/editorial/articles'
import { EDITORIAL_PUBLICATIONS } from '@/lib/editorial/sources'
import { ArticleFeed } from '@/components/editorial/article-feed'
import { Input } from '@/components/ui/input'
import { Search, Filter, SlidersHorizontal } from 'lucide-react'

export default function DiscoverPage() {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all')
  const [selectedPublication, setSelectedPublication] = React.useState<string>('all')
  const [searchQuery, setSearchQuery] = React.useState<string>('')

  const categories = [
    { id: 'all', label: 'All Fields' },
    { id: 'psychology', label: 'Psychology' },
    { id: 'relationships', label: 'Relationships' },
    { id: 'philosophy', label: 'Philosophy' },
    { id: 'science', label: 'Science' },
    { id: 'literature', label: 'Literature' },
  ]

  const filteredArticles = CURATED_ARTICLES.filter((article) => {
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
      <header className="border-b border-[var(--border)] pb-8 space-y-3">
        <span className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-medium">
          Editorial Catalog
        </span>
        <h1 className="font-[family-name:var(--ds-font-display)] text-3xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
          Discover Inquiries &amp; Essays
        </h1>
        <p className="text-sm sm:text-base text-[var(--muted-foreground)] max-w-2xl font-light">
          Browse through {CURATED_ARTICLES.length} curated essays examining human emotion, social connection, and philosophical clarity.
        </p>

        {/* Search bar inside Discover */}
        <div className="pt-4 max-w-lg relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            type="search"
            placeholder="Search by topic, keyword, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-[var(--card)]"
          />
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border)]/70">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs rounded-[var(--ds-radius)] transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] font-medium'
                  : 'bg-[var(--muted)]/50 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
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
            className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--ds-radius)] px-2.5 py-1 text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
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
