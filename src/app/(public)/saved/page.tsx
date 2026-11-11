'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Bookmark, Trash2, Compass } from 'lucide-react'
import { CURATED_ARTICLES } from '@/lib/editorial/articles'
import { useEditorialLibrary } from '@/lib/editorial/library-store'
import { ArticleFeed } from '@/components/editorial/article-feed'
import { Button } from '@/components/ui/button'

export default function SavedArticlesPage() {
  const { savedIds, isLoaded } = useEditorialLibrary()

  const savedArticles = CURATED_ARTICLES.filter((a) => savedIds.includes(a.id))

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-[var(--muted-foreground)]">
        Loading your reading library...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <header className="border-b border-[var(--border)] pb-8 space-y-3">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Discover</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-[family-name:var(--ds-font-display)] text-3xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
              Saved Inquiries
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] font-light">
              Essays and articles bookmarked for quiet contemplation. Stored locally in your browser session.
            </p>
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">
            {savedArticles.length} {savedArticles.length === 1 ? 'saved article' : 'saved articles'}
          </div>
        </div>
      </header>

      {savedArticles.length === 0 ? (
        <div className="rounded-[var(--ds-radius)] border border-dashed border-[var(--border)] p-12 text-center space-y-4 max-w-md mx-auto my-12">
          <div className="mx-auto h-12 w-12 rounded-full bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]">
            <Bookmark className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-[var(--foreground)]">Your reading list is empty</h3>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              When exploring essays across Psychology, Philosophy, or Relationships, click the bookmark icon to save them here for later reflection.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/discover">
              <Compass className="h-4 w-4 mr-1.5" />
              Explore Articles
            </Link>
          </Button>
        </div>
      ) : (
        <ArticleFeed articles={savedArticles} />
      )}
    </div>
  )
}
