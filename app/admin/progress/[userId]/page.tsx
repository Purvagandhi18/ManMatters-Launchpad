'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import Link from 'next/link'
import { ChevronRight, ChevronDown, ChevronUp, CheckCircle2, XCircle, ExternalLink, BookOpen } from 'lucide-react'
import { formatXP } from '@/lib/utils'

interface WeekProgress {
  id: string
  isUnlocked: boolean
  isCompleted: boolean
  week: { number: number; title: string }
}

interface QuizOption {
  id: string
  text: string
  isCorrect: boolean
}

interface QuizAttemptAnswer {
  id: string
  questionId: string
  selectedOptionId: string | null
  textResponse: string | null
  isCorrect: boolean | null
  question: { id: string; text: string; type: string; options: QuizOption[] }
  selectedOption: QuizOption | null
}

interface QuizAttempt {
  id: string
  attemptNumber: number
  scorePct: number
  rawScore: number
  maxScore: number
  passed: boolean
  completedAt?: string | null
  quiz: {
    id: string
    subtopic: {
      id: string
      title: string
      topic: { week: { number: number; title: string } }
    }
  }
  answers: QuizAttemptAnswer[]
}

interface SubtopicProgress {
  subtopicId: string
  quizPassed: boolean
  projectSubmitted: boolean
  projectGraded: boolean
  completedAt?: string | null
  subtopic: { id: string; title: string; topic: { week: { number: number } } }
}

interface RubricCriterion {
  id: string
  name: string
  description: string
  maxMarks: number
}

interface GradedCriterion {
  scoreAwarded: number
  criterion: { name: string; maxMarks: number }
}

interface ProjectSubmission {
  id: string
  submissionLink?: string | null
  notes?: string | null
  submittedAt: string
  project: {
    id: string
    title: string
    subtopicId: string
    criteria: RubricCriterion[]
  }
  grade?: {
    totalScore: number
    maxTotalScore: number
    scorePct: number
    feedbackText?: string | null
    criterionScores: GradedCriterion[]
  } | null
}

interface UserBadge {
  badge: { name: string; iconEmoji: string }
  earnedAt: string
}

interface TopicReflection {
  id: string
  content: string
  aiScore: number | null
  aiFeedback: string | null
  status: string
  submittedAt: string
  topic: { title: string; sortOrder: number }
}

interface UserDetail {
  id: string
  displayName: string
  email: string
  totalXP: number
  level: { level: number; name: string }
  streak: number
  weekProgress: WeekProgress[]
  subtopicProgress: SubtopicProgress[]
  quizAttempts: QuizAttempt[]
  projectSubmissions: ProjectSubmission[]
  userBadges: UserBadge[]
  topicReflections: TopicReflection[]
  retryGrantedQuizIds: string[]
}

