import { CategoryView } from '@/components/editorial/category-view'

export const metadata = {
  title: 'Science',
  description: 'Inquiries into physiology of calm, neuroscience of awe, and living ecological networks.',
}

export default function SciencePage() {
  return <CategoryView categoryKey="science" />
}

