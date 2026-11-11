import { XMLParser } from 'fast-xml-parser'

export interface ParsedFeedItem {
  guid: string
  title: string
  link: string
  description: string
  author?: string
  publishedAt?: string
  category?: string
  readingTimeMin: number
}

export interface FeedSourceConfig {
  sourceSlug: string
  sourceName: string
  feedUrl: string
  defaultCategory: string
}

export const FEED_SOURCES: FeedSourceConfig[] = [
  {
    sourceSlug: 'psyche',
    sourceName: 'Psyche',
    feedUrl: 'https://psyche.co/feed',
    defaultCategory: 'psychology',
  },
  {
    sourceSlug: 'aeon',
    sourceName: 'Aeon',
    feedUrl: 'https://aeon.co/feed.rss',
    defaultCategory: 'philosophy',
  },
  {
    sourceSlug: 'greater-good',
    sourceName: 'Greater Good Magazine',
    feedUrl: 'https://greatergood.berkeley.edu/feeds/articles',
    defaultCategory: 'relationships',
  },
  {
    sourceSlug: 'marginalian',
    sourceName: 'The Marginalian',
    feedUrl: 'https://www.themarginalian.org/feed/',
    defaultCategory: 'literature',
  },
]

function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

function calculateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).length
  // Average reading speed: 200 words per minute
  return Math.max(3, Math.round(words / 200) || 7)
}

export async function fetchAndParseFeed(
  source: FeedSourceConfig
): Promise<ParsedFeedItem[]> {
  const response = await fetch(source.feedUrl, {
    headers: {
      'User-Agent': 'Commonplace-Editorial-Bot/1.0 (+https://example.com)',
      Accept: 'application/rss+xml, application/xml, text/xml',
    },
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch feed ${source.feedUrl}: ${response.statusText}`)
  }

  const xmlText = await response.text()
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  })

  const parsed = parser.parse(xmlText)
  const channel = parsed?.rss?.channel || parsed?.feed

  if (!channel) {
    throw new Error(`Malformed RSS feed for ${source.sourceSlug}`)
  }

  const rawItems = channel.item || channel.entry || []
  const items = Array.isArray(rawItems) ? rawItems : [rawItems]

  return items.map((item: any) => {
    const rawDesc = item.description || item.summary || item['content:encoded'] || ''
    const cleanDesc = stripHtml(typeof rawDesc === 'object' ? rawDesc['#text'] || '' : String(rawDesc))
    const excerpt = cleanDesc.slice(0, 320) + (cleanDesc.length > 320 ? '...' : '')

    const guid = String(
      (typeof item.guid === 'object' ? item.guid['#text'] : item.guid) ||
      item.id ||
      item.link ||
      item.title
    )

    const link = String(
      (typeof item.link === 'object' ? item.link['@_href'] || item.link['#text'] : item.link) || ''
    )

    const title = stripHtml(String(item.title || 'Untitled Essay'))

    const author =
      item['dc:creator'] ||
      item.author?.name ||
      (typeof item.author === 'string' ? item.author : source.sourceName)

    const pubDate = item.pubDate || item.published || item.updated

    return {
      guid,
      title,
      link,
      description: excerpt,
      author: String(author || source.sourceName),
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      category: source.defaultCategory,
      readingTimeMin: calculateReadingTime(cleanDesc),
    }
  })
}
