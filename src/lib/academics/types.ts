export interface AcademicDegree {
  id: string
  code: string // 'btech' | 'bca' | 'bba' | 'bsc' | 'bcom' | 'ba' | 'bdes'
  title: string
  description: string
  durationYears: number
  isActive: boolean
  specialisations?: AcademicSpecialisation[]
}

export interface AcademicSpecialisation {
  id: string
  degreeId: string
  slug: string
  title: string
  description?: string | null
  isActive: boolean
  semesters?: AcademicSemester[]
}

export interface AcademicSemester {
  id: string
  specialisationId: string
  semesterNumber: number
  title: string
  subjects?: AcademicSubject[]
}

export interface AcademicSubject {
  id: string
  semesterId: string
  code: string
  title: string
  description?: string | null
  credits: number
  orderIndex: number
  modules?: AcademicModule[]
}

export interface AcademicModule {
  id: string
  subjectId: string
  moduleNumber: number
  title: string
  description?: string | null
  orderIndex: number
  lessons?: AcademicLesson[]
}

export interface AcademicLesson {
  id: string
  moduleId: string
  slug: string
  title: string
  content: string // Full Markdown with math/KaTeX/code
  orderIndex: number
  estimatedDurationMinutes: number
  isPublished: boolean
  quiz?: AcademicQuiz | null
  module?: AcademicModule | null
  subject?: AcademicSubject | null
  createdAt?: string
  updatedAt?: string
}

export interface QuizQuestionOption {
  id: string
  text: string
}

export interface QuizQuestion {
  id: string
  quizId: string
  questionType: 'mcq' | 'true_false' | 'short_answer'
  questionText: string
  options: QuizQuestionOption[]
  correctAnswer: string
  explanation?: string | null
  orderIndex: number
}

export interface AcademicQuiz {
  id: string
  lessonId: string
  title: string
  description?: string | null
  passingScorePercent: number
  questions: QuizQuestion[]
}

export interface Flashcard {
  id: string
  deckId: string
  frontPrompt: string
  backSolution: string
  easeFactor: number
  intervalDays: number
  repetitionCount: number
  nextReviewAt: string
}

export interface AcademicNotebookEntry {
  id: string
  userId: string
  subjectId?: string | null
  lessonId?: string | null
  title: string
  content: string
  tags: string[]
  isPinned: boolean
  createdAt: string
  updatedAt: string
}
