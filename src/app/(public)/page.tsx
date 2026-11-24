import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, Compass, Sparkles, BookOpen } from 'lucide-react'
import { getEditorialCatalog } from '@/lib/editorial/catalog'
import { EDITORIAL_PUBLICATIONS } from '@/lib/editorial/sources'
import { ArticleFeed } from '@/components/editorial/article-feed'
import { PublicationCard } from '@/components/editorial/publication-card'
import { Button } from '@/components/ui/button'

export const revalidate = 3600 // 1 hour ISR

export default async function PublicHomePage() {
  const catalog = await getEditorialCatalog()
  const featuredArticles = catalog.filter((a) => a.isFeatured).slice(0, 4)
  const psychologyArticles = catalog.filter((a) => a.category === 'psychology').slice(0, 3)
  const relationshipArticles = catalog.filter((a) => a.category === 'relationships').slice(0, 3)

  return (
    <div className="space-y-16 py-8 sm:py-12">
      {/* ── Masthead ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-12 border-b border-[var(--border)]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <p className="text-xs font-serif italic text-[var(--muted-foreground)]">
              Curated essays across psychology, human relationships, and philosophical inquiry
            </p>
            <h1 className="font-[family-name:var(--ds-font-display)] text-4xl sm:text-6xl font-bold text-[var(--foreground)] leading-[1.1]">
              Essays on Mind, Emotion &amp; Human Bond
            </h1>
            <p className="text-base sm:text-lg text-[var(--muted-foreground)] leading-relaxed font-light">
              An independent journal gathering rigorous inquiry, psychological research, and philosophical reflections from publications worldwide.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link href="/discover">
                <Compass className="h-4 w-4 mr-1.5" />
                Browse All Essays
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/publications">
                <BookOpen className="h-4 w-4 mr-1.5" />
                5 Publications
              </Link>
            </Button>
          </div>
        </div>

        {/* Quiet Topic Index Navigation */}
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 pt-6 text-sm text-[var(--muted-foreground)]">
          <span className="text-xs text-[var(--muted-foreground)]/80">Fields of inquiry:</span>
          {[
            { label: 'Psychology', href: '/psychology' },
            { label: 'Relationships', href: '/relationships' },
            { label: 'Philosophy', href: '/philosophy' },
            { label: 'Science', href: '/science' },
            { label: 'Literature', href: '/literature' },
          ].map((topic) => (
            <Link
              key={topic.label}
              href={topic.href}
              className="text-xs hover:text-[var(--foreground)] transition-colors hover:underline underline-offset-4"
            >
              {topic.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Lead Featured Story & Highlights ────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between mb-8 pb-3 border-b border-[var(--border)]">
          <h2 className="font-[family-name:var(--ds-font-display)] text-2xl sm:text-3xl font-semibold text-[var(--foreground)]">
            Featured Inquiries
          </h2>
          <Link
            href="/discover"
            className="text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors inline-flex items-center gap-1"
          >
            All essays <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <ArticleFeed articles={featuredArticles} featuredFirst />
      </section>

      {/* ── Pull Quote of Reflection ────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="border-l-2 border-[var(--primary)]/50 pl-6 sm:pl-8 space-y-3">
          <blockquote className="font-[family-name:var(--ds-font-display)] text-xl sm:text-2xl text-[var(--foreground)] leading-relaxed font-normal">
            &ldquo;Love consists in this: that two solitudes protect and touch and greet each other.&rdquo;
          </blockquote>
          <cite className="block text-xs text-[var(--muted-foreground)] not-italic font-serif">
            Rainer Maria Rilke, <span className="italic">Letters to a Young Poet</span>
          </cite>
        </div>
      </section>

      {/* ── Psychology Section ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between mb-8 pb-3 border-b border-[var(--border)]">
          <div>
            <h2 className="font-[family-name:var(--ds-font-display)] text-2xl font-semibold text-[var(--foreground)]">
              Psychology &amp; Inner Well-Being
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              On cognitive habits, emotional soothing, and understanding the interior self
            </p>
          </div>
          <Link
            href="/psychology"
            className="text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors inline-flex items-center gap-1"
          >
            Field overview <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <ArticleFeed articles={psychologyArticles} />
      </section>

      {/* ── Relationships Section ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between mb-8 pb-3 border-b border-[var(--border)]">
          <div>
            <h2 className="font-[family-name:var(--ds-font-display)] text-2xl font-semibold text-[var(--foreground)]">
              Relationships &amp; Tenderness
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              De-escalating conflicts, repairing attachment, and cultivating generous patience
            </p>
          </div>
          <Link
            href="/relationships"
            className="text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors inline-flex items-center gap-1"
          >
            Field overview <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <ArticleFeed articles={relationshipArticles} />
      </section>

      {/* ── Publications Strip ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between mb-8 pb-3 border-b border-[var(--border)]">
          <div>
            <h2 className="font-[family-name:var(--ds-font-display)] text-2xl font-semibold text-[var(--foreground)]">
              Curated Publications
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              We aggregate and link directly to these distinguished cultural and intellectual journals
            </p>
          </div>
          <Link
            href="/publications"
            className="text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors inline-flex items-center gap-1"
          >
            Directory <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {EDITORIAL_PUBLICATIONS.slice(0, 3).map((pub) => (
            <PublicationCard
              key={pub.id}
              publication={{
                name: pub.name,
                slug: pub.slug,
                focus: pub.tagline,
                websiteUrl: pub.websiteUrl,
                curatedCount: pub.articleCount,
              }}
            />
          ))}
        </div>
      </section>

      {/* ── Colophon & Reading Note ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4">
        <div className="border-t border-[var(--border)] pt-8 flex flex-col md:flex-row md:items-baseline justify-between gap-6 text-xs text-[var(--muted-foreground)]">
          <div className="space-y-1.5 max-w-xl">
            <h3 className="font-[family-name:var(--ds-font-display)] text-base font-semibold text-[var(--foreground)]">
              An Open Repository for Deep Reading
            </h3>
            <p className="leading-relaxed font-light">
              No account is required to browse, search, or save reading notes locally. When you discover an essay that speaks to you, we encourage supporting the author and publication directly.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0 font-medium text-xs">
            <Link href="/history" className="hover:text-[var(--foreground)] transition-colors">
              Reading History
            </Link>
            <Link href="/saved" className="text-[var(--foreground)] hover:underline underline-offset-4">
              Saved Notes
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
