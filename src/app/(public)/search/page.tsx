import { permanentRedirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface SearchPageProps {
  searchParams: Promise<{ q?: string; category?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, category } = await searchParams
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (category) params.set('category', category)
  const qs = params.toString()

  permanentRedirect(qs ? `/discover?${qs}` : '/discover')
}
