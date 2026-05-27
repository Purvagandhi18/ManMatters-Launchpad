'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, BookOpen, ClipboardList,
  ExternalLink, ChevronDown, ChevronUp, Pencil, Loader2, RefreshCw, Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BadgeUnlockModal } from '@/components/ui/BadgeUnlockModal'

interface QuizAttempt {
  scorePct: number
  passed: boolean
  completedAt: string | null
  rawScore: number
  maxScore: number
}

interface SubtopicData {
  id: string
  title: string
  description: string
  tag: string
  sortOrder: number
  quiz: {
    id: string
    status: string
    passThreshold: number
    attempts: QuizAttempt[]
  } | null
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
  retryGrantedQuizIds: string[]
  weeklyBadgeProgress?: {
    perfectionist: { total: number; qualified: number; unlocked: boolean }
    shipIt:        { total: number; graded: number;     unlocked: boolean }
  }
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

// ─── State icons ───────────────────────────────────────────────────────────
function GreenDot() {
  return (
    <div className="w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <polyline points="2,5 4.2,7.2 8,2.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function PartialRing() {
  const size = 18, cx = 9, cy = 9, r = 6.5
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E4DEFF" strokeWidth="2.5" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#7C3AED" strokeWidth="2.5"
        strokeDasharray={`${c * 0.55} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </svg>
  )
}

function OutlineCircle() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" className="flex-shrink-0">
      <circle cx="9" cy="9" r="6.5" fill="none" stroke="#D1D5DB" strokeWidth="2" />
    </svg>
  )
}

// ─── Reflection panel ──────────────────────────────────────────────────────
function ReflectionPanel({
  topicId,
  topicTitle,
  initialReflection,
  onReflectionUpdate,
  onBadgesEarned,
}: {
  topicId: string
  topicTitle: string
  initialReflection: Reflection | null
  onReflectionUpdate: (r: Reflection) => void
  onBadgesEarned?: (badges: { name: string; description: string; iconEmoji: string }[]) => void
}) {
  const [reflection, setReflection] = useState<Reflection | null>(initialReflection)
  const [text, setText]             = useState(initialReflection?.content ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

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
    onReflectionUpdate(data)
    if (data.badgesEarned?.length > 0) onBadgesEarned?.(data.badgesEarned)
    setSubmitting(false)
  }

  const isApproved    = reflection?.status === 'approved'
  const needsRevision = reflection?.status === 'needs_revision'
  const canEdit       = !reflection || needsRevision

  return (
    <div className={cn(
      'mx-5 mb-5 rounded-xl border p-4',
      isApproved    ? 'bg-emerald-50 border-emerald-200' :
      needsRevision ? 'bg-amber-50 border-amber-200'    :
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

      {reflection?.aiFeedback && (
        <p className={cn(
          'text-xs mb-3 leading-relaxed',
          isApproved ? 'text-emerald-700' : 'text-amber-700'
        )}>
          {reflection.aiFeedback}
        </p>
      )}

      {isApproved && reflection && (
        <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-emerald-100 leading-relaxed">
          {reflection.content}
        </p>
      )}

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
            {submitting
              ? <><Loader2 size={12} className="animate-spin" /> Evaluating…</>
              : needsRevision
              ? <><RefreshCw size={12} /> Resubmit</>
              : 'Submit Reflection'
            }
          </button>
        </>
      )}
    </div>
  )
}

// ─── Topic card ────────────────────────────────────────────────────────────
function TopicCard({ topic, onQuiz, onProject, retryGrantedQuizIds, onBadgesEarned }: {
  topic: TopicData
  onQuiz: (quizId: string) => void
  onProject: (projectId: string) => void
  retryGrantedQuizIds: string[]
  onBadgesEarned?: (badges: { name: string; description: string; iconEmoji: string }[]) => void
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(true)
  const [topicReflection, setTopicReflection] = useState<Reflection | null | undefined>(undefined)

  const completedCount = topic.subtopics.filter(s => {
    const p = s.userProgress[0]
    return p?.quizPassed || p?.completedAt || p?.projectSubmitted
  }).length
  const attemptedCount = topic.subtopics.filter(s => {
    const prog = s.userProgress[0]
    if (prog?.quizPassed || prog?.completedAt || prog?.projectSubmitted) return false
    return !!s.quiz?.attempts?.[0]?.completedAt
  }).length
  const total        = topic.subtopics.length
  const allDone      = completedCount === total && total > 0
  const completedPct = total > 0 ? (completedCount / total) * 100 : 0
  const attemptedPct = total > 0 ? (attemptedCount / total) * 100 : 0
  const isTech       = topic.tag === 'tech'

  useEffect(() => {
    if (!allDone) return
    fetch(`/api/topics/${topic.id}/reflection`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setTopicReflection(d ?? null))
      .catch(() => setTopicReflection(null))
  }, [allDone, topic.id])

  const reflectionLoaded   = topicReflection !== undefined
  const reflectionApproved = topicReflection?.status === 'approved'
  const reflectionPending  = allDone && reflectionLoaded && !reflectionApproved

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
            isTech ? 'bg-brand-100 text-brand-700' : 'bg-orange-100 text-orange-700'
          )}>
            {topic.tag.toUpperCase()}
          </span>
          <h2 className="font-bold text-[#1A1033] text-sm truncate">{topic.title}</h2>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {reflectionPending && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex-shrink-0">
              <Pencil size={8} /> Reflection needed
            </span>
          )}
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-[#E4DEFF] rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${completedPct}%` }} />
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${attemptedPct}%` }} />
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
            const progress          = subtopic.userProgress[0]
            const latestAttempt     = subtopic.quiz?.attempts?.[0]
            const quizPassed        = progress?.quizPassed
            const quizAttempted     = !!latestAttempt?.completedAt
            const quizFailed        = quizAttempted && !quizPassed
            const projectSubmitted  = progress?.projectSubmitted
            const isCompleted       = quizPassed || (progress?.completedAt != null)
            const isInProgress      = !isCompleted && quizFailed
            const retryGranted      = retryGrantedQuizIds.includes(subtopic.quiz?.id ?? '')

            return (
              <div
                key={subtopic.id}
                className={cn(
                  'px-5 py-3.5 flex items-start gap-3',
                  idx > 0 && 'border-t border-[#F5F3FF]',
                  isCompleted && 'bg-[#FAFFFE]'
                )}
              >
                {/* State icon */}
                <div className="mt-0.5">
                  {isCompleted  ? <GreenDot />    :
                   isInProgress ? <PartialRing /> :
                   <OutlineCircle />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium leading-snug',
                    isCompleted ? 'text-gray-400' : 'text-[#1A1033]'
                  )}>
                    {subtopic.title}
                  </p>

                  {/* Status chips */}
                  {(quizPassed || quizFailed || projectSubmitted) && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {quizPassed && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <BookOpen size={9} /> Quiz ✓
                        </span>
                      )}
                      {quizFailed && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                          NOT CLEARED · {Math.round(latestAttempt!.scorePct)}%
                        </span>
                      )}
                      {projectSubmitted && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ClipboardList size={9} /> Project ✓
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex-shrink-0 flex gap-2 mt-0.5">
                  {subtopic.quiz?.status === 'live' && (
                    quizAttempted ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-600 tabular-nums">
                          {latestAttempt!.rawScore}/{latestAttempt!.maxScore}
                        </span>
                        <button
                          onClick={() => router.push(`/quiz/${subtopic.quiz!.id}/review`)}
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                          title="Review attempt"
                        >
                          <Eye size={14} />
                        </button>
                        {retryGranted && !quizPassed && (
                          <button
                            onClick={() => onQuiz(subtopic.quiz!.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                            title="Admin override: retry granted"
                          >
                            <BookOpen size={11} /> Retake
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => onQuiz(subtopic.quiz!.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                      >
                        <BookOpen size={12} /> Quiz
                      </button>
                    )
                  )}
                  {subtopic.project?.isPublished && (
                    projectSubmitted ? (
                      <button
                        onClick={() => onProject(subtopic.project!.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                      >
                        <ClipboardList size={12} /> View
                      </button>
                    ) : (
                      <button
                        onClick={() => onProject(subtopic.project!.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                      >
                        <ClipboardList size={12} /> Project
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}

          {/* Reflection section — shows as soon as all subtopics are done */}
          {allDone && (
            <div className="border-t border-[#F0ECFF]">
              {reflectionLoaded ? (
                <ReflectionPanel
                  topicId={topic.id}
                  topicTitle={topic.title}
                  initialReflection={topicReflection}
                  onReflectionUpdate={(r) => setTopicReflection(r)}
                  onBadgesEarned={onBadgesEarned}
                />
              ) : (
                <div className="mx-5 my-4 h-28 rounded-xl bg-[#F5F3FF] animate-pulse" />
              )}
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
  const [week, setWeek]     = useState<WeekData | null>(null)
  const [loading, setLoading] = useState(true)
  const [unlockedBadge, setUnlockedBadge] = useState<{ name: string; description: string; iconEmoji: string } | null>(null)

  useEffect(() => {
    fetch(`/api/weeks/${params.id}`)
      .then(r => r.json())
      .then(data => { setWeek(data); setLoading(false) })
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6FF]">
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
  const completedCount = allSubtopics.filter(s => {
    const p = s.userProgress[0]
    return p?.quizPassed || p?.completedAt || p?.projectSubmitted
  }).length
  const attemptedCount = allSubtopics.filter(s => {
    const prog = s.userProgress[0]
    if (prog?.quizPassed || prog?.completedAt || prog?.projectSubmitted) return false
    return !!s.quiz?.attempts?.[0]?.completedAt
  }).length
  const totalCount   = allSubtopics.length
  const completedPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const attemptedPct = totalCount > 0 ? (attemptedCount / totalCount) * 100 : 0

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
              <span>
                {completedCount} completed{attemptedCount > 0 ? ` · ${attemptedCount} in progress` : ''}
              </span>
              <span className="font-bold">{Math.round(completedPct)}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden flex">
              <div className="h-full bg-white transition-all duration-500" style={{ width: `${completedPct}%` }} />
              <div className="h-full bg-amber-300/80 transition-all duration-500" style={{ width: `${attemptedPct}%` }} />
            </div>
          </div>
        </div>

        {/* Weekly badge tease — compact strip */}
        {week.weeklyBadgeProgress && (() => {
          const { perfectionist: perf, shipIt: ship } = week.weeklyBadgeProgress!
          const pills: { icon: string; name: string; n: number; total: number; unlocked: boolean }[] = []
          if (perf.total > 0) pills.push({ icon: '💎', name: 'Perfectionist', n: perf.qualified, total: perf.total, unlocked: perf.unlocked })
          if (ship.total > 0) pills.push({ icon: '📦', name: 'Ship It', n: ship.graded, total: ship.total, unlocked: ship.unlocked })
          if (pills.length === 0) return null
          return (
            <div className="flex items-center gap-2 px-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex-shrink-0">Badges</span>
              {pills.map(p => (
                <span
                  key={p.name}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                    p.unlocked
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : p.n > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                  )}
                >
                  <span className={cn(!p.unlocked && p.n === 0 && 'grayscale opacity-60')}>{p.icon}</span>
                  {p.name}
                  {p.unlocked
                    ? <span className="text-emerald-500">✓</span>
                    : <span className="tabular-nums text-[10px] font-bold opacity-70">{p.n}/{p.total}</span>
                  }
                </span>
              ))}
            </div>
          )
        })()}

        {/* Topic cards */}
        {week.topics.map(topic => (
          <TopicCard
            key={topic.id}
            topic={topic}
            onQuiz={id => router.push(`/quiz/${id}`)}
            onProject={id => router.push(`/project/${id}`)}
            retryGrantedQuizIds={week.retryGrantedQuizIds ?? []}
            onBadgesEarned={(badges) => {
              if (badges.length > 0) setUnlockedBadge(badges[0])
            }}
          />
        ))}
      </div>

      {/* Badge unlock modal */}
      <BadgeUnlockModal
        open={!!unlockedBadge}
        badge={unlockedBadge}
        onClose={() => setUnlockedBadge(null)}
      />
    </div>
  )
}
