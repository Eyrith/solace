import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, Clock, Lock, Share2 } from 'lucide-react'
import { getArticleBySlug, getArticles } from '@/lib/editorial/article-service'
import { getArticleImage } from '@/lib/editorial/articles'
import { MarkdownRenderer } from '@/components/editorial/markdown-renderer'
import { getInitials } from '@/components/sanctuary/private-shell'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article) {
    return {
      title: 'Article Not Found | Meridian',
    }
  }

  const img = getArticleImage(article)

  return {
    title: `${article.title} | Meridian`,
    description: article.excerpt || article.subtitle || 'An original essay in the Meridian publication.',
    openGraph: {
      title: `${article.title} | Meridian`,
      description: article.excerpt || article.subtitle || undefined,
      images: [{ url: img.lead, alt: img.alt }],
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article || article.status !== 'published') {
    notFound()
  }

  const img = getArticleImage(article)
  const authorName = article.author?.displayName || 'Editorial Contributor'
  const authorInitials = getInitials(authorName)
  const dateFormatted = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  const allArticles = await getArticles({ limit: 4 })
  const relatedArticles = allArticles.filter((a) => a.id !== article.id).slice(0, 2)

  return (
    <article className="min-h-screen bg-[var(--surface-0)] text-[var(--foreground)]">
      {/* Back button and Category breadcrumb */}
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-4 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1.5 hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Discover</span>
        </Link>
        {article.category && (
          <span className="uppercase tracking-wider font-semibold text-[11px] text-[var(--primary)]">
            {article.category.name}
          </span>
        )}
      </div>

      {/* Hero Headline & Metadata */}
      <header className="max-w-[800px] mx-auto px-4 sm:px-6 pt-4 pb-8 space-y-6">
        <h1 className="font-[family-name:var(--ds-font-display)] text-3xl sm:text-5xl md:text-6xl font-semibold leading-[1.12] text-[var(--foreground)] tracking-tight">
          {article.title}
        </h1>

        {article.subtitle && (
          <p className="font-[family-name:var(--ds-font-editorial)] text-lg sm:text-xl text-[var(--muted-foreground)] leading-relaxed italic">
            {article.subtitle}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-semibold text-[var(--foreground)] border border-[var(--border)]">
              {authorInitials}
            </span>
            <div>
              <div className="font-medium text-[var(--foreground)]">{authorName}</div>
              {article.author?.bio && (
                <div className="text-[11px] text-[var(--muted-foreground)]">{article.author.bio}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {dateFormatted && <time dateTime={article.publishedAt || undefined}>{dateFormatted}</time>}
            <span className="flex items-center gap-1 tabular-nums">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{article.readingTimeMinutes} min read</span>
            </span>
          </div>
        </div>
      </header>

      {/* Hero Image (No caption under image as specified) */}
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 mb-10">
        <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden rounded-[var(--ds-radius)] shadow-[var(--shadow-1)] border border-[var(--border)]">
          <Image
            src={img.lead}
            alt={img.alt}
            fill
            priority
            sizes="(max-width: 960px) 100vw, 960px"
            className="object-cover"
          />
        </div>
      </div>

      {/* Editorial Body (Lora with proportional leading, max-w 68ch) */}
      <main className="max-w-[68ch] mx-auto px-4 sm:px-6 font-[family-name:var(--ds-font-editorial)] text-[17px] sm:text-[18px] leading-[1.8] text-[var(--foreground)] space-y-6">
        <MarkdownRenderer content={article.content} />
      </main>

      {/* Citations if present */}
      {article.citations && article.citations.length > 0 && (
        <aside className="max-w-[68ch] mx-auto px-4 sm:px-6 mt-12 pt-8 border-t border-[var(--border)] space-y-3">
          <h3 className="font-semibold text-xs tracking-wider uppercase text-[var(--muted-foreground)]">
            Sources &amp; Citations
          </h3>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-[var(--muted-foreground)] font-[family-name:var(--ds-font-editorial)]">
            {article.citations.map((c) => (
              <li key={c.id}>
                <span className="font-medium text-[var(--foreground)]">{c.sourceTitle}</span>
                {c.authorName && ` by ${c.authorName}`}
                {c.publicationYear && ` (${c.publicationYear})`}
                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-[var(--primary)] hover:underline"
                  >
                    Source ↗
                  </a>
                )}
              </li>
            ))}
          </ol>
        </aside>
      )}

      {/* Related Essays */}
      {relatedArticles.length > 0 && (
        <section className="max-w-[800px] mx-auto px-4 sm:px-6 mt-16 pt-10 border-t border-[var(--border)] space-y-6">
          <h2 className="font-[family-name:var(--ds-font-display)] text-xl font-semibold text-[var(--foreground)]">
            Further Reading
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {relatedArticles.map((rel) => (
              <Link
                key={rel.id}
                href={`/articles/${rel.slug}`}
                className="group rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--surface-1)] p-5 hover:bg-[var(--surface-2)] transition-colors space-y-2 block"
              >
                <div className="text-[11px] font-semibold text-[var(--primary)] uppercase tracking-wider">
                  {rel.category?.name || 'Essay'}
                </div>
                <h3 className="font-[family-name:var(--ds-font-display)] font-semibold text-base text-[var(--foreground)] group-hover:underline underline-offset-4">
                  {rel.title}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
                  {rel.excerpt || rel.subtitle}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Foot: Quiet discreet link to private sanctuary (the only bridge) */}
      <footer className="max-w-[800px] mx-auto px-4 sm:px-6 mt-16 pb-16">
        <div className="border-t border-[var(--border)] pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[var(--muted-foreground)]">
          <div className="space-y-1">
            <span className="font-semibold text-[var(--foreground)]">Meridian</span>
            <p>An open editorial inquiry into psychology, philosophy, literature, and human sciences.</p>
          </div>
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-colors shrink-0"
          >
            <Lock className="h-3 w-3 text-[var(--primary)]" aria-hidden="true" />
            <span>Private Sanctuary</span>
          </Link>
        </div>
      </footer>
    </article>
  )
}
