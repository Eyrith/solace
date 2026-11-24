'use server'

import { revalidatePath } from 'next/cache'
import {
  saveArticle,
  deleteArticle,
  type SaveArticleInput,
} from '@/lib/editorial/article-service'

export async function saveArticleAction(input: SaveArticleInput) {
  const result = await saveArticle(input)
  if (result.success && result.article) {
    revalidatePath('/discover')
    revalidatePath('/studio/editorial')
    revalidatePath(`/articles/${result.article.slug}`)
  }
  return result
}

export async function publishArticleAction(id: string) {
  const result = await saveArticle({
    id,
    title: '', // will be untouched by selective update or fetched
    content: '',
    status: 'published',
  })
  revalidatePath('/discover')
  revalidatePath('/studio/editorial')
  return result
}

export async function deleteArticleAction(id: string) {
  const result = await deleteArticle(id)
  if (result.success) {
    revalidatePath('/discover')
    revalidatePath('/studio/editorial')
  }
  return result
}
