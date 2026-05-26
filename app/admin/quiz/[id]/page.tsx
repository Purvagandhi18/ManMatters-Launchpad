'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Button } from '@/components/ui/Button'
import { Trash2, Plus, ChevronRight, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface AnswerOption {
  id: string
  text: string
  isCorrect: boolean
  sortOrder: number
}

interface Question {
  id: string
  type: string
  text: string
  points: number
  sortOrder: number
  options: AnswerOption[]
}

interface QuizData {
  id: string
  status: string
  passThreshold: number
  subtopic: { id: string; title: string }
  questions: Question[]
}

const emptyMCQ = {
  type: 'mcq',
  text: '',
  points: 1,
  options: [
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
}

const emptyTF = {
  type: 'true_false',
  text: '',
  points: 1,
  options: [
    { text: 'True', isCorrect: false },
    { text: 'False', isCorrect: false },
  ],
}

export default function QuizEditorPage() {
  const params = useParams()
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [loading, setLoading] = useState(true)
  const [addType, setAddType] = useState<'mcq' | 'true_false' | null>(null)
  const [newQ, setNewQ] = useState<typeof emptyMCQ | typeof emptyTF>(emptyMCQ)
  const [saving, setSaving] = useState(false)
  const [approvingSaving, setApprovingSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/quizzes/${params.id}`)
      .then(r => r.json())
      .then(data => {
        setQuiz(data)
        setLoading(false)
      })
  }, [params.id])

  function startAdd(type: 'mcq' | 'true_false') {
    setAddType(type)
    setNewQ(type === 'mcq' ? { ...emptyMCQ, options: emptyMCQ.options.map(o => ({ ...o })) } : { ...emptyTF, options: emptyTF.options.map(o => ({ ...o })) })
  }

  async function addQuestion() {
    setSaving(true)
    const res = await fetch(`/api/admin/quizzes/${params.id}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newQ),
    })
    const q = await res.json()
    setQuiz(prev => prev ? { ...prev, questions: [...prev.questions, q] } : prev)
    setAddType(null)
    setSaving(false)
  }

  async function deleteQuestion(qId: string) {
    if (!confirm('Delete this question?')) return
    await fetch(`/api/admin/questions/${qId}`, { method: 'DELETE' })
    setQuiz(prev => prev ? { ...prev, questions: prev.questions.filter(q => q.id !== qId) } : prev)
  }

  async function approveQuiz() {
    setApprovingSaving(true)
    await fetch(`/api/admin/quizzes/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'live' }),
    })
    setQuiz(prev => prev ? { ...prev, status: 'live' } : prev)
    setApprovingSaving(false)
  }

  async function draftQuiz() {
    await fetch(`/api/admin/quizzes/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'draft' }),
    })
    setQuiz(prev => prev ? { ...prev, status: 'draft' } : prev)
  }

  function setOptionCorrect(optIdx: number) {
    setNewQ(q => ({
      ...q,
      options: q.options.map((o, i) => ({ ...o, isCorrect: i === optIdx })),
    }))
  }

  if (loading || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <main className="ml-60 flex-1 p-8 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/admin/curriculum" className="hover:text-brand-600">Curriculum</Link>
          <ChevronRight size={14} />
          <Link href={`/admin/curriculum/subtopic/${quiz.subtopic.id}`} className="hover:text-brand-600">
            {quiz.subtopic.title}
          </Link>
          <ChevronRight size={14} />
          <span className="text-gray-900 font-medium">Quiz Editor</span>
        </nav>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{quiz.subtopic.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${quiz.status === 'live' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {quiz.status}
              </span>
              <span className="text-xs text-gray-400">{quiz.questions.length} questions · Pass threshold: {quiz.passThreshold}%</span>
            </div>
          </div>
          <div className="flex gap-2">
            {quiz.status === 'live' ? (
              <Button size="sm" variant="secondary" onClick={draftQuiz}>Move to Draft</Button>
            ) : (
              <Button size="sm" onClick={approveQuiz} disabled={approvingSaving || quiz.questions.length === 0}>
                <CheckCircle2 size={14} className="mr-1" />
                {approvingSaving ? 'Saving…' : 'Approve & Go Live'}
              </Button>
            )}
          </div>
        </div>

        {/* Questions list */}
        <div className="space-y-4 mb-6">
          {quiz.questions.map((q, i) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">{q.type}</span>
                    <span className="text-xs text-gray-400">Q{i + 1} · {q.points} pt</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{q.text}</p>
                </div>
                <button onClick={() => deleteQuestion(q.id)} className="text-red-400 hover:text-red-600 ml-4 flex-shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="space-y-1.5">
                {q.options.map(opt => (
                  <div
                    key={opt.id}
                    className={`text-sm px-3 py-2 rounded-lg ${opt.isCorrect ? 'bg-green-50 text-green-800 font-medium border border-green-200' : 'bg-gray-50 text-gray-600 border border-gray-100'}`}
                  >
                    {opt.text} {opt.isCorrect && '✓'}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {quiz.questions.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-400 text-sm">No questions yet. Add your first question below.</p>
            </div>
          )}
        </div>

        {/* Add question */}
        {!addType && (
          <div className="flex gap-3">
            <Button size="sm" variant="secondary" onClick={() => startAdd('mcq')}>
              <Plus size={14} className="mr-1" /> MCQ
            </Button>
            <Button size="sm" variant="secondary" onClick={() => startAdd('true_false')}>
              <Plus size={14} className="mr-1" /> True / False
            </Button>
          </div>
        )}

        {addType && (
          <div className="bg-white rounded-xl border border-brand-300 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">
              New {addType === 'mcq' ? 'Multiple Choice' : 'True/False'} Question
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
              <textarea
                value={newQ.text}
                onChange={e => setNewQ(q => ({ ...q, text: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Enter your question…"
              />
            </div>

            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-gray-700">Options (click radio to mark correct)</label>
              {newQ.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="correct"
                    checked={opt.isCorrect}
                    onChange={() => setOptionCorrect(i)}
                    className="w-4 h-4 text-brand-600"
                  />
                  {addType === 'mcq' ? (
                    <input
                      type="text"
                      value={opt.text}
                      onChange={e => setNewQ(q => ({
                        ...q,
                        options: q.options.map((o, j) => j === i ? { ...o, text: e.target.value } : o),
                      }))}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  ) : (
                    <span className="text-sm text-gray-700">{opt.text}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button size="sm" variant="ghost" onClick={() => setAddType(null)}>Cancel</Button>
              <Button
                size="sm"
                onClick={addQuestion}
                disabled={saving || !newQ.text || !newQ.options.some(o => o.isCorrect)}
              >
                {saving ? 'Adding…' : 'Add Question'}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
