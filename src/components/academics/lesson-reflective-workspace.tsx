'use client'

import React, { useState } from 'react'
import {
  Lock,
  MessageSquare,
  BookOpen,
  Share2,
  Save,
  CheckCircle2,
  ChevronRight,
  Plus,
  Send,
} from 'lucide-react'

interface LessonReflectiveWorkspaceProps {
  lessonId: string
  lessonTitle: string
  subjectCode: string
}

interface LessonThought {
  id: string
  text: string
  createdAt: string
}

interface LessonDiscourse {
  id: string
  thoughtText: string
  peerName: string
  status: 'active' | 'concluded'
  repliesCount: number
}

export function LessonReflectiveWorkspace({
  lessonId,
  lessonTitle,
  subjectCode,
}: LessonReflectiveWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'thoughts' | 'discourse' | 'notebook'>('thoughts')

  // Thoughts state
  const [thoughts, setThoughts] = useState<LessonThought[]>([
    {
      id: 'lt-1',
      text: 'In stack allocation, the RSP register decrement is effectively free in terms of CPU cycles, but how does cache locality behave when allocating large local structs versus small primitives?',
      createdAt: 'Today',
    },
  ])
  const [newThought, setNewThought] = useState('')

  // Discourse state
  const [discussions, setDiscussions] = useState<LessonDiscourse[]>([])
  const [showDiscourseModal, setShowDiscourseModal] = useState(false)
  const [selectedThoughtId, setSelectedThoughtId] = useState<string>('')
  const [peerEmail, setPeerEmail] = useState('')
  const [notification, setNotification] = useState<string | null>(null)

  // Notebook state
  const [notebookContent, setNotebookContent] = useState(
    `# ${subjectCode} Study Notes: ${lessonTitle}\n\n- Key takeaway 1: Stack frames live and die with function returns.\n- Key takeaway 2: Heap memory requires explicit allocation and deallocation (or GC).\n- Question to review before exams: How does the MMU handle page faults when memory is overcommitted?`
  )
  const [notebookSaved, setNotebookSaved] = useState(false)

  const handleAddThought = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newThought.trim()) return

    const item: LessonThought = {
      id: `lt-${Date.now()}`,
      text: newThought.trim(),
      createdAt: 'Just now',
    }
    setThoughts([item, ...thoughts])
    setNewThought('')
  }

  const handleStartDiscourse = (e: React.FormEvent) => {
    e.preventDefault()
    if (!peerEmail.trim() || !selectedThoughtId) return

    const th = thoughts.find((t) => t.id === selectedThoughtId)
    const disc: LessonDiscourse = {
      id: `ld-${Date.now()}`,
      thoughtText: th?.text || 'Concept inquiry',
      peerName: peerEmail.trim(),
      status: 'active',
      repliesCount: 1,
    }

    setDiscussions([disc, ...discussions])
    setShowDiscourseModal(false)
    setPeerEmail('')
    setSelectedThoughtId('')
    setNotification(`Private academic discourse initiated with ${disc.peerName}. Strictly private to both participants.`)
    setTimeout(() => setNotification(null), 5000)
  }

  const handleSaveNotebook = () => {
    setNotebookSaved(true)
    setTimeout(() => setNotebookSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-primary font-medium">
            Academic Discourse &amp; Notes
          </span>
          <h3 className="font-serif text-2xl font-semibold text-foreground">
            Personal Reflection &amp; Peer Discussion
          </h3>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-border/50 p-1 bg-muted/20 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('thoughts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'thoughts' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>My Thoughts ({thoughts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discourse')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'discourse' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-primary" />
            <span>Private Discourse ({discussions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notebook')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'notebook' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
            <span>Subject Notebook</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* TAB 1: MY THOUGHTS ON LESSON */}
      {activeTab === 'thoughts' && (
        <div className="space-y-6">
          <div className="p-4 rounded-lg border border-border/50 bg-muted/15 space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>Personal Concept Reflection (Private to You)</span>
              </span>
              <span className="text-[11px] font-mono text-muted-foreground/60">
                Record questions, counter-examples, or memory hooks
              </span>
            </div>

            <form onSubmit={handleAddThought} className="space-y-3">
              <textarea
                rows={3}
                placeholder="Record your observation about this theorem, code mechanism, or proof..."
                value={newThought}
                onChange={(e) => setNewThought(e.target.value)}
                className="w-full rounded-md border border-border/50 bg-background p-3 text-sm font-serif leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-hidden focus:border-primary/50 resize-none"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newThought.trim()}
                  className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  Save Thought
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-3">
            {thoughts.map((th) => (
              <div
                key={th.id}
                className="p-4 rounded-lg border border-border/40 bg-background space-y-2 flex flex-col justify-between"
              >
                <p className="font-serif text-sm text-foreground/90 leading-relaxed">
                  {th.text}
                </p>
                <div className="pt-2 border-t border-border/20 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-muted-foreground">{th.createdAt}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedThoughtId(th.id)
                      setShowDiscourseModal(true)
                    }}
                    className="flex items-center gap-1 text-primary hover:underline font-medium text-xs"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>Debate with Peer</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PRIVATE DISCOURSE ON LESSON */}
      {activeTab === 'discourse' && (
        <div className="space-y-6">
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-serif text-sm font-semibold text-foreground">
                Peer Intellectual Debate on this Lesson
              </h4>
              <p className="font-serif text-xs text-muted-foreground max-w-xl">
                Collaborate 1-on-1 with a study partner to question assumptions or solve complex proofs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDiscourseModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Start Discourse</span>
            </button>
          </div>

          {discussions.length === 0 ? (
            <div className="p-8 text-center rounded-lg border border-border/30 bg-muted/10 space-y-2">
              <MessageSquare className="w-6 h-6 text-muted-foreground/40 mx-auto" />
              <p className="font-serif text-sm text-muted-foreground">
                No active discourse threads on this lesson yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {discussions.map((d) => (
                <div
                  key={d.id}
                  className="p-4 rounded-lg border border-border/40 bg-background flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-600">
                        {d.status}
                      </span>
                      <span className="text-xs font-serif text-muted-foreground">
                        With: <strong className="text-foreground">{d.peerName}</strong>
                      </span>
                    </div>
                    <p className="font-serif text-xs text-foreground/80 line-clamp-1 italic">
                      &ldquo;{d.thoughtText}&rdquo;
                    </p>
                  </div>

                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-primary hover:underline font-medium shrink-0"
                  >
                    <span>Open Discussion</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SUBJECT NOTEBOOK */}
      {activeTab === 'notebook' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-border/40 bg-card space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span>Personal Study Notebook ({subjectCode})</span>
              </span>
              <button
                type="button"
                onClick={handleSaveNotebook}
                className="flex items-center gap-1 px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
              >
                <Save className="w-3 h-3" />
                <span>{notebookSaved ? 'Saved!' : 'Save Notes'}</span>
              </button>
            </div>

            <textarea
              rows={8}
              value={notebookContent}
              onChange={(e) => setNotebookContent(e.target.value)}
              className="w-full p-3 rounded-md border border-border/40 bg-background font-mono text-xs leading-relaxed text-foreground focus:outline-hidden"
            />
          </div>
        </div>
      )}

      {/* Initiate Discourse Modal */}
      {showDiscourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-xl border border-border bg-background shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="font-serif text-base font-semibold">Start Academic Discourse</h3>
              <button
                type="button"
                onClick={() => setShowDiscourseModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStartDiscourse} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                  Peer Username or Email
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. devon.fellow@solace.edu"
                  value={peerEmail}
                  onChange={(e) => setPeerEmail(e.target.value)}
                  className="w-full rounded border border-border/50 bg-muted/10 p-2.5 text-xs text-foreground focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                  Select Thought to Debate
                </label>
                <select
                  required
                  value={selectedThoughtId}
                  onChange={(e) => setSelectedThoughtId(e.target.value)}
                  className="w-full rounded border border-border/50 bg-muted/10 p-2 text-xs text-foreground focus:outline-hidden"
                >
                  <option value="">Select a thought...</option>
                  {thoughts.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.text.slice(0, 60)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiscourseModal(false)}
                  className="px-3 py-1.5 rounded border border-border/50 hover:bg-muted/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!peerEmail.trim() || !selectedThoughtId}
                  className="px-4 py-1.5 rounded bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  Start Debate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
