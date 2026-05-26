'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { Trash2, Plus, ExternalLink, ChevronRight } from 'lucide-react'

interface ReferenceData {
  id: string
  title: string
  url: string
  refType: string
}

interface SubtopicData {
  id: string
  title: string
  description: string
  tag: string
  references: ReferenceData[]
  quiz: { id: string; status: string } | null
  project: { id: string; title: string } | null
}

export default function SubtopicEditorPage() {
  const params = useParams()
  const router = useRouter()
  const [sub, setSub] = useState<SubtopicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', description: '', tag: 'tech' })
  const [saving, setSaving] = useState(false)
  const [refForm, setRefForm] = useState({ title: '', url: '', refType: 'article' })
  const [addingRef, setAddingRef] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/subtopics/${params.id}`)
      .then(r => r.json())
      .then(data => {
        setSub(data)
        setForm({ title: data.title, description: data.description, tag: data.tag })
        setLoading(false)
      })
  }, [params.id])

  async function save() {
    setSaving(true)
    await fetch(`/api/admin/subtopics/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
  }

  async function addRef() {
    const res = await fetch('/api/admin/references', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtopicId: params.id, ...refForm, sortOrder: sub?.references.length ?? 0 }),
    })
    const newRef = await res.json()
    setSub(s => s ? { ...s, references: [...s.references, newRef] } : s)
    setRefForm({ title: '', url: '', refType: 'article' })
    setAddingRef(false)
  }

  async function deleteRef(refId: string) {
    await fetch('/api/admin/references', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: refId }),
    })
    setSub(s => s ? { ...s, references: s.references.filter(r => r.id !== refId) } : s)
  }

  async function createQuiz() {
    const res = await fetch('/api/admin/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtopicId: params.id }),
    })
    const quiz = await res.json()
    setSub(s => s ? { ...s, quiz: { id: quiz.id, status: 'draft' } } : s)
    router.push(`/admin/quiz/${quiz.id}`)
  }

  async function createProject() {
    const res = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subtopicId: params.id,
        title: sub?.title ?? 'Project',
        briefText: '',
        expectedOutput: '',
        isPublished: false,
        criteria: [],
      }),
    })
    const project = await res.json()
    setSub(s => s ? { ...s, project: { id: project.id, title: project.title } } : s)
    router.push(`/admin/project/${project.id}`)
  }

  if (loading || !sub) {
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
          <span className="text-gray-900 font-medium">{sub.title}</span>
        </nav>

        {/* Basic details */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5">
          <h2 className="font-bold text-gray-900 mb-4">Subtopic Details</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tag</label>
              <select
                value={form.tag}
                onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="tech">Tech</option>
                <option value="marketing">Marketing</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>

        {/* References */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">References</h2>
            <Button size="sm" variant="secondary" onClick={() => setAddingRef(v => !v)}>
              <Plus size={14} className="mr-1" /> Add Link
            </Button>
          </div>

          {addingRef && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <input
                  placeholder="Title"
                  value={refForm.title}
                  onChange={e => setRefForm(f => ({ ...f, title: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <input
                  placeholder="https://..."
                  value={refForm.url}
                  onChange={e => setRefForm(f => ({ ...f, url: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <select
                  value={refForm.refType}
                  onChange={e => setRefForm(f => ({ ...f, refType: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="article">Article</option>
                  <option value="video">Video</option>
                  <option value="docs">Docs</option>
                  <option value="tool">Tool</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addRef} disabled={!refForm.title || !refForm.url}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingRef(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {sub.references.map(ref => (
              <div key={ref.id} className="flex items-center gap-3 py-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{ref.refType}</span>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm text-brand-600 hover:underline flex items-center gap-1 truncate"
                >
                  <ExternalLink size={12} className="flex-shrink-0" />
                  {ref.title}
                </a>
                <button onClick={() => deleteRef(ref.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {sub.references.length === 0 && !addingRef && (
              <p className="text-sm text-gray-400 text-center py-2">No references yet</p>
            )}
          </div>
        </div>

        {/* Quiz section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5">
          <h2 className="font-bold text-gray-900 mb-4">Quiz</h2>
          {sub.quiz ? (
            <div className="flex items-center gap-4">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sub.quiz.status === 'live' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {sub.quiz.status}
              </span>
              <Link href={`/admin/quiz/${sub.quiz.id}`}>
                <Button size="sm">Edit Quiz →</Button>
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-3">No quiz attached to this subtopic yet.</p>
              <Button size="sm" onClick={createQuiz}>Create Quiz</Button>
            </div>
          )}
        </div>

        {/* Project section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-gray-900 mb-4">Project</h2>
          {sub.project ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">{sub.project.title}</span>
              <Link href={`/admin/project/${sub.project.id}`}>
                <Button size="sm">Edit Project →</Button>
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-3">No project attached to this subtopic yet.</p>
              <Button size="sm" onClick={createProject}>Create Project</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
