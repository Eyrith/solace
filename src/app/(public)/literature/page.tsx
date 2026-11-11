import { CategoryView } from '@/components/editorial/category-view'

export const metadata = {
  title: 'Literature — Commonplace',
  description: 'Inquiries into poetic attention, diaries, fiction as psychological laboratory, and deep prose.',
}

export default function LiteraturePage() {
  return <CategoryView categoryKey="literature" />
}
