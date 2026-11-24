'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Bookmark, Compass } from 'lucide-react'
import { useEditorialCatalog } from '@/lib/editorial/use-catalog'
import { useEditorialLibrary } from '@/lib/editorial/library-store'
import { ArticleFeed } from '@/components/editorial/article-feed'
import { Button } from '@/components/ui/button'

export default function SavedArticlesPage() {
  const { savedIds, isLoaded, serverSynced } = useEditorialLibrary()
  const { articles } = useEditorialCatalog()

  const savedArticles = articles.filter((a) => savedIds.includes(a.id))

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
            <h1 className="font-[family-name:var(--ds-font-display)] text-3xl sm:text-5xl font-bold text-[var(--foreground)]">
              Saved Inquiries
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] font-light">
              {serverSynced
                ? 'Essays bookmarked across your reader account.'
                : 'Essays and articles bookmarked for quiet contemplation in this browser session.'}
            </p>
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">
            {savedArticles.length} {savedArticles.length === 1 ? 'saved article' : 'saved articles'}
          </div>
        </div>
      </header>

      {savedArticles.length === 0 ? (
        <div className="py-20 text-center space-y-4 max-w-sm mx-auto">
          <div className="space-y-2">
            <h3 className="font-[family-name:var(--ds-font-display)] text-xl font-medium text-[var(--foreground)]">
              Your reading list is empty
            </h3>
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed font-light">
              When exploring essays across psychology, philosophy, or literature, save them here for later reflection.
            </p>
          </div>
          <div className="pt-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/discover">
                <Compass className="h-4 w-4 mr-1.5" />
                Explore Articles
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <ArticleFeed articles={savedArticles} />
      )}
    </div>
  )
}

