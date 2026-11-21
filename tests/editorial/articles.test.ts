import { describe, it, expect } from 'vitest'
import { CURATED_ARTICLES } from '@/lib/editorial/articles'
import { mergeEditorialArticles } from '@/lib/editorial/catalog'
import { EDITORIAL_PUBLICATIONS } from '@/lib/editorial/sources'

describe('Editorial Content & Attribution Integrity', () => {
  it('contains curated articles across all required categories', () => {
    const categories = ['psychology', 'relationships', 'philosophy', 'science', 'literature'] as const
    for (const cat of categories) {
      const match = CURATED_ARTICLES.filter((a) => a.category === cat)
      expect(match.length, `Category ${cat} should have at least 2 curated articles`).toBeGreaterThanOrEqual(2)
    }
  })

  it('all articles possess strict publisher attribution and outbound links', () => {
    for (const article of CURATED_ARTICLES) {
      expect(article.title.trim()).toBeTruthy()
      expect(article.author.trim()).toBeTruthy()
      expect(article.originalUrl.startsWith('http')).toBe(true)
      expect(article.description.length).toBeGreaterThan(20)
      expect(article.readingDurationMinutes).toBeGreaterThan(0)
    }
  })

  it('all official publications are represented with valid details', () => {
    const requiredPubSlugs = ['psyche', 'aeon', 'greater-good', 'marginalian', 'school-of-life']
    for (const slug of requiredPubSlugs) {
      const pub = EDITORIAL_PUBLICATIONS.find((p) => p.slug === slug)
      expect(pub, `Publication "${slug}" must exist in sources`).toBeDefined()
      expect(pub?.websiteUrl.startsWith('https://')).toBe(true)
    }
  })

  it('merges database articles ahead of fallback items and deduplicates by URL', () => {
    const sampleFallback = CURATED_ARTICLES.slice(0, 2)
    const duplicateFromDb = {
      ...sampleFallback[0],
      id: 'db-override-1',
      originalUrl: sampleFallback[0].originalUrl.toUpperCase(),
    }
    const merged = mergeEditorialArticles([duplicateFromDb], sampleFallback)
    expect(merged).toHaveLength(2)
    expect(merged[0].id).toBe('db-override-1')
    expect(merged[1].id).toBe(sampleFallback[1].id)
  })
})

