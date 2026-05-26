'use client'
import { useEffect, useState } from 'react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { BookOpen, CheckCircle2, Circle } from 'lucide-react'

interface WeekData {
  id: string
  number: number
  title: string
  description: string
  isPublished: boolean
  badgeIcon?: string | null
  badgeName?: string | null
  _count: { topics: number }
  topics: {
    id: string
    _count: { subtopics: number }
    subtopics: {
      quiz: { id: string; status: string } | null
      project: { id: string } | null
    }[]
  }[]
}

export default function CurriculumPage() {
  const [weeks, setWeeks] = useState<WeekData[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ number: '', title: '', description: '', badgeIcon: '', badgeName: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/weeks').then(r => r.json()).then(w => {
      setWeeks(w)
      setLoading(false)
    })
  }, [])

  async function togglePublish(week: WeekData) {
    await fetch(`/api/admin/weeks/${week.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !week.isPublished }),
    })
    setWeeks(prev => prev.map(w => w.id === week.id ? { ...w, isPublished: !w.isPublished } : w))
  }

  async function addWeek() {
    setSaving(true)
    const res = await fetch('/api/admin/weeks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: parseInt(form.number),
        title: form.title,
        description: form.description,
        badgeIcon: form.badgeIcon || null,
        badgeName: form.badgeName || null,
        isPublished: false,
      }),
    })
    const newWeek = await res.json()
    setWeeks(prev => [...prev, { ...newWeek, _count: { topics: 0 }, topics: [] }].sort((a, b) => a.number - b.number))
    setAddOpen(false)
    setForm({ number: '', title: '', description: '', badgeIcon: '', badgeName: '' })
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <main className="ml-60 flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Curriculum</h1>
            <p className="text-gray-500 text-sm mt-1">Manage weeks, topics, and subtopics</p>
          </div>
          <Button onClick={() => setAddOpen(true)}>+ Add Week</Button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : (
          <div className="space-y-3">
            {weeks.map(week => {
              const allSubtopics = week.topics.flatMap(t => t.subtopics)
              const liveQuizzes = allSubtopics.filter(s => s.quiz?.status === 'live').length
              const projects = allSubtopics.filter(s => s.project).length
              const totalSubs = allSubtopics.length

              return (
                <div key={week.id} className="bg-white rounded-xl border border-gray-200 hover:border-brand-300 transition-colors overflow-hidden">
                  <div className="flex items-center gap-4 p-5">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
                      W{week.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {week.badgeIcon && <span>{week.badgeIcon}</span>}
                        <h3 className="font-semibold text-gray-900">{week.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${week.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {week.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{week.description}</p>
                      <div className="flex items-center gap-4 mt-1.5">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <BookOpen size={11} /> {week._count.topics} topics · {totalSubs} subtopics
                        </span>
                        <span className="text-xs text-green-600">{liveQuizzes} live quizzes</span>
                        <span className="text-xs text-orange-600">{projects} projects</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => togglePublish(week)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          week.isPublished
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {week.isPublished ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                        {week.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <Link href={`/admin/curriculum/week/${week.id}`}>
                        <Button size="sm" variant="secondary">Edit →</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Week">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Week Number</label>
                <input
                  type="number"
                  value={form.number}
                  onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Badge Icon</label>
                <input
                  type="text"
                  value={form.badgeIcon}
                  onChange={e => setForm(f => ({ ...f, badgeIcon: e.target.value }))}
                  placeholder="🔧"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Badge Name</label>
              <input
                type="text"
                value={form.badgeName}
                onChange={e => setForm(f => ({ ...f, badgeName: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setAddOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={addWeek} disabled={!form.number || !form.title || saving} className="flex-1">
                {saving ? 'Saving…' : 'Add Week'}
              </Button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  )
}
