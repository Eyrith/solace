export interface QuestionItem {
  id: string
  category:
    | 'funny'
    | 'romantic'
    | 'personal'
    | 'childhood'
    | 'intellectual'
    | 'hypothetical'
    | 'future'
    | 'intimacy'
  prompt: string
  followUpPrompt?: string
}

export const QUESTION_LIBRARY: QuestionItem[] = [
  // ── FUNNY ──────────────────────────────────────────────────────────────────
  {
    id: 'fun-1',
    category: 'funny',
    prompt: 'If our life together were a low-budget sitcom, what would be our recurring running gag?',
  },
  {
    id: 'fun-2',
    category: 'funny',
    prompt: 'What is the absolute weirdest food combination that you secretly love eating when no one is watching?',
  },
  {
    id: 'fun-3',
    category: 'funny',
    prompt: 'If we were recruited for a heist, which one of us is getting caught first and what ridiculous mistake caused it?',
  },
  {
    id: 'fun-4',
    category: 'funny',
    prompt: 'What is an irrational, trivial pet peeve that you know makes zero sense, but drives you crazy anyway?',
  },

  // ── ROMANTIC ───────────────────────────────────────────────────────────────
  {
    id: 'rom-1',
    category: 'romantic',
    prompt: 'What was the exact moment or look from me that first made you realize you had feelings for me?',
  },
  {
    id: 'rom-2',
    category: 'romantic',
    prompt: 'If you had to describe the feeling of our relationship in three distinct sensory memories, what would they be?',
  },
  {
    id: 'rom-3',
    category: 'romantic',
    prompt: 'What is a quiet, unspoken gesture I do that always makes you feel deeply loved without saying a word?',
  },
  {
    id: 'rom-4',
    category: 'romantic',
    prompt: 'If we could freeze one exact hour from our past to relive whenever we want, which hour are you picking?',
  },

  // ── PERSONAL ───────────────────────────────────────────────────────────────
  {
    id: 'per-1',
    category: 'personal',
    prompt: 'What is an emotional insecurity you rarely talk about because you feel you should have outgrown it by now?',
  },
  {
    id: 'per-2',
    category: 'personal',
    prompt: 'How has your definition of a successful, peaceful life changed over the last three years?',
  },
  {
    id: 'per-3',
    category: 'personal',
    prompt: 'When you look at yourself in the mirror during quiet moments, what part of your heart are you proudest of?',
  },
  {
    id: 'per-4',
    category: 'personal',
    prompt: 'What is something you wish people understood about you without you having to explain it?',
  },

  // ── CHILDHOOD ──────────────────────────────────────────────────────────────
  {
    id: 'chi-1',
    category: 'childhood',
    prompt: 'What was your favourite safe hiding spot or comforting refuge when you were little?',
  },
  {
    id: 'chi-2',
    category: 'childhood',
    prompt: 'What was a belief or misconception you held as a young child that is hilarious to remember now?',
  },
  {
    id: 'chi-3',
    category: 'childhood',
    prompt: 'Who was the first teacher or adult outside your family that truly made you feel smart and worthy?',
  },

  // ── INTELLECTUAL ───────────────────────────────────────────────────────────
  {
    id: 'int-1',
    category: 'intellectual',
    prompt: 'Do you believe human beings are inherently wired for cooperation, or is empathy a fragile cultural achievement?',
  },
  {
    id: 'int-2',
    category: 'intellectual',
    prompt: 'If you could know the absolute, definitive truth to one unsolved mystery of the universe or history, what would you ask?',
  },
  {
    id: 'int-3',
    category: 'intellectual',
    prompt: 'What is an intellectual opinion or belief you used to hold passionately, but completely changed your mind about?',
  },

  // ── HYPOTHETICAL ───────────────────────────────────────────────────────────
  {
    id: 'hyp-1',
    category: 'hypothetical',
    prompt: 'If we could pause time for the rest of the world for 7 days, what would we do with those private 168 hours?',
  },
  {
    id: 'hyp-2',
    category: 'hypothetical',
    prompt: 'If we were given a small, secluded house anywhere on Earth where nobody could ever disturb us, where would it stand?',
  },
  {
    id: 'hyp-3',
    category: 'hypothetical',
    prompt: 'If you could download one master-level skill into your brain in an instant, what would you choose?',
  },

  // ── FUTURE ─────────────────────────────────────────────────────────────────
  {
    id: 'fut-1',
    category: 'future',
    prompt: 'When we are 70 years old, sitting on a porch watching the sunset, what do you think we will laugh about the most?',
  },
  {
    id: 'fut-2',
    category: 'future',
    prompt: 'What is a dream or project you want us to accomplish together that feels slightly terrifying but thrilling?',
  },
  {
    id: 'fut-3',
    category: 'future',
    prompt: 'What kind of home atmosphere do you want us to have ten years from now?',
  },

  // ── INTIMACY ───────────────────────────────────────────────────────────────
  {
    id: 'itm-1',
    category: 'intimacy',
    prompt: 'What is something sweet, subtle, or intimate you love when I do, but you’ve never specifically told me?',
  },
  {
    id: 'itm-2',
    category: 'intimacy',
    prompt: 'When during the day or week do you feel closest to me emotionally?',
  },
  {
    id: 'itm-3',
    category: 'intimacy',
    prompt: 'What does unconditional acceptance feel like in your body when we hold each other?',
  },
]
