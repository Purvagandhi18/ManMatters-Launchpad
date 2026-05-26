'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, ExternalLink, ClipboardList, BookOpen, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

interface RubricCriterion {
  id: string
  name: string
  description: string
  maxMarks: number
  sortOrder: number
}

interface CriterionScore {
  id: string
  scoreAwarded: number
  criterion: RubricCriterion
}

interface ProjectGrade {
  id: string
  totalScore: number
  maxTotalScore: number
  scorePct: number
  feedbackText?: string | null
  gradedAt: string
  criterionScores: CriterionScore[]
}

interface ProjectSubmission {
  id: string
  submissionLink?: string | null
  notes?: string | null
  submittedAt: string
  grade?: ProjectGrade | null
}

interface ProjectData {
  id: string
  title: string
  briefText: string
  expectedOutput: string
  criteria: RubricCriterion[]
  submissions: ProjectSubmission[]
}

type Tab = 'brief' | 'rubric' | 'submission' | 'feedback'

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('brief')
  const [submissionLink, setSubmissionLink] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${params.id}`)
      .then(r => r.json())
      .then(data => {
        setProject(data)
        if (data.submissions?.[0]) {
          setSubmitted(true)
          if (data.submissions[0].grade) setTab('feedback')
        }
        setLoading(false)
      })
  }, [params.id])

  async function handleSubmit() {
    setSubmitting(true)
    await fetch(`/api/projects/${params.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionLink, notes }),
    })
    setSubmitted(true)
    setSubmitting(false)
    // Refresh
    const data = await fetch(`/api/projects/${params.id}`).then(r => r.json())
    setProject(data)
    setTab('submission')
  }

  if (loading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Loading project…</p>
      </div>
    )
  }

  const latestSubmission = project.submissions[0]
  const grade = latestSubmission?.grade

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'brief', label: 'Brief', icon: <BookOpen size={14} /> },
    { key: 'rubric', label: 'Rubric', icon: <ClipboardList size={14} /> },
    { key: 'submission', label: 'Submission', icon: <ExternalLink size={14} /> },
    ...(grade ? [{ key: 'feedback' as Tab, label: 'Feedback', icon: <Star size={14} /> }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white mb-6 shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-orange-100 text-xs font-semibold uppercase tracking-wide mb-1">Project</p>
              <h1 className="text-2xl font-bold">{project.title}</h1>
            </div>
            {submitted && (
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
                <CheckCircle2 size={16} />
                <span className="text-sm font-medium">{grade ? 'Graded' : 'Submitted'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors',
                  tab === t.key
                    ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Brief tab */}
            {tab === 'brief' && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-semibold text-gray-900 mb-3">What you need to do</h2>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{project.briefText}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h3 className="font-semibold text-amber-900 text-sm mb-2">Expected Output</h3>
                  <p className="text-sm text-amber-800 leading-relaxed">{project.expectedOutput}</p>
                </div>
                <Button onClick={() => setTab('rubric')} className="bg-orange-500 hover:bg-orange-600">
                  View Rubric →
                </Button>
              </div>
            )}

            {/* Rubric tab */}
            {tab === 'rubric' && (
              <div className="space-y-4">
                <h2 className="font-semibold text-gray-900 mb-4">
                  Marking Criteria · {project.criteria.reduce((s, c) => s + c.maxMarks, 0)} marks total
                </h2>
                {project.criteria.map(criterion => (
                  <div key={criterion.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{criterion.name}</h3>
                      <span className="text-sm font-bold text-orange-600">{criterion.maxMarks} marks</span>
                    </div>
                    <p className="text-sm text-gray-600">{criterion.description}</p>
                  </div>
                ))}
                <Button onClick={() => setTab('submission')} className="bg-orange-500 hover:bg-orange-600 w-full">
                  {submitted ? 'View Submission' : 'Submit Your Work →'}
                </Button>
              </div>
            )}

            {/* Submission tab */}
            {tab === 'submission' && (
              <div className="space-y-4">
                {submitted && latestSubmission ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-green-700 mb-2">
                        <CheckCircle2 size={16} />
                        <span className="font-semibold text-sm">Submitted</span>
                        <span className="text-xs text-green-500 ml-auto">
                          {new Date(latestSubmission.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {latestSubmission.submissionLink && (
                        <a
                          href={latestSubmission.submissionLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-brand-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink size={12} />
                          {latestSubmission.submissionLink}
                        </a>
                      )}
                      {latestSubmission.notes && (
                        <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{latestSubmission.notes}</p>
                      )}
                    </div>
                    {!grade && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Your submission is awaiting review. Check back soon!
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h2 className="font-semibold text-gray-900">Submit Your Work</h2>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Submission Link <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        value={submissionLink}
                        onChange={e => setSubmissionLink(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Notes (optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={4}
                        placeholder="Any context you want to share with your reviewer…"
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm resize-none"
                      />
                    </div>
                    <Button
                      onClick={handleSubmit}
                      disabled={!submissionLink || submitting}
                      className="bg-orange-500 hover:bg-orange-600 w-full"
                    >
                      {submitting ? 'Submitting…' : 'Submit Project'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Feedback tab */}
            {tab === 'feedback' && grade && (
              <div className="space-y-5">
                <div className={cn(
                  'rounded-2xl p-6 text-center',
                  grade.scorePct >= 70 ? 'bg-green-50' : 'bg-amber-50'
                )}>
                  <p className="text-4xl font-bold mb-1 text-gray-900">
                    {grade.totalScore}/{grade.maxTotalScore}
                  </p>
                  <p className={cn(
                    'text-sm font-semibold',
                    grade.scorePct >= 70 ? 'text-green-700' : 'text-amber-700'
                  )}>
                    {Math.round(grade.scorePct)}%: {grade.scorePct >= 90 ? 'Excellent' : grade.scorePct >= 70 ? 'Good work' : 'Needs improvement'}
                  </p>
                </div>

                <div className="space-y-3">
                  {grade.criterionScores.map(cs => (
                    <div key={cs.id} className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{cs.criterion.name}</p>
                        <p className="text-xs text-gray-500">{cs.criterion.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <span className="text-sm font-bold text-gray-900">
                          {cs.scoreAwarded}
                        </span>
                        <span className="text-sm text-gray-400">/{cs.criterion.maxMarks}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {grade.feedbackText && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 text-sm mb-2">Reviewer Feedback</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{grade.feedbackText}</p>
                  </div>
                )}

                <Button onClick={() => router.back()} variant="secondary" className="w-full">
                  Back to Week
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
