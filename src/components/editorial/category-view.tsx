import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Clock } from 'lucide-react'
import { CURATED_ARTICLES, TOPIC_METADATA } from '@/lib/editorial/articles'
import { ArticleFeed } from '@/components/editorial/article-feed'
import { Button } from '@/components/ui/button'

interface CategoryViewProps {
  categoryKey: keyof typeof TOPIC_METADATA
}

export function CategoryView({ categoryKey }: CategoryViewProps) {
  const meta = TOPIC_METADATA[categoryKey]
  const articles = CURATED_ARTICLES.filter((a) => a.category === categoryKey)

  const totalReadingTime = articles.reduce((sum, a) => sum + a.readingDurationMinutes, 0)

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Header */}
      <div className="border-b border-[var(--border)] pb-8 space-y-4">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Discover</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs uppercase tracking-widest text-[var(--primary)] font-medium">
              Field of Inquiry
            </span>
            <h1 className="font-[family-name:var(--ds-font-display)] text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
              {meta.title}
            </h1>
            <p className="text-base text-[var(--muted-foreground)] leading-relaxed font-light">
              {meta.description}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)] border-t md:border-t-0 pt-4 md:pt-0 border-[var(--border)]">
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              <span>{articles.length} Selected Essays</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>~{totalReadingTime} min reading time</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Collection */}
      <section className="space-y-8">
        <ArticleFeed articles={articles} featuredFirst />
      </section>

      {/* Cross Exploration Navigation */}
      <section className="border-t border-[var(--border)] pt-12">
        <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-medium mb-4">
          Other Fields of Inquiry
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(TOPIC_METADATA) as Array<keyof typeof TOPIC_METADATA>)
            .filter((key) => key !== categoryKey)
            .map((key) => (
              <Link
                key={key}
                href={`/${key}`}
                className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-3.5 hover:border-[var(--primary)] transition-colors text-center"
              >
                <div className="text-sm font-medium text-[var(--foreground)]">
                  {TOPIC_METADATA[key].title}
                </div>
                <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                  Explore topic &rarr;
                </div>
              </Link>
            ))}
        </div>
      </section>
    </div>
  )
}

