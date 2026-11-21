import { CURATED_ARTICLES, type CuratedArticle } from '@/lib/editorial/articles'
import { EDITORIAL_PUBLICATIONS } from '@/lib/editorial/sources'

const VALID_PUB_SLUGS = new Set<string>(EDITORIAL_PUBLICATIONS.map((p) => p.slug))
const VALID_CATEGORIES = new Set<string>([
  'psychology',
  'relationships',
  'philosophy',
  'science',
  'literature',
])

export function mergeEditorialArticles(
  dbArticles: CuratedArticle[],
  fallbackArticles: CuratedArticle[] = CURATED_ARTICLES,
): CuratedArticle[] {
  if (!dbArticles.length) return fallbackArticles
  const seenUrls = new Set(dbArticles.map((a) => a.originalUrl.trim().toLowerCase()))
  const extras = fallbackArticles.filter(
    (a) => !seenUrls.has(a.originalUrl.trim().toLowerCase()),
  )
  return [...dbArticles, ...extras]
}

interface SupabaseArticleRow {
  id: string
  source_id: string
  title: string
  author?: string | null
  excerpt?: string | null
  original_url: string
  category?: string | null
  tags?: string[] | null
  reading_time_min?: number | null
  published_at?: string | null
  ingested_at?: string | null
}

interface SupabaseSourceRow {
  id: string
  name: string
  slug: string
}

/**
 * Fetches public editorial essays from Supabase PostgREST when configured and merges
 * with curated fallback essays so public pages stay rich both before and after RSS sync.
 */
export async function getEditorialCatalog(options?: {
  category?: string
  publicationSlug?: string
}): Promise<CuratedArticle[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let dbArticles: CuratedArticle[] = []

  if (
    url &&
    anonKey &&
    !url.includes('placeholder-project') &&
    !anonKey.includes('placeholder')
  ) {
    try {
      const headers: Record<string, string> = {
        apikey: anonKey,
      }
      if (!anonKey.startsWith('sb_')) {
        headers.Authorization = `Bearer ${anonKey}`
      }
      const [sourcesRes, articlesRes] = await Promise.all([
        fetch(
          `${url.replace(/\/$/, '')}/rest/v1/editorial_sources?select=id,name,slug&is_active=eq.true`,
          { headers, next: { revalidate: 300 } },
        ),
        fetch(
          `${url.replace(/\/$/, '')}/rest/v1/editorial_articles?select=id,source_id,title,author,excerpt,original_url,category,tags,reading_time_min,published_at,ingested_at&order=published_at.desc.nullslast,ingested_at.desc&limit=100`,
          { headers, next: { revalidate: 300 } },
        ),
      ])

      if (sourcesRes.ok && articlesRes.ok) {
        const sources = (await sourcesRes.json()) as SupabaseSourceRow[]
        const rows = (await articlesRes.json()) as SupabaseArticleRow[]
        const sourceById = new Map(sources.map((s) => [s.id, s]))

        dbArticles = rows.map((row, idx) => {
          const src = sourceById.get(row.source_id)
          const rawSlug = src?.slug ?? 'psyche'
          const publicationSlug = (
            VALID_PUB_SLUGS.has(rawSlug) ? rawSlug : 'psyche'
          ) as CuratedArticle['publicationSlug']
          const rawCategory = row.category ?? 'psychology'
          const category = (
            VALID_CATEGORIES.has(rawCategory) ? rawCategory : 'psychology'
          ) as CuratedArticle['category']
          const dateStr = (row.published_at || row.ingested_at || '2025-01-01').slice(0, 10)

          return {
            id: row.id,
            title: row.title,
            author: row.author || src?.name || 'Editorial Contributor',
            publicationSlug,
            publicationName: src?.name || 'Commonplace',
            publishedDate: dateStr,
            category,
            readingDurationMinutes: Math.max(1, Number(row.reading_time_min || 6)),
            description: row.excerpt || '',
            originalUrl: row.original_url,
            tags: Array.isArray(row.tags) ? row.tags : [],
            isFeatured: idx < 2,
            coverPattern: 'minimal',
          }
        })
      }
    } catch {
      // Fallback cleanly to CURATED_ARTICLES if Supabase is unreachable
    }
  }

  let merged = mergeEditorialArticles(dbArticles, CURATED_ARTICLES)
  if (options?.category && options.category !== 'all') {
    merged = merged.filter((a) => a.category === options.category)
  }
  if (options?.publicationSlug && options.publicationSlug !== 'all') {
    merged = merged.filter((a) => a.publicationSlug === options.publicationSlug)
  }
  return merged
}

