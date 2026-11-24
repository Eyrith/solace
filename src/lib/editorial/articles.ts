export interface CuratedArticle {
  id: string
  title: string
  author: string
  authorRole?: string
  publicationSlug: 'psyche' | 'aeon' | 'greater-good' | 'marginalian' | 'school-of-life'
  publicationName: string
  publishedDate: string
  category: 'psychology' | 'relationships' | 'philosophy' | 'science' | 'literature'
  readingDurationMinutes: number
  description: string
  keyTakeaway?: string
  originalUrl: string
  tags: string[]
  isFeatured?: boolean
  coverPattern?: 'geometry' | 'subtle-lines' | 'monolith' | 'botanical' | 'minimal'
  image?: string
  imageAlt?: string
  imageCredit?: string
}

export interface ArticleImageAsset {
  lead: string
  card: string
  thumb: string
  alt: string
  credit: string
}

export const CATEGORY_IMAGE_MAP: Record<string, ArticleImageAsset> = {
  psychology: {
    lead: '/editorial/psychology-1600.webp',
    card: '/editorial/psychology-800.webp',
    thumb: '/editorial/psychology-640.webp',
    alt: 'Peaceful morning light and mindful contemplation',
    credit: 'Photo by Jared Rice on Unsplash',
  },
  relationships: {
    lead: '/editorial/relationships-1600.webp',
    card: '/editorial/relationships-800.webp',
    thumb: '/editorial/relationships-640.webp',
    alt: 'Two people sharing quiet connection along a scenic landscape',
    credit: 'Photo by Joanna Nix-Walkup on Unsplash',
  },
  philosophy: {
    lead: '/editorial/philosophy-1600.webp',
    card: '/editorial/philosophy-800.webp',
    thumb: '/editorial/philosophy-640.webp',
    alt: 'Classical stone columns and morning shadows in quiet cloister',
    credit: 'Photo by Mitchell Orr on Unsplash',
  },
  science: {
    lead: '/editorial/science-1600.webp',
    card: '/editorial/science-800.webp',
    thumb: '/editorial/science-640.webp',
    alt: 'Starry night sky and cosmos viewed above quiet mountain forest',
    credit: 'Photo by Vincentiu Solomon on Unsplash',
  },
  literature: {
    lead: '/editorial/literature-1600.webp',
    card: '/editorial/literature-800.webp',
    thumb: '/editorial/literature-640.webp',
    alt: 'Open pages of a literature volume on a wooden reading desk',
    credit: 'Photo by Patrick Tomasso on Unsplash',
  },
}

export interface ArticleImageQuery {
  image?: string | null
  imageAlt?: string | null
  coverImageUrl?: string | null
  title?: string | null
  category?: string | { slug?: string; name?: string } | null
  imageCredit?: string | null
}

export function getArticleImage(article: ArticleImageQuery): ArticleImageAsset {
  if (article.image) {
    return {
      lead: article.image,
      card: article.image,
      thumb: article.image,
      alt: article.imageAlt || article.title || 'Editorial article cover',
      credit: article.imageCredit || 'Unsplash License',
    }
  }
  if (article.coverImageUrl) {
    return {
      lead: article.coverImageUrl,
      card: article.coverImageUrl,
      thumb: article.coverImageUrl,
      alt: article.imageAlt || article.title || 'Editorial article cover',
      credit: article.imageCredit || 'Unsplash License',
    }
  }
  const rawCat =
    typeof article.category === 'object' && article.category
      ? article.category.slug || article.category.name
      : article.category
  const cat = (rawCat || 'literature').toLowerCase()
  return (
    CATEGORY_IMAGE_MAP[cat] || {
      lead: '/editorial/lead-hero-1600.webp',
      card: '/editorial/lead-hero-800.webp',
      thumb: '/editorial/lead-hero-640.webp',
      alt: 'Editorial photograph',
      credit: 'Photo by Alex Perez on Unsplash',
    }
  )
}

