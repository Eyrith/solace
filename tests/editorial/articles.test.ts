import { describe, it, expect } from 'vitest'
import { CURATED_ARTICLES, TOPIC_METADATA } from '@/lib/editorial/articles'
import { EDITORIAL_PUBLICATIONS } from '@/lib/editorial/sources'
import { FEED_SOURCES } from '@/lib/feeds/parser'

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

  it('feed source endpoints match official feeds', () => {
    expect(FEED_SOURCES.length).toBeGreaterThanOrEqual(4)
    const psyche = FEED_SOURCES.find((f) => f.sourceSlug === 'psyche')
    expect(psyche?.feedUrl).toBe('https://psyche.co/feed')
  })
})
