'use client'
import React, { useEffect, useState } from 'react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import Link from 'next/link'
import { formatXP } from '@/lib/utils'
import { Flame, Download } from 'lucide-react'

interface LearnerSummary {
  id: string
  displayName: string
  email: string
  isTestUser: boolean
  totalXP: number
  level: { level: number; name: string }
  streak: number
  weeksCompleted: number
  badgeCount: number
  avgQuizScore: number
  projectsGraded: number
}

export default function AdminProgressPage() {
  const [learners, setLearners] = useState<LearnerSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/progress').then(r => r.json()).then((data: LearnerSummary[]) => {
      // Real learners first, test accounts at the bottom
      setLearners([...data.filter(l => !l.isTestUser), ...data.filter(l => l.isTestUser)])
      setLoading(false)
    })
  }, [])

  function exportCSV() {
    const header = 'Name,Email,Level,XP,Weeks Completed,Avg Quiz Score,Projects Graded,Badges,Streak\n'
    const rows = learners.map(l =>
      `${l.displayName},${l.email},${l.level.name},${l.totalXP},${l.weeksCompleted},${l.avgQuizScore}%,${l.projectsGraded},${l.badgeCount},${l.streak}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'launchpad-progress.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <main className="ml-60 flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Learner Progress</h1>
            <p className="text-gray-500 text-sm mt-1">{learners.filter(l => !l.isTestUser).length} active learners in the program</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 border border-gray-300 rounded-lg px-4 py-2 hover:border-brand-300 transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Learner', 'Level', 'XP', 'Weeks', 'Avg Quiz', 'Projects', 'Badges', 'Streak', ''].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {learners.map((l, idx) => (
                  <React.Fragment key={l.id}>
                    {/* Divider before test accounts */}
                    {l.isTestUser && idx > 0 && !learners[idx - 1].isTestUser && (
                      <tr>
                        <td colSpan={9} className="px-5 py-2 bg-gray-50 border-t-2 border-dashed border-gray-200">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">QC / Test Accounts</span>
                        </td>
                      </tr>
                    )}
                  <tr className={`hover:bg-gray-50 transition-colors ${l.isTestUser ? 'opacity-75' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{l.displayName}</p>
                        {l.isTestUser && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">TEST</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{l.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                        L{l.level.level} {l.level.name}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-brand-600">{formatXP(l.totalXP)}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">{l.weeksCompleted}/8</td>
                    <td className="px-5 py-4 text-sm text-gray-700">
                      <span className={l.avgQuizScore >= 80 ? 'text-green-600 font-semibold' : l.avgQuizScore >= 60 ? 'text-amber-600' : 'text-red-500'}>
                        {l.avgQuizScore}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">{l.projectsGraded}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">🏅 {l.badgeCount}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">
                      {l.streak > 0 && (
                        <span className="flex items-center gap-1 text-orange-500">
                          <Flame size={14} /> {l.streak}w
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/admin/progress/${l.id}`} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                        View →
                      </Link>
                    </td>
                  </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
