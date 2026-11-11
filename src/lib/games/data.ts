export interface GameTemplate {
  id: string
  title: string
  category:
    | 'couple_trivia'
    | 'compatibility'
    | 'would_you_rather'
    | 'guess_partner'
    | 'truth_or_dare'
    | 'personality'
  description: string
  icon: string
  durationMinutes: number
  questionCount: number
  questions: {
    id: string
    prompt: string
    options?: string[]
    type: 'choice' | 'free_text' | 'blind_guess'
  }[]
}

export const GAME_TEMPLATES: GameTemplate[] = [
  {
    id: 'game-trivia-01',
    title: 'How Well Do We Remember Us?',
    category: 'couple_trivia',
    description: 'Test your memory of first dates, quirks, favorite comforts, and quiet shared habits.',
    icon: '✨',
    durationMinutes: 6,
    questionCount: 5,
    questions: [
      {
        id: 'q1',
        prompt: 'What was the exact meal or drink we shared on our very first meaningful date?',
        type: 'free_text',
      },
      {
        id: 'q2',
        prompt: 'When I am having a rough day, what is the single comfort food or action that soothes me fastest?',
        type: 'free_text',
      },
      {
        id: 'q3',
        prompt: 'Which song or melody instantly transports you back to a specific moment with me?',
        type: 'free_text',
      },
      {
        id: 'q4',
        prompt: 'What is my most ridiculous, endearing everyday habit that always makes you smile?',
        type: 'free_text',
      },
      {
        id: 'q5',
        prompt: 'Where in the world were we when we shared our most unexpected, uncontrollable fit of laughter?',
        type: 'free_text',
      },
    ],
  },
  {
    id: 'game-wyr-01',
    title: 'Would You Rather: Intimate & Whimsical',
    category: 'would_you_rather',
    description: 'Choose between two sweet or absurd scenarios and compare your answers simultaneously.',
    icon: '⚖️',
    durationMinutes: 5,
    questionCount: 4,
    questions: [
      {
        id: 'wyr-1',
        prompt: 'Would you rather spend an entire rainy Sunday reading aloud in bed or baking an ambitious pastry together from scratch?',
        options: ['Reading aloud under warm blankets', 'Baking pastries in the warm kitchen'],
        type: 'choice',
      },
      {
        id: 'wyr-2',
        prompt: 'Would you rather receive a handwritten 4-page love letter or an unannounced surprise weekend getaway to a mountain cabin?',
        options: ['Handwritten 4-page love letter', 'Surprise mountain cabin weekend'],
        type: 'choice',
      },
      {
        id: 'wyr-3',
        prompt: 'Would you rather have a telepathic connection with each other for 1 hour or reliving our favorite day together on repeat for 24 hours?',
        options: ['Telepathic connection for 1 hour', 'Reliving our favorite day for 24 hours'],
        type: 'choice',
      },
      {
        id: 'wyr-4',
        prompt: 'Would you rather star-gaze in complete silence in the desert or have a 3 AM deep conversation over midnight tea?',
        options: ['Star-gaze in silent awe', '3 AM deep midnight tea conversation'],
        type: 'choice',
      },
    ],
  },
  {
    id: 'game-compat-01',
    title: 'Emotional Compatibility & Love Languages',
    category: 'compatibility',
    description: 'Explore how you each prefer to receive affection, handle disagreements, and recharge.',
    icon: '🕊️',
    durationMinutes: 8,
    questionCount: 4,
    questions: [
      {
        id: 'c1',
        prompt: 'When I feel misunderstood during a disagreement, the best thing you can do is:',
        options: [
          'Give me 10 minutes of quiet space, then return gently',
          'Hold my hands and reassure me you still love me first',
          'Ask thoughtful questions to help me articulate what I feel',
          'Make us a warm drink and suggest a fresh start',
        ],
        type: 'choice',
      },
      {
        id: 'c2',
        prompt: 'I feel most cherished and safe when you:',
        options: [
          'Notice small details about my day without me asking',
          'Give unhurried, gentle physical affection',
          'Tell me specifically why you admire who I am',
          'Take care of a stressful chore so I can rest',
        ],
        type: 'choice',
      },
      {
        id: 'c3',
        prompt: 'Our ideal low-stress Friday evening involves:',
        options: [
          'Zero devices, ambient jazz, and candlelit conversation',
          'Ordering our favorite comfort takeout and watching a thoughtful film',
          'A long twilight walk through quiet neighborhoods',
          'Cooking an elaborate dinner together with wine or tea',
        ],
        type: 'choice',
      },
      {
        id: 'c4',
        prompt: 'The highest virtue in our shared relationship is:',
        options: [
          'Emotional honesty without fear of judgement',
          'Unconditional loyalty and dependability',
          'Playful laughter and keeping life lighthearted',
          'Mutual growth and inspiring each other',
        ],
        type: 'choice',
      },
    ],
  },
  {
    id: 'game-tod-01',
    title: 'Truth or Dare: Tender & Playful',
    category: 'truth_or_dare',
    description: 'A gentle mix of honest vulnerability and delightful intimate dares.',
    icon: '🎲',
    durationMinutes: 10,
    questionCount: 4,
    questions: [
      {
        id: 'tod-1',
        prompt: 'Truth: What was the exact moment you realized you had completely fallen for me?',
        type: 'free_text',
      },
      {
        id: 'tod-2',
        prompt: 'Dare: Send a 15-second voice note describing 3 physical details about me that take your breath away.',
        type: 'free_text',
      },
      {
        id: 'tod-3',
        prompt: 'Truth: What is one secret romantic fantasy or dream trip you’ve been shy to mention?',
        type: 'free_text',
      },
      {
        id: 'tod-4',
        prompt: 'Dare: Close your eyes right now for 30 seconds and write the first sentence that comes to your mind when you think of us.',
        type: 'free_text',
      },
    ],
  },
]
