import { createClient } from '@/lib/supabase/server'
import { staticCategoryCache, articleQueryCache } from '@/lib/cache/lru-cache'
import { SEED_ARTICLES, SEED_CATEGORIES } from './first-party-seed'
import { CURATED_ARTICLES, type CuratedArticle, getArticleImage, generateSlug } from './articles'
export { generateSlug }
import type { Article, ArticleCategory, ArticleStatus, ArticleCitation } from './types'

export function mapCuratedToArticle(c: CuratedArticle): Article {
  const img = getArticleImage(c)
  return {
    id: c.id,
    slug: generateSlug(c.title),
    title: c.title,
    subtitle: c.description,
    excerpt: c.keyTakeaway || c.description,
    content: `# ${c.title}\n\n*By ${c.author} (${c.authorRole || c.publicationName})*\n\n${c.description}\n\n> "${c.keyTakeaway || c.description}"\n\n### The Human Dimension\n\nIn our hurried modern landscape, deliberate contemplation is often discarded in favor of reactive speed. Yet across literature, philosophy, and psychology, every significant insight into the human condition begins with the willingness to step back and examine the interior life with honesty.\n\n${c.description}\n\n> "True freedom begins when we differentiate between what we desire to possess and who we wish to be."\n\n### Inquiries for Reflection\n\n- How does this insight resonate with your private emotional landscape?\n- Where do you notice this dynamic playing out in your closest relationships?\n- What quiet adjustment in perspective might bring greater clarity?\n\n---\n*Originally curated from [${c.publicationName}](${c.originalUrl}).*`,
    coverImageUrl: img.lead,
    status: 'published',
    readingTimeMinutes: c.readingDurationMinutes,
    isFeatured: Boolean(c.isFeatured),
    publishedAt: c.publishedDate,
    createdAt: c.publishedDate,
    updatedAt: c.publishedDate,
    category: {
      id: `cat-${c.category}`,
      name: c.category.charAt(0).toUpperCase() + c.category.slice(1),
      slug: c.category,
      displayOrder: 1,
    },
    author: {
      id: `author-${c.author.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      displayName: c.author,
      bio: c.authorRole || c.publicationName,
    },
    tags: c.tags.map((t) => ({
      id: `tag-${t.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: t,
      slug: t.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    })),
  }
}

export function calculateReadingTime(content: string): number {
  if (!content) return 1
  const wordCount = content.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(wordCount / 200))
}

export interface GetArticlesOptions {
  categorySlug?: string
  status?: ArticleStatus
  tagSlug?: string
  query?: string
  limit?: number
  offset?: number
  featuredOnly?: boolean
}

export async function getCategories(): Promise<ArticleCategory[]> {
  return staticCategoryCache.getOrSet('all_categories', async () => {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('article_categories')
        .select('id, name, slug, description, display_order')
        .order('display_order', { ascending: true })

      if (error || !data || data.length === 0) {
        return SEED_CATEGORIES
      }

      return data.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        displayOrder: c.display_order,
      }))
    } catch {
      return SEED_CATEGORIES
    }
  }, 15 * 60 * 1000)
}

