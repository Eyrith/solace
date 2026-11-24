export type ArticleStatus = 'draft' | 'published' | 'archived'

export interface ArticleCategory {
  id: string
  name: string
  slug: string
  description?: string | null
  displayOrder: number
}

export interface ArticleCitation {
  id: string
  articleId: string
  citationOrder: number
  prefix?: string | null
  sourceTitle: string
  authorName?: string | null
  publicationYear?: number | null
  url?: string | null
  doi?: string | null
}

export interface ArticleTag {
  id: string
  name: string
  slug: string
}

export interface ArticleAuthor {
  id: string
  displayName?: string | null
  avatarUrl?: string | null
  bio?: string | null
}

export interface Article {
  id: string
  slug: string
  title: string
  subtitle?: string | null
  excerpt?: string | null
  content: string // Full Markdown body
  contentHtml?: string | null
  coverImageUrl?: string | null
  categoryId?: string | null
  category?: ArticleCategory | null
  authorId?: string | null
  author?: ArticleAuthor | null
  status: ArticleStatus
  readingTimeMinutes: number
  isFeatured: boolean
  publishedAt?: string | null
  createdAt: string
  updatedAt: string
  citations?: ArticleCitation[]
  tags?: ArticleTag[]
}

export interface ArticleRevision {
  id: string
  articleId: string
  title: string
  subtitle?: string | null
  content: string
  revisedBy?: string | null
  revisionNumber: number
  createdAt: string
}

export interface ReadingProgress {
  userId: string
  articleId: string
  scrollPercentage: number
  isCompleted: boolean
  completedAt?: string | null
  lastReadAt: string
}
