'use client'
import { useEffect, useState } from 'react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Users, BookOpen, Trophy, Sliders } from 'lucide-react'
import Link from 'next/link'
import { formatXP } from '@/lib/utils'

interface LearnerSummary {
  id: string
  displayName: string
  email: string
  isTestUser: boolean
  totalXP: number
  level: { name: string; level: number }
  streak: number
  weeksCompleted: number
  badgeCount: number
  avgQuizScore: number
  projectsGraded: number
}

interface WeekSummary {
  id: string
  number: number
  title: string
  isPublished: boolean
  _count: { topics: number }
}

export default function AdminDashboard() {
  const [learners, setLearners] = useState<LearnerSummary[]>([])
  const [weeks, setWeeks] = useState<WeekSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/progress').then(r => r.json()),
      fetch('/api/admin/weeks').then(r => r.json()),
    ]).then(([l, w]) => {
      setLearners((l as LearnerSummary[]).filter(u => !u.isTestUser))
      setWeeks(w)
      setLoading(false)
    })
  }, [])

  const totalXP = learners.reduce((s, l) => s + l.totalXP, 0)
  const publishedWeeks = weeks.filter(w => w.isPublished).length

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <main className="ml-60 flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Overview of the Launchpad program</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[
            { label: 'Active Learners', value: String(learners.length), icon: <Users size={20} className="text-blue-500" />, color: 'bg-blue-50' },
            { label: 'Weeks Published', value: `${publishedWeeks} / ${weeks.length}`, icon: <BookOpen size={20} className="text-green-500" />, color: 'bg-green-50' },
            { label: 'Total XP Earned', value: formatXP(totalXP), icon: <Trophy size={20} className="text-yellow-500" />, color: 'bg-yellow-50' },
            { label: 'Avg Quiz Score', value: `${learners.length > 0 ? Math.round(learners.reduce((s, l) => s + l.avgQuizScore, 0) / learners.length) : 0}%`, icon: <Sliders size={20} className="text-purple-500" />, color: 'bg-purple-50' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className={`inline-flex p-2 rounded-lg ${stat.color} mb-3`}>
                {stat.icon}
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Learner overview */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Learners</h2>
              <Link href="/admin/progress" className="text-sm text-brand-600 hover:text-brand-700">
                View all →
              </Link>
            </div>
            {loading ? (
              <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {learners.map(l => (
                  <Link key={l.id} href={`/admin/progress/${l.id}`} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
                      {l.displayName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{l.displayName}</p>
                      <p className="text-xs text-gray-400">{l.level.name} · {l.weeksCompleted} weeks done</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-brand-600">{formatXP(l.totalXP)} XP</p>
                      <p className="text-xs text-gray-400">Avg: {l.avgQuizScore}%</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Week status */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Curriculum Weeks</h2>
              <Link href="/admin/curriculum" className="text-sm text-brand-600 hover:text-brand-700">
                Manage →
              </Link>
            </div>
            {loading ? (
              <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {weeks.map(w => (
                  <Link key={w.id} href={`/admin/curriculum/week/${w.id}`} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold flex-shrink-0">
                      W{w.number}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{w.title}</p>
                      <p className="text-xs text-gray-400">{w._count.topics} topics</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${w.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {w.isPublished ? 'Live' : 'Draft'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
