import React from 'react'
import { notFound } from 'next/navigation'
import { EditorialEditor } from '@/components/editorial/editorial-editor'
import { getArticleByIdOrSlug, getCategories } from '@/lib/editorial/article-service'

export const dynamic = 'force-dynamic'

interface EditArticlePageProps {
  params: Promise<{ id: string }>
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  const { id } = await params
  const [categories, article] = await Promise.all([
    getCategories(),
    getArticleByIdOrSlug(id),
  ])

  if (!article) {
    notFound()
  }

  return <EditorialEditor initialArticle={article} categories={categories} />
}
