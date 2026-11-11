import { CategoryView } from '@/components/editorial/category-view'

export const metadata = {
  title: 'Philosophy — Commonplace',
  description: 'Inquiries into Stoicism, existentialism, moral attention, and ancient wisdom.',
}

export default function PhilosophyPage() {
  return <CategoryView categoryKey="philosophy" />
}

