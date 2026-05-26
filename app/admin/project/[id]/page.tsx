'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ChevronRight, ExternalLink, Star } from 'lucide-react'
import Link from 'next/link'

interface RubricCriterion {
  id: string
  name: string
  description: string
  maxMarks: number
  sortOrder: number
}

interface CriterionScore {
  id: string
  criterionId: string
  scoreAwarded: number
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

interface Submission {
  id: string
  submissionLink?: string | null
  notes?: string | null
  submittedAt: string
  user: { id: string; displayName: string; email: string }
  grade?: ProjectGrade | null
}

interface ProjectData {
  id: string
  title: string
  briefText: string
  expectedOutput: string
  isPublished: boolean
  criteria: RubricCriterion[]
  submissions: Submission[]
}

export default function AdminProjectPage() {
  const params = useParams()
  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', briefText: '', expectedOutput: '' })
  const [saving, setSaving] = useState(false)
  const [gradeModal, setGradeModal] = useState<Submission | null>(null)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [feedback, setFeedback] = useState('')
  const [grading, setGrading] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/projects/${params.id}`)
      .then(r => r.json())
      .then(data => {
        setProject(data)
        setForm({ title: data.title, briefText: data.briefText, expectedOutput: data.expectedOutput })
        setLoading(false)
      })
  }, [params.id])

  async function save() {
    setSaving(true)
    await fetch(`/api/admin/projects/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
  }

  function openGradeModal(sub: Submission) {
    if (!project) return
    setGradeModal(sub)
    const initial: Record<string, number> = {}
    project.criteria.forEach(c => {
      initial[c.id] = sub.grade?.criterionScores.find(cs => cs.criterionId === c.id)?.scoreAwarded ?? 0
    })
    setScores(initial)
    setFeedback(sub.grade?.feedbackText ?? '')
  }

  async function submitGrade() {
    if (!gradeModal || !project) return
    setGrading(true)
    await fetch(`/api/projects/${params.id}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionId: gradeModal.id,
        criterionScores: project.criteria.map(c => ({
          criterionId: c.id,
          scoreAwarded: scores[c.id] ?? 0,
        })),
        feedbackText: feedback,
      }),
    })
    // Refresh
    const data = await fetch(`/api/admin/projects/${params.id}`).then(r => r.json())
    setProject(data)
    setGradeModal(null)
    setGrading(false)
  }

  if (loading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  const ungradedCount = project.submissions.filter(s => !s.grade).length

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <main className="ml-60 flex-1 p-8 max-w-5xl">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/admin/curriculum" className="hover:text-brand-600">Curriculum</Link>
          <ChevronRight size={14} />
          <span className="text-gray-900 font-medium">{project.title}: Project</span>
        </nav>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">{project.title}</h1>
          {ungradedCount > 0 && (
            <span className="bg-orange-100 text-orange-700 text-sm px-3 py-1 rounded-full font-medium">
              {ungradedCount} ungraded
            </span>
          )}
        </div>

        {/* Edit project */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">Project Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brief</label>
              <textarea
                value={form.briefText}
                onChange={e => setForm(f => ({ ...f, briefText: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Output</label>
              <textarea
                value={form.expectedOutput}
                onChange={e => setForm(f => ({ ...f, expectedOutput: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
          </div>
          <Button size="sm" onClick={save} disabled={saving} className="mt-4">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>

        {/* Rubric */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">
            Rubric · {project.criteria.reduce((s, c) => s + c.maxMarks, 0)} marks total
          </h2>
          <div className="space-y-3">
            {project.criteria.map(c => (
              <div key={c.id} className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.description}</p>
                </div>
                <span className="text-sm font-bold text-orange-600 flex-shrink-0 ml-4">{c.maxMarks} marks</span>
              </div>
            ))}
            {project.criteria.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">No rubric criteria defined</p>
            )}
          </div>
        </div>

        {/* Submissions */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Submissions ({project.submissions.length})</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {project.submissions.map(sub => (
              <div key={sub.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{sub.user.displayName}</p>
                    <p className="text-xs text-gray-400">{sub.user.email} · {new Date(sub.submittedAt).toLocaleDateString()}</p>
                    {sub.submissionLink && (
                      <a
                        href={sub.submissionLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        <ExternalLink size={10} /> {sub.submissionLink}
                      </a>
                    )}
                    {sub.notes && <p className="text-xs text-gray-500 mt-1 italic">{sub.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    {sub.grade ? (
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-700">{sub.grade.totalScore}/{sub.grade.maxTotalScore}</p>
                        <p className="text-xs text-gray-400">{Math.round(sub.grade.scorePct)}%</p>
                      </div>
                    ) : (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Ungraded</span>
                    )}
                    <Button size="sm" variant={sub.grade ? 'secondary' : 'primary'} onClick={() => openGradeModal(sub)}>
                      <Star size={12} className="mr-1" />
                      {sub.grade ? 'Re-grade' : 'Grade'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {project.submissions.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">
                No submissions yet
              </div>
            )}
          </div>
        </div>

        {/* Grade modal */}
        <Modal open={!!gradeModal} onClose={() => setGradeModal(null)} title="Grade Submission" size="lg">
          {gradeModal && project && (
            <div className="space-y-5">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-900">{gradeModal.user.displayName}</p>
                {gradeModal.submissionLink && (
                  <a href={gradeModal.submissionLink} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-brand-600 hover:underline flex items-center gap-1 mt-1">
                    <ExternalLink size={12} /> View Submission
                  </a>
                )}
                {gradeModal.notes && <p className="text-xs text-gray-500 mt-2 italic">{gradeModal.notes}</p>}
              </div>

              <div className="space-y-4">
                {project.criteria.map(c => (
                  <div key={c.id}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-900">{c.name}</label>
                      <span className="text-xs text-gray-500">/ {c.maxMarks}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{c.description}</p>
                    <input
                      type="number"
                      min={0}
                      max={c.maxMarks}
                      value={scores[c.id] ?? 0}
                      onChange={e => setScores(s => ({ ...s, [c.id]: Math.min(c.maxMarks, Math.max(0, parseInt(e.target.value) || 0)) }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feedback (optional)</label>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="Write feedback for the learner…"
                />
              </div>

              <div className="bg-brand-50 rounded-xl p-3 text-center">
                <p className="text-sm font-bold text-brand-700">
                  Total: {Object.values(scores).reduce((s, v) => s + v, 0)} / {project.criteria.reduce((s, c) => s + c.maxMarks, 0)} marks
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setGradeModal(null)} className="flex-1">Cancel</Button>
                <Button onClick={submitGrade} disabled={grading} className="flex-1">
                  {grading ? 'Submitting…' : 'Submit Grade'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </main>
    </div>
  )
}
