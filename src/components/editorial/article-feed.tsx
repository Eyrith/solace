'use client'

import * as React from 'react'
import { ArticleCard, type EditorialArticle } from './article-card'
import { useEditorialLibrary } from '@/lib/editorial/library-store'
import { getArticleImage, generateSlug, type CuratedArticle } from '@/lib/editorial/articles'

interface ArticleFeedProps {
  articles: CuratedArticle[]
  variant?: 'featured' | 'standard' | 'row'
  featuredFirst?: boolean
  className?: string
}

function mapToCardArticle(a: CuratedArticle): EditorialArticle {
  const img = getArticleImage(a)
  return {
    id: a.id,
    slug: generateSlug(a.title),
    title: a.title,
    author: a.author,
    publication: a.publicationName,
    publishedAt: a.publishedDate,
    description: a.description,
    keyTakeaway: a.keyTakeaway,
    originalUrl: a.originalUrl,
    category: a.category.charAt(0).toUpperCase() + a.category.slice(1),
    readingDurationMinutes: a.readingDurationMinutes,
    image: img.card,
    imageAlt: img.alt,
  }
}

export function ArticleFeed({
  articles,
  variant = 'standard',
  featuredFirst = false,
  className,
}: ArticleFeedProps) {
  const { isSaved, toggleSave, recordRead, getArticleNote } = useEditorialLibrary()

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
          hasNote={Boolean(getArticleNote(lead.id).trim())}
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
                hasNote={Boolean(getArticleNote(art.id).trim())}
                onToggleSave={toggleSave}
                onOpenArticle={() => recordRead(art.id)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={
        variant === 'row'
          ? 'divide-y divide-[var(--border)]'
          : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
      }
    >
      {articles.map((art) => (
        <ArticleCard
          key={art.id}
          article={mapToCardArticle(art)}
          variant={variant}
          isSaved={isSaved(art.id)}
          hasNote={Boolean(getArticleNote(art.id).trim())}
          onToggleSave={toggleSave}
          onOpenArticle={() => recordRead(art.id)}
        />
      ))}
    </div>
  )
}
