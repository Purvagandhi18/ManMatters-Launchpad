'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight, CheckCircle2, Circle, BookOpen, ClipboardList,
  ExternalLink, ChevronDown, ChevronUp, Pencil, Loader2, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SubtopicData {
  id: string
  title: string
  description: string
  tag: string
  sortOrder: number
  quiz: { id: string; status: string; passThreshold: number } | null
  project: { id: string; title: string; isPublished: boolean } | null
  userProgress: {
    quizPassed?: boolean
    projectSubmitted?: boolean
    projectGraded?: boolean
    completedAt?: string | null
  }[]
}

interface TopicData {
  id: string
  title: string
  tag: string
  sortOrder: number
  references: { id: string; title: string; url: string; refType: string }[]
  subtopics: SubtopicData[]
}

interface WeekData {
  id: string
  number: number
  title: string
  description: string
  badgeIcon?: string | null
  badgeName?: string | null
  weekProgress: { isUnlocked: boolean; isCompleted: boolean }[]
  topics: TopicData[]
}

interface Reflection {
  id: string
  content: string
  aiScore: number | null
  aiFeedback: string | null
  status: string
  submittedAt: string
  revisedAt: string | null
}

// ─── Reflection panel ──────────────────────────────────────────────────────
function ReflectionPanel({ topicId, topicTitle }: { topicId: string; topicTitle: string }) {
  const [reflection, setReflection] = useState<Reflection | null | undefined>(undefined)
  const [text, setText]             = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    fetch(`/api/topics/${topicId}/reflection`)
      .then(r => r.json())
      .then(d => {
        setReflection(d)
        if (d) setText(d.content)
      })
  }, [topicId])

  async function submit() {
    setError('')
    if (text.trim().length < 20) { setError('Write at least 20 characters.'); return }
    setSubmitting(true)
    const res = await fetch(`/api/topics/${topicId}/reflection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Something went wrong.'); setSubmitting(false); return }
    setReflection(data)
    setSubmitting(false)
  }

  if (reflection === undefined) return null

  const isApproved     = reflection?.status === 'approved'
  const needsRevision  = reflection?.status === 'needs_revision'
  const canEdit        = !reflection || needsRevision

  return (
    <div className={cn(
      'mx-5 mb-5 rounded-xl border p-4',
      isApproved   ? 'bg-emerald-50 border-emerald-200' :
      needsRevision ? 'bg-amber-50 border-amber-200'   :
      'bg-[#F5F3FF] border-[#E4DEFF]'
    )}>
      <div className="flex items-center gap-2 mb-3">
        <Pencil size={14} className={cn(
          isApproved ? 'text-emerald-600' : needsRevision ? 'text-amber-600' : 'text-brand-600'
        )} />
        <p className={cn(
          'text-xs font-bold uppercase tracking-wide',
          isApproved ? 'text-emerald-700' : needsRevision ? 'text-amber-700' : 'text-brand-700'
        )}>
          {isApproved ? 'Reflection Complete' : needsRevision ? 'Needs Revision' : 'What Did I Learn?'}
        </p>
        {isApproved && reflection?.aiScore != null && (
          <span className="ml-auto text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            {reflection.aiScore.toFixed(1)} / 10
          </span>
        )}
      </div>

      {/* AI feedback */}
      {reflection?.aiFeedback && (
        <p className={cn(
          'text-xs mb-3 leading-relaxed',
          isApproved ? 'text-emerald-700' : 'text-amber-700'
        )}>
          {reflection.aiFeedback}
        </p>
      )}

      {/* Approved — show saved reflection */}
      {isApproved && reflection && (
        <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-emerald-100 leading-relaxed">
          {reflection.content}
        </p>
      )}

      {/* Editable state */}
      {canEdit && (
        <>
          {needsRevision && (
            <p className="text-xs text-amber-600 mb-2">
              Revise your reflection based on the feedback above and resubmit.
            </p>
          )}
          {!reflection && (
            <div className="mb-2">
              <p className="text-sm font-black tracking-widest text-[#1A1033] mb-1">WHAT DID I LEARN?</p>
              <p className="text-xs text-[#6B57B8]">
                Share what you understood from <strong>{topicTitle}</strong>. Cover the key ideas in your own words, be specific, and show you get the fundamentals.
              </p>
            </div>
          )}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            placeholder="Write your reflection here…"
            className="w-full text-sm rounded-lg border border-[#E4DEFF] bg-white px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 text-gray-800 placeholder-gray-400"
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          <button
            onClick={submit}
            disabled={submitting}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? <><Loader2 size={12} className="animate-spin" /> Evaluating…</> : needsRevision ? <><RefreshCw size={12} /> Resubmit</> : 'Submit Reflection'}
          </button>
        </>
      )}
    </div>
  )
}

// ─── Topic card ────────────────────────────────────────────────────────────
function TopicCard({ topic, onQuiz, onProject }: {
  topic: TopicData
  onQuiz: (quizId: string) => void
  onProject: (projectId: string) => void
}) {
  const [expanded, setExpanded] = useState(true)

  const completedCount = topic.subtopics.filter(
    s => s.userProgress[0]?.quizPassed || s.userProgress[0]?.completedAt
  ).length
  const total = topic.subtopics.length
  const allDone = completedCount === total && total > 0
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0

  const isTech = topic.tag === 'tech'

  return (
    <div className="bg-white rounded-2xl border border-[#E4DEFF] overflow-hidden shadow-sm">
      {/* Accent bar */}
      <div className={cn(
        'h-1',
        isTech
          ? 'bg-gradient-to-r from-brand-500 to-purple-500'
          : 'bg-gradient-to-r from-orange-400 to-rose-400'
      )} />

      {/* Topic header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FAFAFE] transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={cn(
            'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
            isTech
              ? 'bg-brand-100 text-brand-700'
              : 'bg-orange-100 text-orange-700'
          )}>
            {topic.tag.toUpperCase()}
          </span>
          <h2 className="font-bold text-[#1A1033] text-sm truncate">{topic.title}</h2>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-[#E4DEFF] rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-emerald-500' : 'bg-brand-500')}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 tabular-nums">{completedCount}/{total}</span>
          </div>
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {/* Subtopics + resources */}
      {expanded && (
        <div className="border-t border-[#F0ECFF]">
          {/* Topic-level resources */}
          {topic.references.length > 0 && (
            <div className="px-5 py-3 flex flex-wrap gap-3 bg-[#FAFAFE] border-b border-[#F0ECFF]">
              {topic.references.map(ref => (
                <a
                  key={ref.id}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 hover:underline font-medium"
                >
                  <ExternalLink size={11} />
                  {ref.title}
                  <span className="text-[10px] text-gray-400 font-normal">{ref.refType}</span>
                </a>
              ))}
            </div>
          )}

          {topic.subtopics.map((subtopic, idx) => {
            const progress         = subtopic.userProgress[0]
            const isQuizPassed     = progress?.quizPassed
            const isProjectSubmitted = progress?.projectSubmitted
            const isCompleted      = isQuizPassed || (progress?.completedAt != null)

            return (
              <div
                key={subtopic.id}
                className={cn(
                  'px-5 py-3.5 flex items-start gap-3 group',
                  idx > 0 && 'border-t border-[#F5F3FF]'
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isCompleted
                    ? <CheckCircle2 size={18} className="text-emerald-500" />
                    : <Circle size={18} className="text-gray-300 group-hover:text-brand-400 transition-colors" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    isCompleted ? 'text-gray-500' : 'text-[#1A1033]'
                  )}>
                    {subtopic.title}
                  </p>
                  {subtopic.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{subtopic.description}</p>
                  )}
                </div>

                <div className="flex-shrink-0 flex gap-2">
                  {subtopic.quiz && subtopic.quiz.status === 'live' && (
                    <button
                      onClick={() => onQuiz(subtopic.quiz!.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                        isQuizPassed
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-brand-600 text-white hover:bg-brand-700'
                      )}
                    >
                      <BookOpen size={12} />
                      {isQuizPassed ? 'Passed' : 'Quiz'}
                    </button>
                  )}
                  {subtopic.project && subtopic.project.isPublished && (
                    <button
                      onClick={() => onProject(subtopic.project!.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                        isProjectSubmitted
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      )}
                    >
                      <ClipboardList size={12} />
                      {isProjectSubmitted ? 'Submitted' : 'Project'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Reflection section — shows when all subtopics done */}
          {allDone && (
            <div className="border-t border-[#F0ECFF]">
              <ReflectionPanel topicId={topic.id} topicTitle={topic.title} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Week page ─────────────────────────────────────────────────────────────
export default function WeekPage() {
  const params = useParams()
  const router = useRouter()
  const [week, setWeek]   = useState<WeekData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/weeks/${params.id}`)
      .then(r => r.json())
      .then(data => { setWeek(data); setLoading(false) })
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6FF]">
        {/* Skeleton header */}
        <div className="bg-white border-b border-[#E4DEFF] h-12" />
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          <div className="h-36 rounded-2xl bg-[#E4DEFF]/60 animate-pulse" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-white border border-[#E4DEFF] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!week) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F6FF]">
        <p className="text-gray-400">Week not found.</p>
      </div>
    )
  }

  const allSubtopics   = week.topics.flatMap(t => t.subtopics)
  const completedCount = allSubtopics.filter(
    s => s.userProgress[0]?.quizPassed || s.userProgress[0]?.completedAt
  ).length
  const totalCount = allSubtopics.length
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="min-h-screen bg-[#F8F6FF]">
      {/* Sticky breadcrumb */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-[#E4DEFF] sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center">
          <nav className="flex items-center gap-1.5 text-sm">
            <Link href="/dashboard" className="text-brand-600 hover:text-brand-700 font-medium transition-colors">
              Dashboard
            </Link>
            <ChevronRight size={14} className="text-gray-300" />
            <span className="text-[#1A1033] font-semibold">Week {week.number}: {week.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Week hero */}
        <div
          className="rounded-2xl p-6 text-white shadow-md"
          style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">
                Week {week.number}
              </p>
              <h1 className="text-xl font-bold mb-1">
                {week.badgeIcon} {week.title}
              </h1>
              <p className="text-indigo-200 text-sm max-w-md leading-relaxed">{week.description}</p>
            </div>
            {week.badgeName && (
              <div className="hidden md:flex flex-col items-center text-center ml-4 flex-shrink-0 bg-white/10 rounded-xl px-3 py-2">
                <span className="text-3xl mb-0.5">{week.badgeIcon}</span>
                <p className="text-[10px] text-indigo-200 font-medium">Earn: {week.badgeName}</p>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs text-indigo-200">
              <span>{completedCount} / {totalCount} subtopics</span>
              <span className="font-bold">{pct}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Topic cards */}
        {week.topics.map(topic => (
          <TopicCard
            key={topic.id}
            topic={topic}
            onQuiz={id => router.push(`/quiz/${id}`)}
            onProject={id => router.push(`/project/${id}`)}
          />
        ))}
      </div>
    </div>
  )
}
