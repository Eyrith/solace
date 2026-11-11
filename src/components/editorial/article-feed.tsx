'use client'

import * as React from 'react'
import { ArticleCard, type EditorialArticle } from './article-card'
import { useEditorialLibrary } from '@/lib/editorial/library-store'
import type { CuratedArticle } from '@/lib/editorial/articles'

interface ArticleFeedProps {
  articles: CuratedArticle[]
  variant?: 'featured' | 'standard' | 'row'
  featuredFirst?: boolean
  className?: string
}

function mapToCardArticle(a: CuratedArticle): EditorialArticle {
  return {
    id: a.id,
    title: a.title,
    author: a.author,
    publication: a.publicationName,
    publishedAt: a.publishedDate,
    description: a.description,
    originalUrl: a.originalUrl,
    category: a.category.charAt(0).toUpperCase() + a.category.slice(1),
    readingDurationMinutes: a.readingDurationMinutes,
  }
}

export function ArticleFeed({
  articles,
  variant = 'standard',
  featuredFirst = false,
  className,
}: ArticleFeedProps) {
  const { isSaved, toggleSave, recordRead } = useEditorialLibrary()

  if (articles.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-[var(--muted-foreground)]">
        No articles found in this collection.
      </div>
    )
  }

  if (featuredFirst && articles.length > 0) {
    const [lead, ...rest] = articles
    return (
      <div className="space-y-8">
        <ArticleCard
          article={mapToCardArticle(lead)}
          variant="featured"
          isSaved={isSaved(lead.id)}
          onToggleSave={toggleSave}
          onOpenArticle={() => recordRead(lead.id)}
        />
        {rest.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((art) => (
              <ArticleCard
                key={art.id}
                article={mapToCardArticle(art)}
                variant="standard"
                isSaved={isSaved(art.id)}
                onToggleSave={toggleSave}
                onOpenArticle={() => recordRead(art.id)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (variant === 'row') {
    return (
      <div className="divide-y divide-[var(--border)]">
        {articles.map((art) => (
          <ArticleCard
            key={art.id}
            article={mapToCardArticle(art)}
            variant="row"
            isSaved={isSaved(art.id)}
            onToggleSave={toggleSave}
            onOpenArticle={() => recordRead(art.id)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={className ?? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
      {articles.map((art) => (
        <ArticleCard
          key={art.id}
          article={mapToCardArticle(art)}
          variant={variant}
          isSaved={isSaved(art.id)}
          onToggleSave={toggleSave}
          onOpenArticle={() => recordRead(art.id)}
        />
      ))}
    </div>
  )
}
