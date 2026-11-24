import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import fs from 'fs'
import path from 'path'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/discover',
}))

import { getArticleImage } from '@/lib/editorial/articles'
import { ArticleCard } from '@/components/editorial/article-card'
import { ArticleModal, ArticleModalContent } from '@/components/editorial/article-modal'
import type { Article } from '@/lib/editorial/types'

describe('Phase 4 — Public Editorial Photography & Routes', () => {
  it('maps categories to optimized local photography assets', () => {
    const psych = getArticleImage({ category: 'psychology' })
    expect(psych.lead).toBe('/editorial/psychology-1600.webp')
    expect(psych.card).toBe('/editorial/psychology-800.webp')
    expect(psych.thumb).toBe('/editorial/psychology-640.webp')
    expect(psych.credit).toContain('Jared Rice')

    const phil = getArticleImage({ category: 'philosophy' })
    expect(phil.lead).toBe('/editorial/philosophy-1600.webp')
    expect(phil.credit).toContain('Mitchell Orr')

    const lit = getArticleImage({ category: 'literature' })
    expect(lit.lead).toBe('/editorial/literature-1600.webp')
    expect(lit.credit).toContain('Patrick Tomasso')
  })

  it('preserves custom image overrides when provided', () => {
    const custom = getArticleImage({
      image: '/editorial/custom-lead.webp',
      imageAlt: 'Custom archival illustration',
      imageCredit: 'Public Domain',
    })
    expect(custom.lead).toBe('/editorial/custom-lead.webp')
    expect(custom.alt).toBe('Custom archival illustration')
    expect(custom.credit).toBe('Public Domain')
  })

  it('verifies public/editorial/CREDITS.md exists with all licensed attributions', () => {
    const creditsPath = path.join(process.cwd(), 'public/editorial/CREDITS.md')
    expect(fs.existsSync(creditsPath)).toBe(true)

    const content = fs.readFileSync(creditsPath, 'utf-8')
    expect(content).toContain('Unsplash License')
    expect(content).toContain('Alex Perez')
    expect(content).toContain('Jared Rice')
    expect(content).toContain('Joanna Nix-Walkup')
    expect(content).toContain('Mitchell Orr')
    expect(content).toContain('Vincentiu Solomon')
    expect(content).toContain('Patrick Tomasso')
  })

  it('renders ArticleCard with image and canonical /articles/[slug] link', () => {
    const html = renderToString(
      React.createElement(ArticleCard, {
        article: {
          id: 'art-test',
          slug: 'architecture-of-inwardness',
          title: 'The Architecture of Inwardness',
          author: 'Michel de Montaigne',
          publication: 'Meridian Original',
          publishedAt: '2025-01-01',
          description: 'An architectural experiment in preserving interior autonomy.',
          category: 'Philosophy',
          readingDurationMinutes: 12,
          image: '/editorial/philosophy-800.webp',
          imageAlt: 'Classical stone columns in quiet cloister',
          originalUrl: 'https://example.com/essay',
        },
        variant: 'featured',
      })
    )

    // Image rendered with next/image
    expect(html).toContain('philosophy-800.webp')
    expect(html).toContain('alt="Classical stone columns in quiet cloister"')
    // Canonical link to /articles/[slug]
    expect(html).toContain('href="/articles/architecture-of-inwardness"')
    expect(html).toContain('Read Essay')
  })

  it('renders ArticleModal with discreet bridge to private sanctuary at foot', () => {
    const mockArticle: Article = {
      id: 'art-modal-test',
      slug: 'test-essay',
      title: 'Testing the Quiet Mind',
      subtitle: 'A brief inquiry into contemplation.',
      excerpt: 'Summary excerpt of the essay.',
      content: '## Opening Thoughts\n\nA quiet mind is capable of observing itself without deception.',
      status: 'published',
      readingTimeMinutes: 5,
      isFeatured: false,
      publishedAt: '2025-02-01',
      createdAt: '2025-02-01',
      updatedAt: '2025-02-01',
      category: {
        id: 'cat-phil',
        name: 'Philosophy',
        slug: 'philosophy',
        displayOrder: 1,
      },
      author: {
        id: 'auth-1',
        displayName: 'Seneca',
      },
    }

    const html = renderToString(React.createElement(ArticleModalContent, { article: mockArticle }))
    expect(html).toContain('Testing the Quiet Mind')
    expect(html).toContain('Seneca')
    expect(html).toContain('Private Sanctuary')
    expect(html).toContain('href="/home"')
  })
})