export async function getArticles(options: GetArticlesOptions = {}): Promise<Article[]> {
  const { categorySlug, status = 'published', query, limit = 20, offset = 0, featuredOnly } = options

  try {
    const supabase = await createClient()
    let q = supabase
      .from('articles')
      .select(`
        id,
        slug,
        title,
        subtitle,
        excerpt,
        content,
        content_html,
        cover_image_url,
        category_id,
        author_id,
        status,
        reading_time_minutes,
        is_featured,
        published_at,
        created_at,
        updated_at,
        category:article_categories(id, name, slug, description, display_order),
        author:profiles(id, display_name, avatar_url, bio),
        citations:article_citations(id, article_id, citation_order, source_title, author_name, publication_year, url, doi)
      `)
      .eq('status', status)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (featuredOnly) {
      q = q.eq('is_featured', true)
    }

    if (categorySlug) {
      const catId = await staticCategoryCache.getOrSet(`cat_id:${categorySlug}`, async () => {
        const { data: cat } = await supabase
          .from('article_categories')
          .select('id')
          .eq('slug', categorySlug)
          .single()
        return cat?.id ?? null
      }, 15 * 60 * 1000)

      if (catId) {
        q = q.eq('category_id', catId)
      }
    }

    if (query && query.trim()) {
      q = q.ilike('title', `%${query.trim()}%`)
    }

    const { data, error } = await q

    if (error || !data || data.length === 0) {
      // Fallback to local seeds
      let filtered = SEED_ARTICLES.filter((a) => a.status === status)
      if (categorySlug) {
        filtered = filtered.filter((a) => a.category?.slug === categorySlug)
      }
      if (featuredOnly) {
        filtered = filtered.filter((a) => a.isFeatured)
      }
      if (query && query.trim()) {
        const lower = query.toLowerCase()
        filtered = filtered.filter(
          (a) => a.title.toLowerCase().includes(lower) || a.excerpt?.toLowerCase().includes(lower)
        )
      }
      return filtered.slice(offset, offset + limit)
    }

    return data.map((row: any) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,
      excerpt: row.excerpt,
      content: row.content,
      contentHtml: row.content_html,
      coverImageUrl: row.cover_image_url,
      categoryId: row.category_id,
      category: row.category
        ? {
            id: row.category.id,
            name: row.category.name,
            slug: row.category.slug,
            description: row.category.description,
            displayOrder: row.category.display_order,
          }
        : null,
      authorId: row.author_id,
      author: row.author
        ? {
            id: row.author.id,
            displayName: row.author.display_name,
            avatarUrl: row.author.avatar_url,
            bio: row.author.bio,
          }
        : null,
      status: row.status,
      readingTimeMinutes: row.reading_time_minutes,
      isFeatured: row.is_featured,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      citations: (row.citations || []).map((c: any) => ({
        id: c.id,
        articleId: c.article_id,
        citationOrder: c.citation_order,
        sourceTitle: c.source_title,
        authorName: c.author_name,
        publicationYear: c.publication_year,
        url: c.url,
        doi: c.doi,
      })),
    }))
  } catch {
    const all = [...SEED_ARTICLES, ...CURATED_ARTICLES.map(mapCuratedToArticle)]
    let filtered = all.filter((a) => a.status === status)
    if (categorySlug) {
      filtered = filtered.filter((a) => a.category?.slug === categorySlug)
    }
    if (featuredOnly) {
      filtered = filtered.filter((a) => a.isFeatured)
    }
    if (query && query.trim()) {
      const lower = query.toLowerCase()
      filtered = filtered.filter(
        (a) => a.title.toLowerCase().includes(lower) || a.excerpt?.toLowerCase().includes(lower)
      )
    }
    return filtered.slice(offset, offset + limit)
  }
}

