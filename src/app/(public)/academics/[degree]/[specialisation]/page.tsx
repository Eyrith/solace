import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  GraduationCap,
  BookOpen,
  ArrowRight,
  Clock,
  ArrowLeft,
  ChevronRight,
  FileCode2,
  CheckCircle,
} from 'lucide-react'
import { getDegreeDetail } from '@/lib/academics/academic-service'

export const dynamic = 'force-dynamic'

interface SpecialisationPageProps {
  params: Promise<{
    degree: string
    specialisation: string
  }>
}

export default async function SpecialisationCurriculumPage({ params }: SpecialisationPageProps) {
  const { degree: degreeCode, specialisation: specSlug } = await params
  const degree = await getDegreeDetail(degreeCode)

  if (!degree) {
    notFound()
  }

  const spec = degree.specialisations?.find(
    (s) => s.slug.toLowerCase() === specSlug.toLowerCase()
  )

  if (!spec) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Breadcrumb Header */}
      <div className="border-b border-border/40 bg-muted/10 px-8 py-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Link href="/academics" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Academics</span>
            </Link>
            <span>/</span>
            <span className="uppercase text-primary font-medium">{degree.code}</span>
            <span>/</span>
            <span className="text-foreground">{spec.title}</span>
          </div>

          <div className="space-y-1.5">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              {spec.title}
            </h1>
            <p className="font-serif text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {spec.description || degree.description}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10 space-y-12">
        {(!spec.semesters || spec.semesters.length === 0) ? (
          <div className="p-12 text-center rounded-xl border border-border/40 bg-muted/10 space-y-3">
            <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <p className="font-serif text-sm text-muted-foreground">
              Curriculum for this specialisation is currently being compiled into Solace.
            </p>
          </div>
        ) : (
          spec.semesters.map((sem) => (
            <section key={sem.id} className="space-y-6">
              <div className="border-b border-border/40 pb-3 flex items-center justify-between">
                <h2 className="font-serif text-2xl font-semibold text-foreground">
                  {sem.title}
                </h2>
                <span className="text-xs font-mono text-muted-foreground">
                  {sem.subjects?.length || 0} Core Subjects
                </span>
              </div>

              {/* Subjects in this semester */}
              <div className="space-y-6">
                {sem.subjects?.map((sub) => (
                  <div
                    key={sub.id}
                    className="rounded-xl border border-border/40 bg-card overflow-hidden"
                  >
                    {/* Subject Header */}
                    <div className="p-6 border-b border-border/30 bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                            {sub.code}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground">
                            {sub.credits} Academic Credits
                          </span>
                        </div>
                        <h3 className="font-serif text-xl font-medium text-foreground">
                          {sub.title}
                        </h3>
                        {sub.description && (
                          <p className="font-serif text-xs text-muted-foreground max-w-2xl leading-relaxed">
                            {sub.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Modules and Lessons */}
                    <div className="p-6 space-y-6">
                      {sub.modules?.map((mod) => (
                        <div key={mod.id} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                              Unit {mod.moduleNumber}:
                            </span>
                            <h4 className="font-serif text-sm font-semibold text-foreground">
                              {mod.title}
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5 ml-2">
                            {mod.lessons?.map((les) => (
                              <Link
                                key={les.id}
                                href={`/academics/${degree.code}/${spec.slug}/${sem.semesterNumber}/${sub.code}/${mod.moduleNumber}/${les.slug}`}
                                className="p-3.5 rounded-lg border border-border/30 bg-background hover:bg-muted/20 hover:border-primary/40 transition-all flex items-center justify-between gap-4 group"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-muted-foreground">
                                      {mod.moduleNumber}.{les.orderIndex}
                                    </span>
                                    <h5 className="font-serif text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                      {les.title}
                                    </h5>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground shrink-0">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {les.estimatedDurationMinutes}m
                                  </span>
                                  {les.quiz && (
                                    <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary">
                                      Quiz Available
                                    </span>
                                  )}
                                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 text-primary transition-transform" />
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
