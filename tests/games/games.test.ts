import { describe, it, expect } from 'vitest'
import { GAME_TEMPLATES } from '@/lib/games/data'
import { QUESTION_LIBRARY } from '@/lib/questions/data'

describe('Games & Intimate Question Library System', () => {
  it('covers required games categories', () => {
    const categories = ['couple_trivia', 'compatibility', 'would_you_rather', 'truth_or_dare']
    for (const cat of categories) {
      const match = GAME_TEMPLATES.find((g) => g.category === cat)
      expect(match, `Game category "${cat}" must be populated`).toBeDefined()
      expect(match?.questions.length).toBeGreaterThanOrEqual(4)
    }
  })

  it('question library spans all 8 intimacy and emotional inquiry domains', () => {
    const requiredCategories = [
      'funny',
      'romantic',
      'personal',
      'childhood',
      'intellectual',
      'hypothetical',
      'future',
      'intimacy',
    ]

    for (const cat of requiredCategories) {
      const matched = QUESTION_LIBRARY.filter((q) => q.category === cat)
      expect(matched.length, `Question domain "${cat}" must have questions`).toBeGreaterThanOrEqual(3)
    }
  })

  it('all questions have thoughtful, non-trivial prompts', () => {
    for (const q of QUESTION_LIBRARY) {
      expect(q.prompt.length).toBeGreaterThan(15)
      expect(q.prompt.endsWith('?') || q.prompt.includes(':')).toBe(true)
    }
  })
})