export async function getArticleByIdOrSlug(identifier: string): Promise<Article | null> {
  return articleQueryCache.getOrSet(`article:${identifier}`, async () => {
    try {
      const supabase = await createClient()
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)

      let query = supabase
        .from('articles')
        .select(`
          id,
          slug,
          title,
          subtitle,
          excerpt,
          content,
          content_html,
          cover_image_url,
          category_id,
          author_id,
          status,
          reading_time_minutes,
          is_featured,
          published_at,
          created_at,
          updated_at,
          category:article_categories(id, name, slug, description, display_order),
          author:profiles(id, display_name, avatar_url, bio),
          citations:article_citations(id, article_id, citation_order, source_title, author_name, publication_year, url, doi)
        `)

      if (isUuid) {
        query = query.eq('id', identifier)
      } else {
        query = query.eq('slug', identifier)
      }

      const { data, error } = await query.maybeSingle()

      if (error || !data) {
        const match = SEED_ARTICLES.find((a) => a.id === identifier || a.slug === identifier)
        if (match) return match
        const curated = CURATED_ARTICLES.find(
          (c) => c.id === identifier || generateSlug(c.title) === identifier,
        )
        if (curated) return mapCuratedToArticle(curated)
        return null
      }

      return {
        id: data.id,
        slug: data.slug,
        title: data.title,
        subtitle: data.subtitle,
        excerpt: data.excerpt,
        content: data.content,
        contentHtml: data.content_html,
        coverImageUrl: data.cover_image_url,
        categoryId: data.category_id,
        category: (data as any).category
          ? {
              id: (data as any).category.id,
              name: (data as any).category.name,
              slug: (data as any).category.slug,
              description: (data as any).category.description,
              displayOrder: (data as any).category.display_order,
            }
          : null,
        authorId: data.author_id,
        author: (data as any).author
          ? {
              id: (data as any).author.id,
              displayName: (data as any).author.display_name,
              avatarUrl: (data as any).author.avatar_url,
              bio: (data as any).author.bio,
            }
          : null,
        status: data.status,
        readingTimeMinutes: data.reading_time_minutes,
        isFeatured: data.is_featured,
        publishedAt: data.published_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        citations: ((data as any).citations || []).map((c: any) => ({
          id: c.id,
          articleId: c.article_id,
          citationOrder: c.citation_order,
          sourceTitle: c.source_title,
          authorName: c.author_name,
          publicationYear: c.publication_year,
          url: c.url,
          doi: c.doi,
        })),
      }
    } catch {
      const match = SEED_ARTICLES.find((a) => a.id === identifier || a.slug === identifier)
      if (match) return match
      const curated = CURATED_ARTICLES.find(
        (c) => c.id === identifier || generateSlug(c.title) === identifier,
      )
      if (curated) return mapCuratedToArticle(curated)
      return null
    }
  }, 5 * 60 * 1000)
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  return getArticleByIdOrSlug(slug)
}

export interface SaveArticleInput {
  id?: string
  title: string
  subtitle?: string
  slug?: string
  excerpt?: string
  content: string
  categoryId?: string
  status?: ArticleStatus
  coverImageUrl?: string
  isFeatured?: boolean
  citations?: Omit<ArticleCitation, 'id' | 'articleId'>[]
}

export async function saveArticle(input: SaveArticleInput): Promise<{ success: boolean; article?: Article; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id

    const slug = input.slug || generateSlug(input.title)
    const readingTimeMinutes = calculateReadingTime(input.content)
    const now = new Date().toISOString()

    const articlePayload: any = {
      title: input.title,
      subtitle: input.subtitle || null,
      slug,
      excerpt: input.excerpt || null,
      content: input.content,
      category_id: input.categoryId || null,
      status: input.status || 'draft',
      cover_image_url: input.coverImageUrl || null,
      is_featured: Boolean(input.isFeatured),
      reading_time_minutes: readingTimeMinutes,
      updated_at: now,
    }

    if (input.status === 'published') {
      articlePayload.published_at = now
    }

    if (userId) {
      articlePayload.author_id = userId
    }

    let articleId = input.id

    if (articleId) {
      const { data, error } = await supabase
        .from('articles')
        .update(articlePayload)
        .eq('id', articleId)
        .select()
        .single()

      if (error) return { success: false, error: error.message }
      articleId = data.id
    } else {
      const { data, error } = await supabase
        .from('articles')
        .insert(articlePayload)
        .select()
        .single()

      if (error) return { success: false, error: error.message }
      articleId = data.id
    }

    // Save citations if provided
    if (input.citations && input.citations.length > 0 && articleId) {
      await supabase.from('article_citations').delete().eq('article_id', articleId)
      const citationRows = input.citations.map((c, idx) => ({
        article_id: articleId,
        citation_order: idx + 1,
        source_title: c.sourceTitle,
        author_name: c.authorName || null,
        publication_year: c.publicationYear || null,
        url: c.url || null,
        doi: c.doi || null,
      }))
      await supabase.from('article_citations').insert(citationRows)
    }

    const saved = await getArticleBySlug(slug)
    return { success: true, article: saved || undefined }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save article' }
  }
}

export async function deleteArticle(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('articles').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete article' }
  }
}
