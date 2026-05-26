'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, CheckCircle2, Circle, BookOpen, ClipboardList, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SubtopicData {
  id: string
  title: string
  description: string
  tag: string
  sortOrder: number
  references: { id: string; title: string; url: string; refType: string }[]
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

export default function WeekPage() {
  const params = useParams()
  const router = useRouter()
  const [week, setWeek] = useState<WeekData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`/api/weeks/${params.id}`)
      .then(r => r.json())
      .then(data => {
        setWeek(data)
        // Expand all topics by default
        setExpandedTopics(new Set(data.topics?.map((t: TopicData) => t.id) ?? []))
        setLoading(false)
      })
  }, [params.id])

  function toggleTopic(topicId: string) {
    setExpandedTopics(prev => {
      const next = new Set(prev)
      if (next.has(topicId)) next.delete(topicId)
      else next.add(topicId)
      return next
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Loading week…</p>
      </div>
    )
  }

  if (!week) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Week not found.</p>
      </div>
    )
  }

  const allSubtopics = week.topics.flatMap(t => t.subtopics)
  const completedCount = allSubtopics.filter(
    s => s.userProgress[0]?.quizPassed || s.userProgress[0]?.completedAt
  ).length
  const totalCount = allSubtopics.length
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/dashboard" className="hover:text-brand-600 transition-colors">Dashboard</Link>
            <ChevronRight size={14} />
            <span className="text-gray-900 font-medium">Week {week.number}: {week.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Week hero */}
        <div className="bg-gradient-to-r from-brand-600 to-purple-600 rounded-2xl p-6 text-white mb-8 shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-brand-100 text-sm font-medium mb-1">WEEK {week.number}</p>
              <h1 className="text-2xl font-bold mb-2">
                {week.badgeIcon} {week.title}
              </h1>
              <p className="text-brand-100 text-sm max-w-xl">{week.description}</p>
            </div>
            {week.badgeName && (
              <div className="hidden md:flex flex-col items-center text-center ml-6 flex-shrink-0">
                <span className="text-4xl mb-1">{week.badgeIcon}</span>
                <p className="text-xs text-brand-200">Earn: {week.badgeName}</p>
              </div>
            )}
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex justify-between text-xs text-brand-100">
              <span>{completedCount} / {totalCount} subtopics completed</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* Topics */}
        <div className="space-y-4">
          {week.topics.map(topic => {
            const isExpanded = expandedTopics.has(topic.id)
            const topicCompleted = topic.subtopics.filter(
              s => s.userProgress[0]?.quizPassed || s.userProgress[0]?.completedAt
            ).length
            const topicTotal = topic.subtopics.length

            return (
              <div
                key={topic.id}
                className={cn(
                  'bg-white rounded-2xl border-2 overflow-hidden',
                  topic.tag === 'tech' ? 'border-brand-500' : 'border-orange-400'
                )}
              >
                <button
                  onClick={() => toggleTopic(topic.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'text-xs font-bold px-2 py-0.5 rounded-full',
                        topic.tag === 'tech'
                          ? 'bg-tech-bg text-tech-text'
                          : 'bg-marketing-bg text-marketing-text'
                      )}
                    >
                      {topic.tag.toUpperCase()}
                    </span>
                    <h2 className="font-bold text-gray-900">{topic.title}</h2>
                    <span className="text-sm text-gray-400">{topicCompleted}/{topicTotal}</span>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {topic.subtopics.map(subtopic => {
                      const progress = subtopic.userProgress[0]
                      const isQuizPassed = progress?.quizPassed
                      const isProjectSubmitted = progress?.projectSubmitted
                      const isCompleted = isQuizPassed || (progress?.completedAt != null)

                      return (
                        <div key={subtopic.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
                          <div className="flex-shrink-0">
                            {isCompleted
                              ? <CheckCircle2 size={20} className="text-green-500" />
                              : <Circle size={20} className="text-gray-300 group-hover:text-brand-400 transition-colors" />
                            }
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{subtopic.title}</p>
                            {subtopic.description && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{subtopic.description}</p>
                            )}
                            {subtopic.references.length > 0 && (
                              <div className="flex gap-2 mt-1 flex-wrap">
                                {subtopic.references.map(ref => (
                                  <a
                                    key={ref.id}
                                    href={ref.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <ExternalLink size={10} />
                                    {ref.title}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex-shrink-0">
                            {subtopic.quiz && subtopic.quiz.status === 'live' && (
                              <button
                                onClick={() => router.push(`/quiz/${subtopic.quiz!.id}`)}
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                                  isQuizPassed
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-brand-600 text-white hover:bg-brand-700'
                                )}
                              >
                                <BookOpen size={12} />
                                {isQuizPassed ? 'Passed' : 'Take Quiz'}
                              </button>
                            )}

                            {subtopic.project && subtopic.project.isPublished && (
                              <button
                                onClick={() => router.push(`/project/${subtopic.project!.id}`)}
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                                  isProjectSubmitted
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-orange-500 text-white hover:bg-orange-600'
                                )}
                              >
                                <ClipboardList size={12} />
                                {isProjectSubmitted ? 'Submitted' : 'View Project'}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