export const CURATED_ARTICLES: CuratedArticle[] = [
  // ── PSYCHOLOGY ─────────────────────────────────────────────────────────────
  {
    id: 'psy-01',
    title: 'The Art of Being Gentle with Yourself When You Feel Unseen',
    author: 'Kristin Neff, PhD',
    authorRole: 'Associate Professor of Educational Psychology, UT Austin',
    publicationSlug: 'greater-good',
    publicationName: 'Greater Good Magazine',
    publishedDate: '2025-02-14',
    category: 'psychology',
    readingDurationMinutes: 8,
    description:
      'Why harsh self-criticism consistently fails to build resilience, and how intentional self-compassion activates our neural soothing system, buffering us against anxiety and shame.',
    keyTakeaway: 'Self-compassion is not self-indulgence; it is the physiological prerequisite for emotional courage.',
    originalUrl: 'https://greatergood.berkeley.edu/article/item/the_three_components_of_self_compassion',
    tags: ['Self-Compassion', 'Resilience', 'Mindfulness', 'Neuroscience'],
    isFeatured: true,
    coverPattern: 'botanical',
  },
  {
    id: 'psy-02',
    title: 'Why It Is So Hard to Know What We Really Want',
    author: 'Alain de Botton',
    authorRole: 'Author & Founder, The School of Life',
    publicationSlug: 'school-of-life',
    publicationName: 'The School of Life',
    publishedDate: '2024-11-20',
    category: 'psychology',
    readingDurationMinutes: 7,
    description:
      'We imagine our desires are authentic and spontaneous, yet most of what we yearn for is quietly suggested to us by societal scripts and early childhood reassurance.',
    keyTakeaway: 'True freedom begins when we differentiate between what we desire to possess and who we wish to be.',
    originalUrl: 'https://www.theschooloflife.com/article/why-it-is-so-hard-to-know-what-we-want/',
    tags: ['Desire', 'Introspection', 'Childhood', 'Authenticity'],
    isFeatured: false,
    coverPattern: 'geometry',
  },
  {
    id: 'psy-03',
    title: 'The Emotional Burden of Always Having to Be the Strong One',
    author: 'Eleanor Longden',
    authorRole: 'Research Psychologist & Mental Health Advocate',
    publicationSlug: 'psyche',
    publicationName: 'Psyche',
    publishedDate: '2025-01-08',
    category: 'psychology',
    readingDurationMinutes: 10,
    description:
      'Hyper-independence is rarely a sign of strength; more often, it is a trauma response born from early experiences of having no one reliable to lean on.',
    keyTakeaway: 'Allowing yourself to be vulnerable is not weakness, but the courage to surrender control.',
    originalUrl: 'https://psyche.co/ideas/hyper-independence-can-be-a-response-to-childhood-emotional-neglect',
    tags: ['Vulnerability', 'Trauma', 'Emotional Health', 'Attachment'],
    isFeatured: true,
    coverPattern: 'monolith',
  },
  {
    id: 'psy-04',
    title: 'How Subconscious Rumination Steals Our Peace of Mind',
    author: 'Edward Watkins',
    authorRole: 'Professor of Experimental and Applied Clinical Psychology',
    publicationSlug: 'aeon',
    publicationName: 'Aeon',
    publishedDate: '2024-09-12',
    category: 'psychology',
    readingDurationMinutes: 13,
    description:
      'Repetitive negative thinking tricks us into feeling as though we are solving problems, while actually locking the nervous system into persistent fight-or-flight.',
    keyTakeaway: 'Shift from asking "Why did this happen to me?" to "What concrete step can I take right now?"',
    originalUrl: 'https://aeon.co/essays/how-to-escape-the-labyrinth-of-depressive-rumination',
    tags: ['Cognitive Psychology', 'Rumination', 'Depression', 'Mental Clarity'],
    isFeatured: false,
    coverPattern: 'subtle-lines',
  },

  // ── RELATIONSHIPS ──────────────────────────────────────────────────────────
  {
    id: 'rel-01',
    title: 'The Psychology of De-Escalating Arguments with the One You Love',
    author: 'John Gottman, PhD & Julie Schwartz Gottman, PhD',
    authorRole: 'Founders of The Gottman Institute',
    publicationSlug: 'greater-good',
    publicationName: 'Greater Good Magazine',
    publishedDate: '2025-01-22',
    category: 'relationships',
    readingDurationMinutes: 9,
    description:
      'Couples don’t separate because they disagree; they drift apart because during conflict, physiological arousal blinds them to repair attempts. Here is the science of gentle start-ups.',
    keyTakeaway: 'Small repair attempts made with soft words can prevent 90% of destructive relationship escalation.',
    originalUrl: 'https://greatergood.berkeley.edu/article/item/how_to_repair_after_a_fight_with_your_partner',
    tags: ['Conflict Resolution', 'Intimacy', 'Communication', 'Emotional Safety'],
    isFeatured: true,
    coverPattern: 'botanical',
  },
  {
    id: 'rel-02',
    title: 'On the Necessity of Forgiving Your Partner’s Ordinary Flaws',
    author: 'The School of Life Editorial Staff',
    authorRole: 'Department of Emotional Education',
    publicationSlug: 'school-of-life',
    publicationName: 'The School of Life',
    publishedDate: '2024-12-05',
    category: 'relationships',
    readingDurationMinutes: 6,
    description:
      'Romance promises effortless harmony, but mature love is essentially an exercise in mutual education, patience, and laughing at the absurdity of our mutual imperfections.',
    keyTakeaway: 'Love is not the absence of annoyance, but the willingness to interpret irritation with generous benevolence.',
    originalUrl: 'https://www.theschooloflife.com/article/how-to-survive-your-partners-flaws/',
    tags: ['Romantic Realism', 'Forgiveness', 'Patience', 'Long-term Love'],
    isFeatured: false,
    coverPattern: 'minimal',
  },
  {
    id: 'rel-03',
    title: 'The Architecture of Attachment: How We Learn to Trust Another Person',
    author: 'Amir Levine, MD & Rachel Heller, MA',
    authorRole: 'Neuroscientists and Authors of Attached',
    publicationSlug: 'psyche',
    publicationName: 'Psyche',
    publishedDate: '2024-10-18',
    category: 'relationships',
    readingDurationMinutes: 11,
    description:
      'Understanding anxious, avoidant, and secure attachment styles demystifies why the simplest text message or moment of silence can provoke overwhelming distress.',
    keyTakeaway: 'Dependency is not a flaw in human design; secure dependence creates the platform for personal bravery.',
    originalUrl: 'https://psyche.co/guides/how-to-understand-and-improve-your-attachment-style',
    tags: ['Attachment Theory', 'Trust', 'Couples', 'Security'],
    isFeatured: false,
    coverPattern: 'geometry',
  },
  {
    id: 'rel-04',
    title: 'Rilke on Love as the Highest Test of Human Maturity',
    author: 'Maria Popova',
    authorRole: 'Cultural Essayist & Writer',
    publicationSlug: 'marginalian',
    publicationName: 'The Marginalian',
    publishedDate: '2024-08-30',
    category: 'relationships',
    readingDurationMinutes: 12,
    description:
      'Rainer Maria Rilke’s timeless letters on why young love is so difficult, and why true intimacy requires two solitudes that protect, border, and greet each other.',
    keyTakeaway: 'Love consists in this: that two solitudes protect and touch and greet each other.',
    originalUrl: 'https://www.themarginalian.org/2014/07/04/rilke-on-love/',
    tags: ['Rilke', 'Philosophy of Love', 'Solitude', 'Poetry'],
    isFeatured: true,
    coverPattern: 'monolith',
  },

  // ── PHILOSOPHY ─────────────────────────────────────────────────────────────
  {
    id: 'phi-01',
    title: 'Simone Weil on the Revolutionary Power of Undivided Attention',
    author: 'Maria Popova',
    authorRole: 'Writer and Creator of The Marginalian',
    publicationSlug: 'marginalian',
    publicationName: 'The Marginalian',
    publishedDate: '2024-11-04',
    category: 'philosophy',
    readingDurationMinutes: 14,
    description:
      'In a fragmented world addicted to distraction, philosopher Simone Weil reminded us that absolute, pure, unhurried attention is the rarest and purest form of generosity.',
    keyTakeaway: 'Attention is the rarest and purest form of generosity we can bestow on another human soul.',
    originalUrl: 'https://www.themarginalian.org/2013/05/13/simone-weil-attention-prayer/',
    tags: ['Simone Weil', 'Attention', 'Generosity', 'Ethics', 'Modern Life'],
    isFeatured: true,
    coverPattern: 'subtle-lines',
  },
  {
    id: 'phi-02',
    title: 'The Stoic Antidote to Anxiety: Premeditatio Malorum',
    author: 'Massimo Pigliucci',
    authorRole: 'K.D. Irani Professor of Philosophy, City College of New York',
    publicationSlug: 'aeon',
    publicationName: 'Aeon',
    publishedDate: '2024-07-19',
    category: 'philosophy',
    readingDurationMinutes: 12,
    description:
      'Rather than toxic optimism, the ancient Stoics practised deliberately facing worst-case scenarios, stripping catastrophizing of its paralyzing surprise.',
    keyTakeaway: 'He suffers more than necessary, who suffers before it is necessary.',
    originalUrl: 'https://aeon.co/essays/stoicism-shows-us-how-to-flourish-in-an-uncertain-world',
    tags: ['Stoicism', 'Seneca', 'Marcus Aurelius', 'Anxiety', 'Practical Philosophy'],
    isFeatured: false,
    coverPattern: 'geometry',
  },
  {
    id: 'phi-03',
    title: 'Albert Camus and the Art of Defiant Everyday Joy',
    author: 'Matthew Sharpe',
    authorRole: 'Associate Professor of Philosophy, Deakin University',
    publicationSlug: 'psyche',
    publicationName: 'Psyche',
    publishedDate: '2024-12-14',
    category: 'philosophy',
    readingDurationMinutes: 9,
    description:
      'In the depths of winter, Camus found within himself an invincible summer. An exploration of absurdism as a passionate call to love life exactly as it presents itself.',
    keyTakeaway: 'In the midst of winter, I found there was, within me, an invincible summer.',
    originalUrl: 'https://psyche.co/ideas/how-albert-camus-defied-nihilism-with-invincible-summer',
    tags: ['Albert Camus', 'Existentialism', 'Absurdism', 'Hope'],
    isFeatured: false,
    coverPattern: 'monolith',
  },

  // ── SCIENCE ────────────────────────────────────────────────────────────────
  {
    id: 'sci-01',
    title: 'The Biology of Calm: How the Vagus Nerve Restores the Soul',
    author: 'Dacher Keltner, PhD',
    authorRole: 'Professor of Psychology, UC Berkeley',
    publicationSlug: 'greater-good',
    publicationName: 'Greater Good Magazine',
    publishedDate: '2025-01-15',
    category: 'science',
    readingDurationMinutes: 10,
    description:
      'A deep dive into how sighing, holding hands, shared quiet laughter, and viewing vast natural landscapes physically rewire our autonomic nervous system out of alarm.',
    keyTakeaway: 'Awe and gentle touch are biological mechanisms that downregulate cardiovascular stress within seconds.',
    originalUrl: 'https://greatergood.berkeley.edu/article/item/how_awe_transforms_the_body_and_mind',
    tags: ['Vagus Nerve', 'Polyvagal Theory', 'Awe', 'Stress Physiology'],
    isFeatured: true,
    coverPattern: 'botanical',
  },
  {
    id: 'sci-02',
    title: 'Time Is Not a Stream: What Modern Physics Tells Us About Memory',
    author: 'Carlo Rovelli',
    authorRole: 'Theoretical Physicist and Author',
    publicationSlug: 'aeon',
    publicationName: 'Aeon',
    publishedDate: '2024-06-25',
    category: 'science',
    readingDurationMinutes: 15,
    description:
      'At fundamental scales, the universe has no universal "now". How thermodynamic entropy gives birth to our perception of the past, present, and anticipation.',
    keyTakeaway: 'We do not live inside time; time lives inside the thermal interactions of our consciousness.',
    originalUrl: 'https://aeon.co/essays/carlo-rovelli-on-why-physics-needs-philosophy',
    tags: ['Quantum Mechanics', 'Relativity', 'Time', 'Memory', 'Entropy'],
    isFeatured: false,
    coverPattern: 'geometry',
  },
  {
    id: 'sci-03',
    title: 'The Hidden Network of Tree Roots: An Allegory for Interdependence',
    author: 'Suzanne Simard, PhD',
    authorRole: 'Professor of Forest Ecology, University of British Columbia',
    publicationSlug: 'marginalian',
    publicationName: 'The Marginalian',
    publishedDate: '2024-05-11',
    category: 'science',
    readingDurationMinutes: 11,
    description:
      'Forests are not battlegrounds of selfish individuals, but sentient fungal networks where mother trees nurture their young and transmit vital nutrients across species.',
    keyTakeaway: 'Survival in nature is not competition, but reciprocal care mediated through invisible roots.',
    originalUrl: 'https://www.themarginalian.org/2021/05/04/finding-the-mother-tree-suzanne-simard/',
    tags: ['Ecology', 'Mycelium', 'Forests', 'Interconnectedness'],
    isFeatured: false,
    coverPattern: 'botanical',
  },

  // ── LITERATURE ─────────────────────────────────────────────────────────────
  {
    id: 'lit-01',
    title: 'Virginia Woolf on the Dignity of Ordinary Days and Quiet Hours',
    author: 'Maria Popova',
    authorRole: 'Cultural Essayist',
    publicationSlug: 'marginalian',
    publicationName: 'The Marginalian',
    publishedDate: '2024-10-02',
    category: 'literature',
    readingDurationMinutes: 13,
    description:
      'From Woolf’s private diaries: how paying acute sensory attention to the morning light, tea, and silence transforms routine existence into luminous art.',
    keyTakeaway: 'Arrange whatever pieces come your way into a pattern of stillness and light.',
    originalUrl: 'https://www.themarginalian.org/2012/03/05/virginia-woolf-on-writing-and-doubt/',
    tags: ['Virginia Woolf', 'Modernism', 'Diaries', 'Stillness', 'Solitude'],
    isFeatured: true,
    coverPattern: 'monolith',
  },
  {
    id: 'lit-02',
    title: 'Why Great Novels Teach Us More About Psychology Than Textbooks',
    author: 'Alain de Botton',
    authorRole: 'Philosopher and Author',
    publicationSlug: 'school-of-life',
    publicationName: 'The School of Life',
    publishedDate: '2024-09-03',
    category: 'literature',
    readingDurationMinutes: 8,
    description:
      'George Eliot, Tolstoy, and Proust achieved what clinical surveys cannot: they walked inside the ambivalent, contradictory interior chambers of the human heart.',
    keyTakeaway: 'A novel is a therapeutic laboratory where we practice forgiving human frailty.',
    originalUrl: 'https://www.theschooloflife.com/article/why-literature-matters/',
    tags: ['Fiction', 'Empathy', 'Proust', 'Tolstoy', 'Emotional Intelligence'],
    isFeatured: false,
    coverPattern: 'minimal',
  },
  {
    id: 'lit-03',
    title: 'The Poetry of Mary Oliver as a Manual for Gratitude and Survival',
    author: 'Stephen Batchelor',
    authorRole: 'Scholar and Author',
    publicationSlug: 'psyche',
    publicationName: 'Psyche',
    publishedDate: '2024-07-07',
    category: 'literature',
    readingDurationMinutes: 10,
    description:
      'Oliver’s wild geese and river stones remind us that we do not have to be good; we only have to let the soft animal of our body love what it loves.',
    keyTakeaway: 'Tell me, what is it you plan to do with your one wild and precious life?',
    originalUrl: 'https://psyche.co/ideas/mary-olivers-poetry-is-a-reverent-guide-to-being-alive',
    tags: ['Mary Oliver', 'Poetry', 'Gratitude', 'Nature', 'Mindfulness'],
    isFeatured: false,
    coverPattern: 'subtle-lines',
  },
]

export const TOPIC_METADATA = {
  psychology: {
    title: 'Psychology',
    tagline: 'The Inner Landscape & Mind',
    description:
      'Inquiries into human emotion, cognitive habits, self-compassion, attachment patterns, and the neuroscience of mental resilience.',
  },
  relationships: {
    title: 'Relationships',
    tagline: 'The Architecture of Human Bond',
    description:
      'Scientific and philosophical perspectives on conflict resolution, tender communication, emotional safety, and enduring mutual affection.',
  },
  philosophy: {
    title: 'Philosophy',
    tagline: 'Wisdom for Everyday Living',
    description:
      'Timeless inquiries from Stoicism, Existentialism, and Moral Philosophy applied to contemporary dilemmas of meaning, ethics, and calm.',
  },
  science: {
    title: 'Science',
    tagline: 'Empirical Wonder & Living Systems',
    description:
      'Explorations of nervous system physiology, physics of time, ecological networks, and the biological roots of awe and connection.',
  },
  literature: {
    title: 'Literature',
    tagline: 'The Poetics of the Heart',
    description:
      'Essays on prose, poetry, author reflections, and the capacity of great novels to foster profound empathy and moral imagination.',
  },
} as const

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

