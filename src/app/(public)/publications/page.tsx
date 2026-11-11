import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, ExternalLink } from 'lucide-react'
import { EDITORIAL_PUBLICATIONS } from '@/lib/editorial/sources'
import { CURATED_ARTICLES } from '@/lib/editorial/articles'
import { PublicationCard } from '@/components/editorial/publication-card'

export const metadata = {
  title: 'Publication Directory — Commonplace',
  description: 'Curated index of independent publications, journals, and educational initiatives.',
}

export default function PublicationsDirectoryPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <header className="border-b border-[var(--border)] pb-8 space-y-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
        <h1 className="font-[family-name:var(--ds-font-display)] text-3xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
          Publication Directory
        </h1>
        <p className="text-base text-[var(--muted-foreground)] max-w-2xl font-light">
          We curate and link directly to these distinguished cultural and intellectual journals. All articles link to the original publishers with complete copyright attribution.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {EDITORIAL_PUBLICATIONS.map((pub) => {
          const count = CURATED_ARTICLES.filter((a) => a.publicationSlug === pub.slug).length
          return (
            <PublicationCard
              key={pub.id}
              publication={{
                name: pub.name,
                slug: pub.slug,
                focus: pub.tagline,
                websiteUrl: pub.websiteUrl,
                curatedCount: count,
              }}
            />
          )
        })}
      </div>

      <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--muted)]/30 p-6 text-xs text-[var(--muted-foreground)] space-y-2">
        <div className="font-medium text-[var(--foreground)]">Publishing Partnership &amp; Attribution Policy</div>
        <p className="leading-relaxed">
          Commonplace does not replicate full copyright text or monetize third-party intellectual property. We provide editorial indexing, contextual summaries, and direct canonical links to encourage readers to support independent journalism.
        </p>
      </div>
    </div>
  )
}
