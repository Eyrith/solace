import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, ExternalLink, Image as ImageIcon } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Photography Credits | Meridian',
  description: 'Attribution and licensing information for editorial photography used in Meridian.',
}

const PHOTOGRAPHY_CREDITS = [
  {
    section: 'Lead Editorial Hero',
    description: 'Soft morning sunlight illuminating quiet architectural vista',
    photographer: 'Alex Perez',
    profileUrl: 'https://unsplash.com/@a21perez',
    sourceUrl: 'https://unsplash.com/photos/ioJWsXstZ8o',
    license: 'Unsplash License',
  },
  {
    section: 'Psychology',
    description: 'Peaceful morning light and mindful contemplation',
    photographer: 'Jared Rice',
    profileUrl: 'https://unsplash.com/@jareddrice',
    sourceUrl: 'https://unsplash.com/photos/NTyBbu66_SI',
    license: 'Unsplash License',
  },
  {
    section: 'Relationships',
    description: 'Two people sharing quiet connection along a scenic landscape',
    photographer: 'Joanna Nix-Walkup',
    profileUrl: 'https://unsplash.com/@joannix',
    sourceUrl: 'https://unsplash.com/photos/7Acux8d8Bw0',
    license: 'Unsplash License',
  },
  {
    section: 'Philosophy',
    description: 'Classical stone columns and morning shadows in quiet cloister',
    photographer: 'Mitchell Orr',
    profileUrl: 'https://unsplash.com/@mitchellorr',
    sourceUrl: 'https://unsplash.com/photos/mO8wDW5-P0k',
    license: 'Unsplash License',
  },
  {
    section: 'Science & Cosmos',
    description: 'Starry night sky and cosmos viewed above quiet mountain forest',
    photographer: 'Vincentiu Solomon',
    profileUrl: 'https://unsplash.com/@vincentiu',
    sourceUrl: 'https://unsplash.com/photos/ln5drpv_ImI',
    license: 'Unsplash License',
  },
  {
    section: 'Literature',
    description: 'Open pages of a literature volume on a wooden reading desk',
    photographer: 'Patrick Tomasso',
    profileUrl: 'https://unsplash.com/@impatrickt',
    sourceUrl: 'https://unsplash.com/photos/Oaqk7qqNh_c',
    license: 'Unsplash License',
  },
]

export default function CreditsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="space-y-4">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Discover</span>
        </Link>
        <div className="space-y-2 border-b border-[var(--border)] pb-8">
          <h1 className="font-[family-name:var(--ds-font-display)] text-3xl sm:text-5xl font-semibold text-[var(--foreground)]">
            Photography Credits
          </h1>
          <p className="text-sm sm:text-base text-[var(--muted-foreground)] font-[family-name:var(--ds-font-editorial)] max-w-2xl leading-relaxed">
            All photography featured in Meridian is locally stored for offline resilience and licensed for free commercial and editorial use under the{' '}
            <a
              href="https://unsplash.com/license"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--primary)] underline underline-offset-4"
            >
              Unsplash License
            </a>
            .
          </p>
        </div>
      </div>

      <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--surface-1)] divide-y divide-[var(--border)] overflow-hidden">
        {PHOTOGRAPHY_CREDITS.map((item) => (
          <div key={item.section} className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-[var(--primary)] shrink-0" />
                <span className="font-semibold text-sm text-[var(--foreground)]">{item.section}</span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] font-[family-name:var(--ds-font-editorial)]">
                {item.description}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs shrink-0">
              <a
                href={item.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--foreground)] hover:underline inline-flex items-center gap-1"
              >
                <span>{item.photographer}</span>
                <ExternalLink className="h-3 w-3 text-[var(--muted-foreground)]" />
              </a>
              <span className="text-[var(--muted-foreground)]">·</span>
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--primary)] hover:underline"
              >
                Original Photo
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-[var(--muted-foreground)] border-t border-[var(--border)] pt-6 flex justify-between items-center">
        <span>Meridian Editorial Publication</span>
        <Link href="/" className="hover:text-[var(--foreground)]">
          Home
        </Link>
      </div>
    </div>
  )
}
