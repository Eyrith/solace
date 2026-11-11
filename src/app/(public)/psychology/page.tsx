import { CategoryView } from '@/components/editorial/category-view'

export const metadata = {
  title: 'Psychology — Commonplace',
  description: 'Inquiries into emotion, self-compassion, cognitive habits, and inner calm.',
}

export default function PsychologyPage() {
  return <CategoryView categoryKey="psychology" />
}
