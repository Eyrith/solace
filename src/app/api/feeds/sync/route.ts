import { NextResponse, type NextRequest } from 'next/server'
import { FEED_SOURCES, fetchAndParseFeed } from '@/lib/feeds/parser'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // 1. Verify cron secret / authorization
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, { status: string; count?: number; error?: string }> = {}

  for (const source of FEED_SOURCES) {
    try {
      const items = await fetchAndParseFeed(source)
      results[source.sourceSlug] = { status: 'success', count: items.length }

      // If Supabase service client is configured, upsert into editorial_articles
      if (
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
      ) {
        const supabase = createServiceClient()

        // Get source_id for this publication
        const { data: sourceData } = await supabase
          .from('editorial_sources')
          .select('id')
          .eq('slug', source.sourceSlug)
          .single()

        if (sourceData) {
          const rowsToUpsert = items.map((item) => ({
            source_id: sourceData.id,
            external_id: item.guid,
            title: item.title,
            author: item.author,
            excerpt: item.description,
            original_url: item.link,
            category: item.category,
            reading_time_min: item.readingTimeMin,
            published_at: item.publishedAt,
          }))

          await supabase.from('editorial_articles').upsert(rowsToUpsert, {
            onConflict: 'source_id,external_id',
            ignoreDuplicates: false,
          })

          await supabase
            .from('editorial_sources')
            .update({ last_synced: new Date().toISOString() })
            .eq('id', sourceData.id)
        }
      }
    } catch (err: any) {
      results[source.sourceSlug] = { status: 'failed', error: err?.message || 'Parse error' }
    }
  }

  return NextResponse.json({
    syncedAt: new Date().toISOString(),
    results,
  })
}

