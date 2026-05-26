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

interface QuizAttempt {
  id: string
  attemptNumber: number
  scorePct: number
  passed: boolean
  completedAt?: string | null
  quiz: { id: string; subtopic: { id: string; title: string } }
}

interface SubtopicProgress {
  subtopicId: string
  isCompleted: boolean
  completedAt?: string | null
  subtopic: { id: string; title: string; topic: { week: { number: number } } }
}

interface ProjectSubmission {
  id: string
  submissionLink?: string | null
  submittedAt: string
  project: { title: string }
  grade?: {
    totalScore: number
    maxTotalScore: number
    scorePct: number
    feedbackText?: string | null
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
}

export default function LearnerDetailPage() {
  const params = useParams()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetch(`/api/admin/progress/${params.userId}`)
      .then(r => r.json())
      .then(data => {
        setUser(data)
        setLoading(false)
      })
  }, [params.userId])

  function toggleWeek(num: number) {
    setExpandedWeeks(prev => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
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
  const passedAttempts = user.quizAttempts.filter(a => a.passed)
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
              const weekSubtopics = user.subtopicProgress.filter(
                sp => sp.subtopic.topic.week.number === weekNum
              )

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
                      {weekSubtopics.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {weekSubtopics.filter(sp => sp.isCompleted).length}/{weekSubtopics.length} subtopics
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
                      {weekSubtopics.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No subtopics started yet.</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-gray-400 uppercase tracking-wide">
                              <th className="text-left pb-2 font-medium">Subtopic</th>
                              <th className="text-center pb-2 font-medium w-28">Status</th>
                              <th className="text-center pb-2 font-medium w-28">Quiz Score</th>
                              <th className="text-center pb-2 font-medium w-20">Attempts</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {weekSubtopics.map(sp => {
                              const attempts = user.quizAttempts.filter(
                                a => a.quiz.subtopic.id === sp.subtopicId
                              )
                              const bestPassed = attempts
                                .filter(a => a.passed)
                                .sort((a, b) => b.scorePct - a.scorePct)[0]

                              return (
                                <tr key={sp.subtopicId} className="text-gray-700">
                                  <td className="py-2.5 pr-4">{sp.subtopic.title}</td>
                                  <td className="py-2.5 text-center">
                                    {sp.isCompleted
                                      ? <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium"><CheckCircle2 size={11} /> Passed</span>
                                      : <span className="text-xs text-gray-400">Not started</span>
                                    }
                                  </td>
                                  <td className="py-2.5 text-center">
                                    {bestPassed
                                      ? <span className={`font-bold text-sm ${bestPassed.scorePct >= 90 ? 'text-green-600' : bestPassed.scorePct >= 70 ? 'text-yellow-600' : 'text-red-500'}`}>
                                          {Math.round(bestPassed.scorePct)}%
                                        </span>
                                      : attempts.length > 0
                                        ? <span className="text-xs text-red-500 font-medium">{Math.round(attempts[0].scorePct)}%</span>
                                        : <span className="text-gray-300">—</span>
                                    }
                                  </td>
                                  <td className="py-2.5 text-center text-gray-500 text-xs">
                                    {attempts.length > 0 ? attempts.length : '—'}
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
          <div className="divide-y divide-gray-50">
            {user.quizAttempts.slice(0, 20).map(attempt => (
              <div key={attempt.id} className="flex items-center gap-4 px-6 py-3">
                <div className="flex-shrink-0">
                  {attempt.passed
                    ? <CheckCircle2 size={16} className="text-green-500" />
                    : <XCircle size={16} className="text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{attempt.quiz.subtopic.title}</p>
                  <p className="text-xs text-gray-400">Attempt #{attempt.attemptNumber}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${attempt.passed ? 'text-green-600' : 'text-red-500'}`}>
                    {Math.round(attempt.scorePct)}%
                  </p>
                  <p className="text-xs text-gray-400">
                    {attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
            ))}
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
          <div className="divide-y divide-gray-50">
            {user.projectSubmissions.map(sub => (
              <div key={sub.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sub.project.title}</p>
                    <p className="text-xs text-gray-400">{new Date(sub.submittedAt).toLocaleDateString()}</p>
                    {sub.submissionLink && (
                      <a href={sub.submissionLink} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:underline flex items-center gap-1 mt-1">
                        <ExternalLink size={10} /> View
                      </a>
                    )}
                  </div>
                  {sub.grade ? (
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-700">{sub.grade.totalScore}/{sub.grade.maxTotalScore}</p>
                      <p className="text-xs text-gray-400">{Math.round(sub.grade.scorePct)}%</p>
                    </div>
                  ) : (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Awaiting grade</span>
                  )}
                </div>
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
