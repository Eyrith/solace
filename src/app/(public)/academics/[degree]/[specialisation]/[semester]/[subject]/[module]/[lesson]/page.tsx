import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Award,
  Cpu,
  GraduationCap,
  MessageSquare,
  Lock,
  ChevronRight,
} from 'lucide-react'
import { getLesson, getDegreeDetail } from '@/lib/academics/academic-service'
import { MarkdownRenderer } from '@/components/editorial/markdown-renderer'
import { QuizWidget } from '@/components/academics/quiz-widget'
import { PracticalWorkspace } from '@/components/academics/practical-workspace'
import { LessonReflectiveWorkspace } from '@/components/academics/lesson-reflective-workspace'

export const dynamic = 'force-dynamic'

interface LessonPageProps {
  params: Promise<{
    degree: string
    specialisation: string
    semester: string
    subject: string
    module: string
    lesson: string
  }>
}

export default async function AcademicLessonPage({ params }: LessonPageProps) {
  const {
    degree: degreeCode,
    specialisation: specSlug,
    semester: semesterNum,
    subject: subjectCode,
    module: moduleNum,
    lesson: lessonSlug,
  } = await params

  const lesson = await getLesson(degreeCode, specSlug, lessonSlug)

  if (!lesson) {
    notFound()
  }

  const isTechnical = degreeCode.toLowerCase() === 'btech' || degreeCode.toLowerCase() === 'bca'

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Lesson Top Bar & Breadcrumbs */}
      <div className="border-b border-border/40 bg-muted/10 px-8 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground flex-wrap">
            <Link
              href={`/academics/${degreeCode}/${specSlug}`}
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="uppercase">{degreeCode}</span>
            </Link>
            <span>/</span>
            <span className="text-primary font-medium">{subjectCode}</span>
            <span>/</span>
            <span>Unit {moduleNum}</span>
            <span>/</span>
            <span className="text-foreground font-medium">{lesson.title}</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>{lesson.estimatedDurationMinutes}m</span>
          </div>
        </div>
      </div>

      {/* Main Lesson Canvas */}
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-12">
        {/* Lesson Header */}
        <header className="space-y-3 border-b border-border/40 pb-6">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
              {subjectCode} • Lesson {moduleNum}.{lesson.orderIndex}
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            {lesson.title}
          </h1>
        </header>

        {/* Lesson Body Content */}
        <article className="font-serif text-lg leading-relaxed space-y-6">
          <MarkdownRenderer content={lesson.content} />
        </article>

        {/* Interactive Practical Workspace */}
        <section className="space-y-4 pt-6 border-t border-border/40">
          <PracticalWorkspace
            type={isTechnical ? 'code' : 'finance'}
            lessonTitle={isTechnical ? 'Virtual Memory & Pointer Execution Sandbox' : 'Market Strategy & Elasticity Simulator'}
          />
        </section>

        {/* Interactive Assessment / Quiz */}
        {lesson.quiz && (
          <section className="space-y-4 pt-6 border-t border-border/40">
            <QuizWidget quiz={lesson.quiz} />
          </section>
        )}

        {/* Lesson Thoughts, Subject Notebook & Private Discourse */}
        <section className="pt-8 border-t-2 border-border/60">
          <LessonReflectiveWorkspace
            lessonId={lesson.id}
            lessonTitle={lesson.title}
            subjectCode={subjectCode}
          />
        </section>
      </main>
    </div>
  )
}