export default function LearnerDetailPage() {
  const params = useParams()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set())
  const [expandedAttempts, setExpandedAttempts] = useState<Set<string>>(new Set())
  const [retryGrantedQuizIds, setRetryGrantedQuizIds] = useState<string[]>([])
  const [grantingQuizId, setGrantingQuizId] = useState<string | null>(null)
  const [gradingId, setGradingId] = useState<string | null>(null)
  const [criterionScores, setCriterionScores] = useState<Record<string, number>>({})
  const [feedbackText, setFeedbackText] = useState('')
  const [submittingGrade, setSubmittingGrade] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/progress/${params.userId}`)
      .then(r => r.json())
      .then(data => {
        if (!data?.quizAttempts) { setLoading(false); return }
        setUser(data)
        setRetryGrantedQuizIds(data.retryGrantedQuizIds ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.userId])

  async function grantRetry(quizId: string) {
    setGrantingQuizId(quizId)
    await fetch('/api/admin/overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'quiz_retry_grant', userId: params.userId, quizId }),
    })
    setRetryGrantedQuizIds(prev => [...prev, quizId])
    setGrantingQuizId(null)
  }

  function refreshUser() {
    fetch(`/api/admin/progress/${params.userId}`)
      .then(r => r.json())
      .then(data => {
        if (!data?.quizAttempts) return
        setUser(data)
        setRetryGrantedQuizIds(data.retryGrantedQuizIds ?? [])
      })
  }

  async function submitGrade(projectId: string, submissionId: string) {
    setSubmittingGrade(true)
    await fetch(`/api/projects/${projectId}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionId,
        criterionScores: Object.entries(criterionScores).map(([criterionId, scoreAwarded]) => ({
          criterionId, scoreAwarded,
        })),
        feedbackText,
      }),
    })
    setGradingId(null)
    setCriterionScores({})
    setFeedbackText('')
    setSubmittingGrade(false)
    refreshUser()
  }

  function toggleWeek(num: number) {
    setExpandedWeeks(prev => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  function toggleAttempt(id: string) {
    setExpandedAttempts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  // Group quiz attempts by week number (from subtopic title patterns isn't reliable,
  // so we just list all attempts grouped by pass/fail)
  const passedAttempts = (user.quizAttempts ?? []).filter(a => a.passed)
  const avgScore = passedAttempts.length > 0
    ? Math.round(passedAttempts.reduce((s, a) => s + a.scorePct, 0) / passedAttempts.length)
    : 0

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <main className="ml-60 flex-1 p-8 max-w-5xl">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/admin/progress" className="hover:text-brand-600">Progress</Link>
          <ChevronRight size={14} />
          <span className="text-gray-900 font-medium">{user.displayName}</span>
        </nav>

        {/* Hero */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xl">
              {user.displayName[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{user.displayName}</h1>
              <p className="text-gray-500 text-sm">{user.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-4 mt-5 pt-5 border-t border-gray-100">
            {[
              { label: 'Total XP', value: formatXP(user.totalXP) },
              { label: 'Level', value: `${user.level.level}: ${user.level.name}` },
              { label: 'Streak', value: `${user.streak}w` },
              { label: 'Avg Score', value: `${avgScore}%` },
              { label: 'Badges', value: String(user.userBadges.length) },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Week progress accordion */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Week Progress</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 8 }, (_, i) => i + 1).map(weekNum => {
              const progress = user.weekProgress.find(wp => wp.week.number === weekNum)
              const isExpanded = expandedWeeks.has(weekNum)
              const progressSubtopics = user.subtopicProgress.filter(
                sp => sp.subtopic.topic.week.number === weekNum
              )
              const progressIds = new Set(progressSubtopics.map(sp => sp.subtopicId))
              const weekAttempts = user.quizAttempts.filter(
                a => a.quiz.subtopic.topic.week.number === weekNum
              )
              const seenIds = new Set<string>()
              const attemptOnlySubtopics = weekAttempts
                .filter(a => !progressIds.has(a.quiz.subtopic.id) && !seenIds.has(a.quiz.subtopic.id) && seenIds.add(a.quiz.subtopic.id))
                .map(a => ({ id: a.quiz.subtopic.id, title: a.quiz.subtopic.title }))
              const totalTouched = progressSubtopics.length + attemptOnlySubtopics.length

              return (
                <div key={weekNum}>
                  <button
                    onClick={() => toggleWeek(weekNum)}
                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                      {weekNum}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{progress?.week.title ?? `Week ${weekNum}`}</p>
                      {totalTouched > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {progressSubtopics.filter(sp => sp.quizPassed || sp.completedAt).length} passed · {totalTouched} attempted
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {progress?.isCompleted && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Completed</span>}
                      {progress?.isUnlocked && !progress.isCompleted && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">In Progress</span>}
                      {!progress?.isUnlocked && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Locked</span>}
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="bg-gray-50 border-t border-gray-100 px-6 py-4">
                      {totalTouched === 0 ? (
                        <p className="text-sm text-gray-400 italic">No quiz attempts yet.</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-gray-400 uppercase tracking-wide">
                              <th className="text-left pb-2 font-medium">Subtopic</th>
                              <th className="text-center pb-2 font-medium w-28">Status</th>
                              <th className="text-center pb-2 font-medium w-28">Score</th>
                              <th className="text-center pb-2 font-medium w-20">Attempts</th>
                              <th className="text-center pb-2 font-medium w-28">Retry</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {/* Subtopics with progress records */}
                            {progressSubtopics.map(sp => {
                              const attempts = weekAttempts.filter(a => a.quiz.subtopic.id === sp.subtopicId)
                              const latestAttempt = attempts[attempts.length - 1]
                              const isCleared = sp.quizPassed || !!sp.completedAt
                              const hasRetryGrant = attempts.length > 0 && retryGrantedQuizIds.includes(attempts[0].quiz.id)
                              const canGrant = !isCleared && attempts.length > 0 && attempts.length < 2 && !hasRetryGrant
                              return (
                                <tr key={sp.subtopicId} className="text-gray-700">
                                  <td className="py-2.5 pr-4 font-medium">{sp.subtopic.title}</td>
                                  <td className="py-2.5 text-center">
                                    {isCleared
                                      ? <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium"><CheckCircle2 size={11} /> Cleared</span>
                                      : sp.projectSubmitted
                                      ? <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">Submitted</span>
                                      : <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium"><XCircle size={11} /> Not cleared</span>
                                    }
                                  </td>
                                  <td className="py-2.5 text-center">
                                    {latestAttempt
                                      ? <span className={`font-bold text-sm ${latestAttempt.passed ? 'text-green-600' : 'text-red-500'}`}>
                                          {latestAttempt.rawScore}/{latestAttempt.maxScore} ({Math.round(latestAttempt.scorePct)}%)
                                        </span>
                                      : <span className="text-gray-300">—</span>
                                    }
                                  </td>
                                  <td className="py-2.5 text-center text-gray-500 text-xs">{attempts.length || '—'}</td>
                                  <td className="py-2.5 text-center">
                                    {hasRetryGrant
                                      ? <span className="text-xs text-amber-600 font-medium px-2 py-0.5 bg-amber-50 rounded-full border border-amber-200">Granted</span>
                                      : canGrant
                                      ? <button
                                          onClick={() => grantRetry(attempts[0].quiz.id)}
                                          disabled={grantingQuizId === attempts[0].quiz.id}
                                          className="text-xs px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 font-medium"
                                        >
                                          {grantingQuizId === attempts[0].quiz.id ? '…' : 'Grant'}
                                        </button>
                                      : <span className="text-gray-300">—</span>
                                    }
                                  </td>
                                </tr>
                              )
                            })}
                            {/* Subtopics with only failed attempts (no progress record) */}
                            {attemptOnlySubtopics.map(sub => {
                              const attempts = weekAttempts.filter(a => a.quiz.subtopic.id === sub.id)
                              const latestAttempt = attempts[attempts.length - 1]
                              const hasRetryGrant = retryGrantedQuizIds.includes(attempts[0]?.quiz.id)
                              const canGrant = attempts.length > 0 && attempts.length < 2 && !hasRetryGrant
                              return (
                                <tr key={sub.id} className="text-gray-700">
                                  <td className="py-2.5 pr-4 font-medium">{sub.title}</td>
                                  <td className="py-2.5 text-center">
                                    <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium"><XCircle size={11} /> Not cleared</span>
                                  </td>
                                  <td className="py-2.5 text-center">
                                    {latestAttempt
                                      ? <span className="font-bold text-sm text-red-500">
                                          {latestAttempt.rawScore}/{latestAttempt.maxScore} ({Math.round(latestAttempt.scorePct)}%)
                                        </span>
                                      : <span className="text-gray-300">—</span>
                                    }
                                  </td>
                                  <td className="py-2.5 text-center text-gray-500 text-xs">{attempts.length}</td>
                                  <td className="py-2.5 text-center">
                                    {hasRetryGrant
                                      ? <span className="text-xs text-amber-600 font-medium px-2 py-0.5 bg-amber-50 rounded-full border border-amber-200">Granted</span>
                                      : canGrant
                                      ? <button
                                          onClick={() => grantRetry(attempts[0].quiz.id)}
                                          disabled={grantingQuizId === attempts[0].quiz.id}
                                          className="text-xs px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 font-medium"
                                        >
                                          {grantingQuizId === attempts[0].quiz.id ? '…' : 'Grant'}
                                        </button>
                                      : <span className="text-gray-300">—</span>
                                    }
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Quiz attempts */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Quiz Attempts ({user.quizAttempts.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {user.quizAttempts.map(attempt => {
              const attemptsForQuiz = user.quizAttempts.filter(a => a.quiz.id === attempt.quiz.id)
              const isLatest = Math.max(...attemptsForQuiz.map(a => a.attemptNumber)) === attempt.attemptNumber
              const hasRetryGrant = retryGrantedQuizIds.includes(attempt.quiz.id)
              const canGrant = isLatest && !attempt.passed && attemptsForQuiz.length < 2 && !hasRetryGrant
              const isExpanded = expandedAttempts.has(attempt.id)
              const weekNum = attempt.quiz.subtopic.topic.week.number

              return (
                <div key={attempt.id}>
                  <div
                    className="flex items-center gap-4 px-6 py-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleAttempt(attempt.id)}
                  >
                    <div className="flex-shrink-0">
                      {attempt.passed
                        ? <CheckCircle2 size={16} className="text-green-500" />
                        : <XCircle size={16} className="text-red-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{attempt.quiz.subtopic.title}</p>
                      <p className="text-xs text-gray-400">
                        Week {weekNum} · Attempt #{attempt.attemptNumber}
                        {attempt.passed ? ' · Cleared' : ' · Not cleared'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 mr-3">
                      <p className={`text-sm font-bold ${attempt.passed ? 'text-green-600' : 'text-red-500'}`}>
                        {attempt.rawScore}/{attempt.maxScore} ({Math.round(attempt.scorePct)}%)
                      </p>
                      <p className="text-xs text-gray-400">
                        {attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    {hasRetryGrant && !attempt.passed && (
                      <span className="text-xs text-amber-600 font-medium px-2 py-0.5 bg-amber-50 rounded-full border border-amber-200 flex-shrink-0">Retry granted</span>
                    )}
                    {canGrant && (
                      <button
                        onClick={e => { e.stopPropagation(); grantRetry(attempt.quiz.id) }}
                        disabled={grantingQuizId === attempt.quiz.id}
                        className="text-xs px-2.5 py-1 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors font-medium flex-shrink-0"
                      >
                        {grantingQuizId === attempt.quiz.id ? 'Granting…' : 'Grant retry'}
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
                  </div>

                  {isExpanded && attempt.answers.length > 0 && (
                    <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 space-y-3">
                      {attempt.answers.map((ans, qi) => {
                        const isShortAnswer = ans.question.type === 'short_answer'
                        const correct = ans.question.options.find(o => o.isCorrect)
                        return (
                          <div key={ans.id} className="bg-white rounded-lg border border-gray-200 p-3">
                            <p className="text-xs font-semibold text-gray-700 mb-2">
                              Q{qi + 1}: {ans.question.text}
                            </p>
                            {isShortAnswer ? (
                              <div className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                                {ans.textResponse || <span className="text-gray-400 italic">No answer</span>}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {ans.question.options.map(opt => {
                                  const isSelected = opt.id === ans.selectedOptionId
                                  const isCorrectOpt = opt.isCorrect
                                  return (
                                    <div
                                      key={opt.id}
                                      className={`text-xs px-2 py-1 rounded flex items-center gap-2 ${
                                        isCorrectOpt && isSelected ? 'bg-green-100 text-green-800 font-medium' :
                                        isSelected && !isCorrectOpt ? 'bg-red-100 text-red-800 font-medium' :
                                        isCorrectOpt ? 'bg-green-50 text-green-700' :
                                        'text-gray-500'
                                      }`}
                                    >
                                      {isSelected && isCorrectOpt && <CheckCircle2 size={11} className="text-green-600 flex-shrink-0" />}
                                      {isSelected && !isCorrectOpt && <XCircle size={11} className="text-red-500 flex-shrink-0" />}
                                      {!isSelected && isCorrectOpt && <CheckCircle2 size={11} className="text-green-400 flex-shrink-0" />}
                                      {!isSelected && !isCorrectOpt && <span className="w-[11px] flex-shrink-0" />}
                                      {opt.text}
                                      {isSelected && <span className="ml-auto text-[10px] opacity-70">{isCorrectOpt ? 'correct' : 'selected'}</span>}
                                      {!isSelected && isCorrectOpt && <span className="ml-auto text-[10px] opacity-70">correct answer</span>}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
            {user.quizAttempts.length === 0 && (
              <div className="px-6 py-6 text-center text-gray-400 text-sm">No quiz attempts yet</div>
            )}
          </div>
        </div>

        {/* Project submissions */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Project Submissions ({user.projectSubmissions.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {user.projectSubmissions.map(sub => (
              <div key={sub.id}>
                {/* Submission header row */}
                <div className="px-6 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{sub.project.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(sub.submittedAt).toLocaleDateString()}</p>
                    {sub.submissionLink && (
                      <a href={sub.submissionLink} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1 mt-1">
                        <ExternalLink size={10} /> View submission
                      </a>
                    )}
                    {sub.notes && (
                      <p className="text-xs text-gray-500 mt-1.5 italic">"{sub.notes}"</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-3">
                    {sub.grade ? (
                      <div className="text-right">
                        <p className={`text-sm font-bold ${sub.grade.scorePct >= 70 ? 'text-green-700' : 'text-amber-700'}`}>
                          {sub.grade.totalScore}/{sub.grade.maxTotalScore} ({Math.round(sub.grade.scorePct)}%)
                        </p>
                        <p className="text-xs text-gray-400">Graded</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setGradingId(sub.id)
                          setCriterionScores(Object.fromEntries(sub.project.criteria.map(c => [c.id, 0])))
                          setFeedbackText('')
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 font-medium transition-colors"
                      >
                        Grade
                      </button>
                    )}
                  </div>
                </div>

                {/* Graded criterion breakdown */}
                {sub.grade && sub.grade.criterionScores.length > 0 && (
                  <div className="px-6 pb-4">
                    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                      {sub.grade.criterionScores.map((cs, i) => (
                        <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-gray-200' : ''}`}>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-900">{cs.criterion.name}</p>
                          </div>
                          <span className="text-xs font-bold text-gray-700 ml-4 flex-shrink-0">
                            {cs.scoreAwarded}<span className="text-gray-400 font-normal">/{cs.criterion.maxMarks}</span>
                          </span>
                        </div>
                      ))}
                      {sub.grade.feedbackText && (
                        <div className="border-t border-gray-200 px-4 py-3 bg-white">
                          <p className="text-xs text-gray-500 font-medium mb-1">Feedback</p>
                          <p className="text-xs text-gray-700 leading-relaxed">{sub.grade.feedbackText}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Inline grading form */}
                {gradingId === sub.id && (
                  <div className="px-6 pb-5 bg-orange-50 border-t border-orange-100">
                    <p className="text-xs font-bold text-orange-800 uppercase tracking-wide pt-4 pb-3">
                      Grade · {sub.project.criteria.reduce((s, c) => s + c.maxMarks, 0)} marks total
                    </p>
                    <div className="space-y-3 mb-4">
                      {sub.project.criteria.map(c => (
                        <div key={c.id} className="bg-white rounded-xl border border-orange-200 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-900">{c.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <input
                                type="number"
                                min={0}
                                max={c.maxMarks}
                                value={criterionScores[c.id] ?? 0}
                                onChange={e => setCriterionScores(s => ({ ...s, [c.id]: Math.min(c.maxMarks, Math.max(0, Number(e.target.value))) }))}
                                className="w-14 text-center text-sm font-bold border border-orange-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-400"
                              />
                              <span className="text-xs text-gray-400">/ {c.maxMarks}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Feedback for learner</label>
                      <textarea
                        value={feedbackText}
                        onChange={e => setFeedbackText(e.target.value)}
                        rows={3}
                        placeholder="Add constructive feedback…"
                        className="w-full text-sm rounded-lg border border-orange-300 bg-white px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-600 flex-1">
                        Total: <span className="font-bold text-gray-900">
                          {Object.values(criterionScores).reduce((s, v) => s + v, 0)}/{sub.project.criteria.reduce((s, c) => s + c.maxMarks, 0)}
                        </span>
                      </div>
                      <button
                        onClick={() => { setGradingId(null); setCriterionScores({}); setFeedbackText('') }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => submitGrade(sub.project.id, sub.id)}
                        disabled={submittingGrade}
                        className="text-xs px-4 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 font-semibold transition-colors"
                      >
                        {submittingGrade ? 'Submitting…' : 'Submit Grade'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {user.projectSubmissions.length === 0 && (
              <div className="px-6 py-6 text-center text-gray-400 text-sm">No project submissions yet</div>
            )}
          </div>
        </div>

        {/* Badges */}
        {user.userBadges.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h2 className="font-bold text-gray-900 mb-4">Badges Earned</h2>
            <div className="flex flex-wrap gap-3">
              {user.userBadges.map((ub, i) => (
                <div key={i} className="flex items-center gap-2 bg-brand-50 rounded-xl px-3 py-2">
                  <span className="text-xl">{ub.badge.iconEmoji}</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{ub.badge.name}</p>
                    <p className="text-xs text-gray-400">{new Date(ub.earnedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Topic Reflections */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <BookOpen size={16} className="text-brand-600" />
            <h2 className="font-bold text-gray-900">Topic Reflections ({user.topicReflections.length})</h2>
          </div>
          {user.topicReflections.length === 0 ? (
            <div className="px-6 py-6 text-center text-gray-400 text-sm">No reflections submitted yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {user.topicReflections.map(r => (
                <div key={r.id} className="px-6 py-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-900">{r.topic.title}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {r.aiScore != null && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {r.aiScore.toFixed(1)} / 10
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.status === 'approved' ? 'bg-green-100 text-green-700' :
                        r.status === 'needs_revision' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {r.status === 'approved' ? 'Approved' : r.status === 'needs_revision' ? 'Needs revision' : 'Submitted'}
                      </span>
                      <span className="text-xs text-gray-400">{new Date(r.submittedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 mb-3 leading-relaxed border border-gray-100">
                    {r.content}
                  </p>
                  {r.aiFeedback && (
                    <div className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                      r.status === 'approved' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-amber-50 text-amber-800 border border-amber-100'
                    }`}>
                      <span className="font-semibold">AI feedback: </span>{r.aiFeedback}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
