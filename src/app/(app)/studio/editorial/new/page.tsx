import React from 'react'
import { EditorialEditor } from '@/components/editorial/editorial-editor'
import { getCategories } from '@/lib/editorial/article-service'

export const dynamic = 'force-dynamic'

export default async function NewEditorialArticlePage() {
  const categories = await getCategories()

  return <EditorialEditor categories={categories} />
}
