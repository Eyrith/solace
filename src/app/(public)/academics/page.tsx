import React from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  Code,
  Briefcase,
  Atom,
  Building2,
  Palette,
  BookOpen,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { getDegrees } from '@/lib/academics/academic-service'

export const dynamic = 'force-dynamic'

const DEGREE_ICONS: Record<string, React.ReactNode> = {
  btech: <Code className="w-5 h-5 text-sky-500" />,
  bca: <Code className="w-5 h-5 text-indigo-500" />,
  bba: <Briefcase className="w-5 h-5 text-amber-500" />,
  bsc: <Atom className="w-5 h-5 text-emerald-500" />,
  bcom: <Building2 className="w-5 h-5 text-teal-500" />,
  ba: <BookOpen className="w-5 h-5 text-purple-500" />,
  bdes: <Palette className="w-5 h-5 text-rose-500" />,
}

export default async function AcademicsPortalPage() {
  const degrees = await getDegrees()

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Banner */}
      <div className="border-b border-border/40 bg-muted/10 px-8 py-12">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-wider">
            <GraduationCap className="w-4 h-4" />
            <span>Academic Learning Environment</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight text-foreground">
            Undergraduate Programmes &amp; Curriculum
          </h1>
          <p className="font-serif text-base text-muted-foreground max-w-2xl leading-relaxed">
            Rigorous, interactive degree curricula stored entirely within Solace. Complete with structured modules, interactive quizzes, programming sandboxes, and content-anchored peer discourse.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-12 space-y-12">
        {/* Degrees Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {degrees.map((deg) => {
            const icon = DEGREE_ICONS[deg.code] || <GraduationCap className="w-5 h-5 text-primary" />
            const primarySpec = deg.specialisations?.[0]

            return (
              <div
                key={deg.id}
                className="p-6 rounded-xl border border-border/40 bg-card hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between space-y-6 group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
                      {icon}
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                      {deg.durationYears} Years
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                      {deg.title}
                    </h3>
                    <span className="text-xs font-mono uppercase text-primary font-medium tracking-wide">
                      {deg.code.toUpperCase()}
                    </span>
                  </div>

                  <p className="font-serif text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {deg.description}
                  </p>

                  {deg.specialisations && deg.specialisations.length > 0 && (
                    <div className="pt-2 border-t border-border/20 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">
                        Specialisation:
                      </span>
                      <p className="font-serif text-xs font-medium text-foreground">
                        {primarySpec?.title}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border/30 flex items-center justify-between">
                  {primarySpec ? (
                    <Link
                      href={`/academics/${deg.code}/${primarySpec.slug}`}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Explore Curriculum</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="text-xs font-mono text-muted-foreground">Coming Soon</span>
                  )}
                  <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Interactive
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Feature Highlights Grid */}
        <div className="p-8 rounded-xl border border-border/40 bg-muted/10 space-y-6">
          <div className="max-w-xl space-y-1.5">
            <h2 className="font-serif text-2xl font-semibold">Interactive Learning Built for Depth</h2>
            <p className="font-serif text-xs text-muted-foreground leading-relaxed">
              Solace replaces passive video portals with active cognition: write notes, test theorem comprehension, execute code, and debate concepts with peers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="space-y-2">
              <h4 className="font-serif text-sm font-semibold text-foreground">Subject-Linked Notebook</h4>
              <p className="font-serif text-xs text-muted-foreground leading-relaxed">
                Full Markdown and LaTeX note-taking attached directly to specific semesters and lessons, with automated tags and folder hierarchy.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-serif text-sm font-semibold text-foreground">Content-Anchored Discourse</h4>
              <p className="font-serif text-xs text-muted-foreground leading-relaxed">
                Highlight any theorem or exercise to begin a private, threaded 2-person intellectual debate with a peer or professor.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-serif text-sm font-semibold text-foreground">Practical Sandboxes</h4>
              <p className="font-serif text-xs text-muted-foreground leading-relaxed">
                Integrated WebAssembly code execution for B.Tech/BCA, financial balance-sheet modeling for BBA, and numerical worksheets for B.Sc.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
