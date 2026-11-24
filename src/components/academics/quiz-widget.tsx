'use client'

import React, { useState } from 'react'
import { CheckCircle2, XCircle, HelpCircle, Award, RotateCcw } from 'lucide-react'
import type { AcademicQuiz } from '@/lib/academics/types'

interface QuizWidgetProps {
  quiz: AcademicQuiz
}

export function QuizWidget({ quiz }: QuizWidgetProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const handleSelect = (questionId: string, optionId: string) => {
    if (submitted) return
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }))
  }

  const handleReset = () => {
    setSelectedAnswers({})
    setSubmitted(false)
  }

  // Calculate score
  let correctCount = 0
  quiz.questions.forEach((q) => {
    if (selectedAnswers[q.id] === q.correctAnswer) {
      correctCount++
    }
  })

  const scorePercent = Math.round((correctCount / quiz.questions.length) * 100)
  const isPassed = scorePercent >= quiz.passingScorePercent

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-6 shadow-xs">
      <div className="border-b border-border/40 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-wider">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Interactive Assessment</span>
          </div>
          <h3 className="font-serif text-xl font-semibold text-foreground">
            {quiz.title}
          </h3>
        </div>

        {submitted && (
          <div className="flex items-center gap-3">
            <div
              className={`px-3 py-1 rounded-full text-xs font-mono font-semibold ${
                isPassed
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              }`}
            >
              Score: {scorePercent}% ({correctCount}/{quiz.questions.length})
            </div>
            <button
              onClick={handleReset}
              className="p-1.5 rounded border border-border/40 hover:bg-muted/30 text-xs text-muted-foreground"
              title="Retake Quiz"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {quiz.description && (
        <p className="font-serif text-xs text-muted-foreground">
          {quiz.description}
        </p>
      )}

      {/* Questions List */}
      <div className="space-y-6">
        {quiz.questions.map((q, idx) => {
          const userAnswer = selectedAnswers[q.id]
          const isCorrect = userAnswer === q.correctAnswer

          return (
            <div key={q.id} className="p-4 rounded-lg border border-border/40 bg-muted/10 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-xs font-mono font-medium text-muted-foreground">
                  Q{idx + 1}.
                </span>
                <p className="font-serif text-sm font-medium text-foreground leading-relaxed">
                  {q.questionText}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2 ml-4">
                {q.options.map((opt) => {
                  const isSelected = userAnswer === opt.id
                  let optionClass = 'border-border/40 hover:border-primary/50'

                  if (submitted) {
                    if (opt.id === q.correctAnswer) {
                      optionClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    } else if (isSelected) {
                      optionClass = 'border-destructive bg-destructive/10 text-destructive'
                    } else {
                      optionClass = 'opacity-60 border-border/30'
                    }
                  } else if (isSelected) {
                    optionClass = 'border-primary bg-primary/10 text-primary font-medium'
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={submitted}
                      onClick={() => handleSelect(q.id, opt.id)}
                      className={`w-full text-left p-3 rounded-md border text-xs font-serif leading-relaxed transition-all flex items-center justify-between ${optionClass}`}
                    >
                      <span>{opt.text}</span>
                      {submitted && opt.id === q.correctAnswer && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                      {submitted && isSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Explanation upon submission */}
              {submitted && q.explanation && (
                <div className="mt-3 p-3 rounded-md bg-muted/30 border border-border/30 text-xs font-serif text-muted-foreground space-y-1">
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-primary" /> Explanation
                  </span>
                  <p className="leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!submitted && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            disabled={Object.keys(selectedAnswers).length < quiz.questions.length}
            onClick={() => setSubmitted(true)}
            className="px-5 py-2 rounded-md bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Submit Answers &amp; Check Score
          </button>
        </div>
      )}
    </div>
  )
}
