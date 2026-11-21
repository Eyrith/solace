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
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 border-b border-[var(--border)] pb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-[var(--muted-foreground)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" aria-hidden="true" />
              <span>Independent Inquiries · Volume I</span>
            </div>
            <h1 className="font-[family-name:var(--ds-font-display)] text-4xl sm:text-6xl font-bold tracking-tight text-[var(--foreground)] leading-[1.08]">
              Essays on Mind, Emotion &amp; Human Bond
            </h1>
            <p className="text-base sm:text-lg text-[var(--muted-foreground)] leading-relaxed font-light">
              A curated common place bringing together rigorous essays, psychological research, and philosophical reflections from independent publications worldwide.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
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

        {/* Quick Topic Pills */}
        <div className="mt-8 flex flex-wrap items-center gap-2 pt-6 border-t border-[var(--border)]/60 text-xs">
          <span className="text-[var(--muted-foreground)] mr-2 font-medium">EXPLORE FIELDS:</span>
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
              className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3.5 py-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-colors"
            >
              {topic.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Lead Featured Story & Highlights ────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between mb-8 pb-3 border-b border-[var(--border)]">
          <h2 className="font-[family-name:var(--ds-font-display)] text-2xl sm:text-3xl font-semibold tracking-tight">
            Featured Inquiries
          </h2>
          <Link
            href="/discover"
            className="text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1"
          >
            All articles <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <ArticleFeed articles={featuredArticles} featuredFirst />
      </section>

      {/* ── Pull Quote of Reflection ────────────────────────────────────────── */}
      <section className="bg-[var(--muted)]/40 border-y border-[var(--border)] py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center space-y-4">
          <blockquote className="font-[family-name:var(--ds-font-display)] italic text-xl sm:text-2xl text-[var(--foreground)] leading-relaxed">
            &ldquo;Love consists in this: that two solitudes protect and touch and greet each other.&rdquo;
          </blockquote>
          <cite className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] not-italic">
            — Rainer Maria Rilke, <span className="italic">Letters to a Young Poet</span>
          </cite>
        </div>
      </section>

      {/* ── Psychology Section ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between mb-8 pb-3 border-b border-[var(--border)]">
          <div>
            <h2 className="font-[family-name:var(--ds-font-display)] text-2xl font-semibold tracking-tight">
              Psychology &amp; Inner Well-Being
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              On cognitive habits, emotional soothing, and understanding the interior self
            </p>
          </div>
          <Link
            href="/psychology"
            className="text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1"
          >
            Psychology section <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <ArticleFeed articles={psychologyArticles} />
      </section>

      {/* ── Relationships Section ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between mb-8 pb-3 border-b border-[var(--border)]">
          <div>
            <h2 className="font-[family-name:var(--ds-font-display)] text-2xl font-semibold tracking-tight">
              Relationships &amp; Tenderness
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              De-escalating conflicts, repairing attachment, and cultivating generous patience
            </p>
          </div>
          <Link
            href="/relationships"
            className="text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1"
          >
            Relationships section <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <ArticleFeed articles={relationshipArticles} />
      </section>

      {/* ── Publications Strip ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex items-baseline justify-between mb-8 pb-3 border-b border-[var(--border)]">
          <div>
            <h2 className="font-[family-name:var(--ds-font-display)] text-2xl font-semibold tracking-tight">
              Curated Publications
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              We aggregate and link directly to these distinguished cultural and intellectual journals
            </p>
          </div>
          <Link
            href="/publications"
            className="text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1"
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

      {/* ── Discretion & Attribution Note ───────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1 max-w-xl">
            <h3 className="font-[family-name:var(--ds-font-display)] text-lg font-medium text-[var(--foreground)]">
              An Open Repository for Deep Reading
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              No account is required to browse, search, or save reading notes locally. When you find an essay you love, we encourage you to support the original author and journal directly.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/history">View Reading History</Link>
            </Button>
            <Button variant="primary" size="sm" asChild>
              <Link href="/saved">Your Saved Notes</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
