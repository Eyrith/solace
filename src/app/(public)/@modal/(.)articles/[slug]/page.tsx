import React from 'react'
import { notFound } from 'next/navigation'
import { getArticleBySlug } from '@/lib/editorial/article-service'
import { ArticleModal } from '@/components/editorial/article-modal'

export const dynamic = 'force-dynamic'

interface InterceptedArticleModalProps {
  params: Promise<{ slug: string }>
}

export default async function InterceptedArticleModal({ params }: InterceptedArticleModalProps) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article || article.status !== 'published') {
    notFound()
  }

  return <ArticleModal article={article} />
}
