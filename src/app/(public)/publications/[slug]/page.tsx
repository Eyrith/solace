import * as React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink, MapPin, BookOpen } from 'lucide-react'
import { EDITORIAL_PUBLICATIONS } from '@/lib/editorial/sources'
import { getEditorialCatalog } from '@/lib/editorial/catalog'
import { ArticleFeed } from '@/components/editorial/article-feed'
import { Button } from '@/components/ui/button'

interface PublicationPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return EDITORIAL_PUBLICATIONS.map((pub) => ({
    slug: pub.slug,
  }))
}

export default async function PublicationDetailPage({ params }: PublicationPageProps) {
  const { slug } = await params
  const publication = EDITORIAL_PUBLICATIONS.find((p) => p.slug === slug)

  if (!publication) {
    notFound()
  }

  const articles = await getEditorialCatalog({ publicationSlug: slug })

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Header */}
      <div className="border-b border-[var(--border)] pb-8 space-y-4">
        <Link
          href="/publications"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>All Publications</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: publication.accentColor }}
                aria-hidden="true"
              />
              <span className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-medium">
                Established {publication.foundedYear}
              </span>
            </div>

            <h1 className="font-[family-name:var(--ds-font-display)] text-3xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
              {publication.name}
            </h1>

            <p className="text-base text-[var(--muted-foreground)] leading-relaxed font-light">
              {publication.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted-foreground)] pt-2">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {publication.origin}
              </span>
              <span className="inline-flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                {articles.length} Curated Inquiries
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <Button variant="outline" size="sm" asChild>
              <a
                href={publication.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5"
              >
                <span>Visit {publication.name}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>

        {/* Focus areas */}
        <div className="flex flex-wrap items-center gap-1.5 pt-4">
          <span className="text-xs text-[var(--muted-foreground)] mr-1">Focus Topics:</span>
          {publication.topics.map((t) => (
            <span
              key={t}
              className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Articles from this publication */}
      <section className="space-y-6">
        <h2 className="font-[family-name:var(--ds-font-display)] text-2xl font-semibold tracking-tight">
          Selected Readings from {publication.name}
        </h2>
        <ArticleFeed articles={articles} />
      </section>
    </div>
  )
}

