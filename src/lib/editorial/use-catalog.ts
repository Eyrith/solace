'use client'

import { useEffect, useState } from 'react'
import { CURATED_ARTICLES, type CuratedArticle } from '@/lib/editorial/articles'
import { mergeEditorialArticles } from '@/lib/editorial/catalog'
import { isSupabaseClientConfigured } from '@/lib/supabase/client'

export function useEditorialCatalog() {
  const [articles, setArticles] = useState<CuratedArticle[]>(CURATED_ARTICLES)
  const [loaded, setLoaded] = useState(() => !isSupabaseClientConfigured())

  useEffect(() => {
    if (!isSupabaseClientConfigured()) return
    let active = true
    fetch('/api/editorial/articles?limit=100', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active) return
        if (Array.isArray(payload?.articles) && payload.articles.length > 0) {
          setArticles(mergeEditorialArticles(payload.articles as CuratedArticle[], CURATED_ARTICLES))
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  return { articles, loaded }
}
