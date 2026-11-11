export interface EditorialPublication {
  id: string
  name: string
  slug: string
  tagline: string
  description: string
  websiteUrl: string
  accentColor: string
  topics: string[]
  foundedYear: number
  origin: string
  articleCount: number
}

export const EDITORIAL_PUBLICATIONS: EditorialPublication[] = [
  {
    id: 'pub-psyche',
    name: 'Psyche',
    slug: 'psyche',
    tagline: 'A digital magazine exploring the human condition',
    description:
      'Psyche is a digital magazine from Aeon Media that illuminates the human condition through psychology, philosophy, the arts, and social sciences. It explores how we understand ourselves and find meaning in modern life.',
    websiteUrl: 'https://psyche.co',
    accentColor: '#6B73A8',
    topics: ['Psychology', 'Self-knowledge', 'Emotional Well-being', 'Relationships'],
    foundedYear: 2020,
    origin: 'Melbourne & London',
    articleCount: 14,
  },
  {
    id: 'pub-aeon',
    name: 'Aeon',
    slug: 'aeon',
    tagline: 'A sanctuary for serious independent thinking',
    description:
      'Aeon is a premier digital magazine committed to broad thinking and intellectual inquiry. Publishing in-depth essays by leading philosophers, scientists, and scholars on deep existential and cultural questions.',
    websiteUrl: 'https://aeon.co',
    accentColor: '#1A1A2E',
    topics: ['Philosophy', 'Science', 'History', 'Society', 'Cosmology'],
    foundedYear: 2012,
    origin: 'London',
    articleCount: 16,
  },
  {
    id: 'pub-greater-good',
    name: 'Greater Good Magazine',
    slug: 'greater-good',
    tagline: 'Science-based insights for a meaningful life',
    description:
      'Produced by UC Berkeley’s Greater Good Science Center, this publication bridges scientific research and personal practice, exploring compassion, empathy, mindfulness, and healthy interpersonal bonds.',
    websiteUrl: 'https://greatergood.berkeley.edu',
    accentColor: '#4A7C59',
    topics: ['Relationships', 'Compassion', 'Empathy', 'Happiness', 'Parenting'],
    foundedYear: 2001,
    origin: 'Berkeley, California',
    articleCount: 12,
  },
  {
    id: 'pub-marginalian',
    name: 'The Marginalian',
    slug: 'marginalian',
    tagline: 'An inventory of meaningful cross-disciplinary wonder',
    description:
      'Founded by Maria Popova (formerly Brain Pickings), The Marginalian is a one-woman labour of love exploring literature, art, philosophy, poetry, and the timeless search for love, beauty, and truth.',
    websiteUrl: 'https://www.themarginalian.org',
    accentColor: '#8B5E3C',
    topics: ['Literature', 'Philosophy', 'Art', 'Poetry', 'Astronomy'],
    foundedYear: 2006,
    origin: 'Brooklyn, New York',
    articleCount: 15,
  },
  {
    id: 'pub-school-of-life',
    name: 'The School of Life',
    slug: 'school-of-life',
    tagline: 'Developing emotional intelligence for everyday living',
    description:
      'An educational collective devoted to helping people lead more fulfilled lives through psychological insight, self-compassion, philosophical clarity, and healthier human connections.',
    websiteUrl: 'https://www.theschooloflife.com',
    accentColor: '#C8A96E',
    topics: ['Relationships', 'Psychology', 'Self-reflection', 'Calm', 'Work'],
    foundedYear: 2008,
    origin: 'London',
    articleCount: 12,
  },
]
