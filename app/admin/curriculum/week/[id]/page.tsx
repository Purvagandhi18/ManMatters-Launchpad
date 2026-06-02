'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import Link from 'next/link'
import { Trash2, Plus, ChevronRight, BookOpen, ClipboardList, ExternalLink, Link2 } from 'lucide-react'

interface SubtopicData {
  id: string
  title: string
  tag: string
  sortOrder: number
  quiz: { id: string; status: string } | null
  project: { id: string; title: string } | null
}

interface ReferenceData {
  id: string
  title: string
  url: string
  refType: string
}

interface TopicData {
  id: string
  title: string
  tag: string
  sortOrder: number
  subtopics: SubtopicData[]
  references: ReferenceData[]
  projects: { id: string; title: string }[] // topic-level projects (multiple)
}

interface WeekProject {
  id: string
  title: string
}

interface WeekData {
  id: string
  number: number
  title: string
  description: string
  isPublished: boolean
  badgeIcon?: string | null
  badgeName?: string | null
  topics: TopicData[]
  weekProject?: WeekProject | null
}

export default function WeekEditorPage() {
  const params = useParams()
  const router = useRouter()
  const [week, setWeek] = useState<WeekData | null>(null)
  const [loading, setLoading] = useState(true)
  const [weekForm, setWeekForm] = useState({ title: '', description: '', badgeIcon: '', badgeName: '' })
  const [saving, setSaving] = useState(false)
  const [topicModal, setTopicModal] = useState(false)
  const [topicForm, setTopicForm] = useState({ title: '', tag: 'tech' })
  const [subtopicModal, setSubtopicModal] = useState<string | null>(null)
  const [subtopicForm, setSubtopicForm] = useState({ title: '', tag: 'tech' })
  const [refModal, setRefModal] = useState<string | null>(null) // topicId
  const [refForm, setRefForm] = useState({ title: '', url: '', refType: 'article' })
  // Project modals — subtopicId for topic-level, 'week' for week-level
  const [projectModal, setProjectModal] = useState<string | null>(null)
  const [projectForm, setProjectForm] = useState({
    title: '', briefText: '', expectedOutput: '',
    criteria: [{ name: '', description: '', maxMarks: 10 }],
  })
  const [savingProject, setSavingProject] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/weeks/${params.id}`)
      .then(r => r.json())
      .then(data => {
        setWeek(data)
        setWeekForm({
          title: data.title,
          description: data.description,
          badgeIcon: data.badgeIcon ?? '',
          badgeName: data.badgeName ?? '',
        })
        setLoading(false)
      })
  }, [params.id])

  async function saveWeek() {
    setSaving(true)
    await fetch(`/api/admin/weeks/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: weekForm.title,
        description: weekForm.description,
        badgeIcon: weekForm.badgeIcon || null,
        badgeName: weekForm.badgeName || null,
      }),
    })
    setSaving(false)
  }

  async function addTopic() {
    if (!week) return
    const res = await fetch('/api/admin/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekId: week.id, title: topicForm.title, tag: topicForm.tag, sortOrder: week.topics.length }),
    })
    const newTopic = await res.json()
    setWeek(w => w ? { ...w, topics: [...w.topics, { ...newTopic, subtopics: [] }] } : w)
    setTopicModal(false)
    setTopicForm({ title: '', tag: 'tech' })
  }

  async function deleteTopic(topicId: string) {
    if (!confirm('Delete this topic and all its subtopics?')) return
    await fetch(`/api/admin/topics/${topicId}`, { method: 'DELETE' })
    setWeek(w => w ? { ...w, topics: w.topics.filter(t => t.id !== topicId) } : w)
  }

  async function addSubtopic(topicId: string) {
    const topic = week?.topics.find(t => t.id === topicId)
    if (!topic) return
    const res = await fetch('/api/admin/subtopics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId, title: subtopicForm.title, tag: subtopicForm.tag, sortOrder: topic.subtopics.length }),
    })
    const newSub = await res.json()
    setWeek(w => w ? {
      ...w,
      topics: w.topics.map(t => t.id === topicId ? { ...t, subtopics: [...t.subtopics, { ...newSub, quiz: null, project: null }] } : t)
    } : w)
    setSubtopicModal(null)
    setSubtopicForm({ title: '', tag: 'tech' })
  }

  async function addRef(topicId: string) {
    const topic = week?.topics.find(t => t.id === topicId)
    if (!topic) return
    const res = await fetch('/api/admin/references', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId, ...refForm, sortOrder: topic.references.length }),
    })
    const newRef = await res.json()
    setWeek(w => w ? {
      ...w,
      topics: w.topics.map(t => t.id === topicId ? { ...t, references: [...t.references, newRef] } : t)
    } : w)
    setRefModal(null)
    setRefForm({ title: '', url: '', refType: 'article' })
  }

  async function deleteRef(topicId: string, refId: string) {
    await fetch('/api/admin/references', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: refId }) })
    setWeek(w => w ? {
      ...w,
      topics: w.topics.map(t => t.id === topicId ? { ...t, references: t.references.filter(r => r.id !== refId) } : t)
    } : w)
  }

  async function deleteProject(projectId: string) {
    if (!confirm('Delete this project? This will also delete all submissions and grades for it.')) return
    await fetch('/api/admin/projects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: projectId }) })
    // Refresh week data
    const updated = await fetch(`/api/admin/weeks/${params.id}`).then(r => r.json())
    setWeek(updated)
  }

  // targetId: a topicId for topic-level, or 'week' for week-level
  async function addProject(targetId: string) {
    if (!week) return
    setSavingProject(true)
    try {
      const isWeekLevel  = targetId === 'week'
      const isTopicLevel = !isWeekLevel

      await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isTopicLevel ? { topicId: targetId } : {}),
          ...(isWeekLevel  ? { weekId: week.id, isCapstone: true } : {}),
          title: projectForm.title,
          briefText: projectForm.briefText,
          expectedOutput: projectForm.expectedOutput,
          isPublished: true,
          criteria: projectForm.criteria.filter(c => c.name).map((c, i) => ({ ...c, sortOrder: i })),
        }),
      })

      // Refresh week data so new project chips appear
      const updated = await fetch(`/api/admin/weeks/${params.id}`).then(r => r.json())
      setWeek(updated)
      setProjectModal(null)
      setProjectForm({ title: '', briefText: '', expectedOutput: '', criteria: [{ name: '', description: '', maxMarks: 10 }] })
    } finally {
      setSavingProject(false)
    }
  }

  async function deleteSubtopic(topicId: string, subtopicId: string) {
    if (!confirm('Delete this subtopic?')) return
    await fetch(`/api/admin/subtopics/${subtopicId}`, { method: 'DELETE' })
    setWeek(w => w ? {
      ...w,
      topics: w.topics.map(t => t.id === topicId ? { ...t, subtopics: t.subtopics.filter(s => s.id !== subtopicId) } : t)
    } : w)
  }

  if (loading || !week) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <main className="ml-60 flex-1 p-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/admin/curriculum" className="hover:text-brand-600">Curriculum</Link>
          <ChevronRight size={14} />
          <span className="text-gray-900 font-medium">Week {week.number}: {week.title}</span>
        </nav>

        {/* Week details editor */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">Week Details</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={weekForm.title}
                onChange={e => setWeekForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Badge Icon</label>
                <input
                  type="text"
                  value={weekForm.badgeIcon}
                  onChange={e => setWeekForm(f => ({ ...f, badgeIcon: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Badge Name</label>
                <input
                  type="text"
                  value={weekForm.badgeName}
                  onChange={e => setWeekForm(f => ({ ...f, badgeName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={weekForm.description}
              onChange={e => setWeekForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={saveWeek} disabled={saving} size="sm">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            {week.weekProject ? (
              <span className="inline-flex items-center gap-2">
                <Link href={`/admin/project/${week.weekProject.id}`}>
                  <Button size="sm" variant="secondary">
                    <ClipboardList size={14} className="mr-1" /> {week.weekProject.title}
                  </Button>
                </Link>
                <button onClick={() => deleteProject(week.weekProject!.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Delete week project">
                  <Trash2 size={14} />
                </button>
              </span>
            ) : (
              <Button
                size="sm" variant="secondary"
                onClick={() => { setProjectModal('week'); setProjectForm({ title: '', briefText: '', expectedOutput: '', criteria: [{ name: '', description: '', maxMarks: 10 }] }) }}
              >
                <ClipboardList size={14} className="mr-1" /> Add Week Project
              </Button>
            )}
          </div>
        </div>

        {/* Topics */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Topics ({week.topics.length})</h2>
          <Button size="sm" onClick={() => setTopicModal(true)}>
            <Plus size={14} className="mr-1" /> Add Topic
          </Button>
        </div>

        <div className="space-y-4">
          {week.topics.map(topic => (
            <div key={topic.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${topic.tag === 'tech' ? 'bg-tech-bg text-tech-text' : 'bg-marketing-bg text-marketing-text'}`}>
                    {topic.tag.toUpperCase()}
                  </span>
                  <h3 className="font-semibold text-gray-900">{topic.title}</h3>
                  <span className="text-xs text-gray-400">{topic.subtopics.length} subtopics</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setSubtopicModal(topic.id); setSubtopicForm({ title: '', tag: topic.tag }) }}>
                    <Plus size={14} />
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => deleteTopic(topic.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {topic.subtopics.map(sub => (
                  <div key={sub.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{sub.title}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {sub.quiz && (
                        <Link href={`/admin/quiz/${sub.quiz.id}`}>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${sub.quiz.status === 'live' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            <BookOpen size={10} /> Quiz ({sub.quiz.status})
                          </span>
                        </Link>
                      )}
                      {sub.project && (
                        <Link href={`/admin/project/${sub.project.id}`}>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-200 text-gray-500 inline-flex items-center gap-1" title="Legacy subtopic project">
                            <ClipboardList size={10} /> Legacy
                          </span>
                        </Link>
                      )}
                      <Link href={`/admin/curriculum/subtopic/${sub.id}`}>
                        <Button size="sm" variant="secondary">Edit</Button>
                      </Link>
                      <Button size="sm" variant="danger" onClick={() => deleteSubtopic(topic.id, sub.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
                {topic.subtopics.length === 0 && (
                  <div className="px-5 py-4 text-sm text-gray-400 text-center">No subtopics yet</div>
                )}

                {/* Resources section */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                      <Link2 size={11} /> Resources ({topic.references.length})
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => { setRefModal(topic.id); setRefForm({ title: '', url: '', refType: 'article' }) }}>
                      <Plus size={12} className="mr-1" /> Add
                    </Button>
                  </div>
                  {topic.references.length > 0 && (
                    <div className="space-y-1.5">
                      {topic.references.map(ref => (
                        <div key={ref.id} className="flex items-center gap-2 text-xs bg-white rounded-lg px-3 py-2 border border-gray-200">
                          <ExternalLink size={10} className="text-brand-500 flex-shrink-0" />
                          <a href={ref.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-brand-600 hover:underline truncate">{ref.title}</a>
                          <span className="text-gray-400 text-[10px] px-1.5 py-0.5 bg-gray-100 rounded-full">{ref.refType}</span>
                          <button onClick={() => deleteRef(topic.id, ref.id)} className="text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 size={11} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Projects section — same visual pattern as Resources */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                      <ClipboardList size={11} /> Projects ({topic.projects?.length ?? 0})
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => { setProjectModal(topic.id); setProjectForm({ title: '', briefText: '', expectedOutput: '', criteria: [{ name: '', description: '', maxMarks: 10 }] }) }}>
                      <Plus size={12} className="mr-1" /> Add
                    </Button>
                  </div>
                  {topic.projects && topic.projects.length > 0 && (
                    <div className="space-y-1.5">
                      {topic.projects.map(proj => (
                        <div key={proj.id} className="flex items-center gap-2 text-xs bg-white rounded-lg px-3 py-2 border border-gray-200">
                          <ClipboardList size={10} className="text-orange-500 flex-shrink-0" />
                          <Link href={`/admin/project/${proj.id}`} className="flex-1 text-orange-600 hover:underline truncate font-medium">{proj.title}</Link>
                          <button onClick={() => deleteProject(proj.id)} className="text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 size={11} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Topic Modal */}
        <Modal open={topicModal} onClose={() => setTopicModal(false)} title="Add Topic" size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={topicForm.title}
                onChange={e => setTopicForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tag</label>
              <select
                value={topicForm.tag}
                onChange={e => setTopicForm(f => ({ ...f, tag: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="tech">Tech</option>
                <option value="marketing">Marketing</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setTopicModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={addTopic} disabled={!topicForm.title} className="flex-1">Add</Button>
            </div>
          </div>
        </Modal>

        {/* Add Reference Modal */}
        <Modal open={!!refModal} onClose={() => setRefModal(null)} title="Add Resource Link" size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={refForm.title} onChange={e => setRefForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input type="url" value={refForm.url} onChange={e => setRefForm(f => ({ ...f, url: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={refForm.refType} onChange={e => setRefForm(f => ({ ...f, refType: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="article">Article</option>
                <option value="video">Video</option>
                <option value="doc">Documentation</option>
                <option value="tool">Tool</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setRefModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={() => refModal && addRef(refModal)} disabled={!refForm.title || !refForm.url} className="flex-1">Add</Button>
            </div>
          </div>
        </Modal>

        {/* Add Project Modal (topic-level or week-level) */}
        <Modal
          open={!!projectModal}
          onClose={() => setProjectModal(null)}
          title={projectModal === 'week' ? 'Add Week-Level Project' : 'Add Project to Subtopic'}
          size="lg"
        >
          <div className="space-y-4">
            {projectModal === 'week' && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                This project will be attached at the week level. Admin must manually unlock it for learners.
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Title</label>
              <input type="text" value={projectForm.title} onChange={e => setProjectForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brief / Instructions</label>
              <textarea rows={4} value={projectForm.briefText} onChange={e => setProjectForm(f => ({ ...f, briefText: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Output</label>
              <input type="text" value={projectForm.expectedOutput} onChange={e => setProjectForm(f => ({ ...f, expectedOutput: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. GitHub repo link + 2-min video walkthrough" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Rubric Criteria</label>
                <button
                  onClick={() => setProjectForm(f => ({ ...f, criteria: [...f.criteria, { name: '', description: '', maxMarks: 10 }] }))}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                >+ Add criterion</button>
              </div>
              <div className="space-y-2">
                {projectForm.criteria.map((c, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start">
                    <input type="text" placeholder="Name" value={c.name}
                      onChange={e => setProjectForm(f => ({ ...f, criteria: f.criteria.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))}
                      className="col-span-3 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    <input type="text" placeholder="Description" value={c.description}
                      onChange={e => setProjectForm(f => ({ ...f, criteria: f.criteria.map((x, j) => j === i ? { ...x, description: e.target.value } : x) }))}
                      className="col-span-6 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    <input type="number" placeholder="Marks" value={c.maxMarks} min={1} max={100}
                      onChange={e => setProjectForm(f => ({ ...f, criteria: f.criteria.map((x, j) => j === i ? { ...x, maxMarks: parseInt(e.target.value) || 10 } : x) }))}
                      className="col-span-2 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    {projectForm.criteria.length > 1 && (
                      <button onClick={() => setProjectForm(f => ({ ...f, criteria: f.criteria.filter((_, j) => j !== i) }))}
                        className="col-span-1 flex items-center justify-center text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Total marks: {projectForm.criteria.reduce((s, c) => s + (c.maxMarks || 0), 0)}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setProjectModal(null)} className="flex-1">Cancel</Button>
              <Button
                onClick={() => projectModal && addProject(projectModal)}
                disabled={savingProject || !projectForm.title || !projectForm.briefText || projectForm.criteria.every(c => !c.name)}
                className="flex-1"
              >
                {savingProject ? 'Creating…' : 'Create Project'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Add Subtopic Modal */}
        <Modal open={!!subtopicModal} onClose={() => setSubtopicModal(null)} title="Add Subtopic" size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={subtopicForm.title}
                onChange={e => setSubtopicForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tag</label>
              <select
                value={subtopicForm.tag}
                onChange={e => setSubtopicForm(f => ({ ...f, tag: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="tech">Tech</option>
                <option value="marketing">Marketing</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setSubtopicModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={() => subtopicModal && addSubtopic(subtopicModal)} disabled={!subtopicForm.title} className="flex-1">Add</Button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  )
}
