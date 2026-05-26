'use client'
import { useEffect, useState } from 'react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Button } from '@/components/ui/Button'
import { CheckCircle2 } from 'lucide-react'

interface Learner {
  id: string
  displayName: string
  email: string
}

interface Week {
  id: string
  number: number
  title: string
}

interface OverrideLog {
  id: string
  adminId: string
  targetUserId: string
  actionType: string
  referenceId?: string | null
  reason?: string | null
  createdAt: string
}

export default function OverridesPage() {
  const [learners, setLearners] = useState<Learner[]>([])
  const [weeks, setWeeks] = useState<Week[]>([])
  const [logs, setLogs] = useState<OverrideLog[]>([])
  const [loading, setLoading] = useState(true)

  // Forms
  const [weekForm, setWeekForm] = useState({ userId: '', weekId: '', action: 'unlock_week', reason: '' })
  const [quizForm, setQuizForm] = useState({ userId: '', subtopicId: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/progress').then(r => r.json()),
      fetch('/api/admin/weeks').then(r => r.json()),
      fetch('/api/admin/overrides').then(r => r.json()),
    ]).then(([l, w, o]) => {
      setLearners(l.map((u: { id: string; displayName: string; email: string }) => ({ id: u.id, displayName: u.displayName, email: u.email })))
      setWeeks(w.map((wk: { id: string; number: number; title: string }) => ({ id: wk.id, number: wk.number, title: wk.title })))
      setLogs(o)
      setLoading(false)
    })
  }, [])

  async function submitWeekOverride() {
    setSubmitting(true)
    await fetch('/api/admin/overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...weekForm }),
    })
    const logs = await fetch('/api/admin/overrides').then(r => r.json())
    setLogs(logs)
    setSuccess(`Week ${weekForm.action === 'unlock_week' ? 'unlocked' : 'locked'} successfully.`)
    setWeekForm({ userId: '', weekId: '', action: 'unlock_week', reason: '' })
    setSubmitting(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  async function submitQuizReset() {
    setSubmitting(true)
    await fetch('/api/admin/overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_quiz', userId: quizForm.userId, subtopicId: quizForm.subtopicId, reason: quizForm.reason }),
    })
    const logs = await fetch('/api/admin/overrides').then(r => r.json())
    setLogs(logs)
    setSuccess('Quiz reset successfully.')
    setQuizForm({ userId: '', subtopicId: '', reason: '' })
    setSubmitting(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <main className="ml-60 flex-1 p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Overrides</h1>
          <p className="text-gray-500 text-sm mt-1">Manually unlock weeks, lock weeks, or reset quiz attempts</p>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-6 text-sm">
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Week unlock/lock form */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Unlock / Lock Week</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Learner</label>
                <select
                  value={weekForm.userId}
                  onChange={e => setWeekForm(f => ({ ...f, userId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select learner…</option>
                  {learners.map(l => (
                    <option key={l.id} value={l.id}>{l.displayName} ({l.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
                <select
                  value={weekForm.weekId}
                  onChange={e => setWeekForm(f => ({ ...f, weekId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select week…</option>
                  {weeks.map(w => (
                    <option key={w.id} value={w.id}>Week {w.number}: {w.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <select
                  value={weekForm.action}
                  onChange={e => setWeekForm(f => ({ ...f, action: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="unlock_week">Unlock Week</option>
                  <option value="lock_week">Lock Week</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={weekForm.reason}
                  onChange={e => setWeekForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Medical exemption"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <Button
                onClick={submitWeekOverride}
                disabled={!weekForm.userId || !weekForm.weekId || submitting}
                className="w-full"
              >
                {submitting ? 'Applying…' : 'Apply Override'}
              </Button>
            </div>
          </div>

          {/* Quiz reset form */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Reset Quiz Attempt</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Learner</label>
                <select
                  value={quizForm.userId}
                  onChange={e => setQuizForm(f => ({ ...f, userId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select learner…</option>
                  {learners.map(l => (
                    <option key={l.id} value={l.id}>{l.displayName} ({l.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtopic ID</label>
                <input
                  type="text"
                  value={quizForm.subtopicId}
                  onChange={e => setQuizForm(f => ({ ...f, subtopicId: e.target.value }))}
                  placeholder="Paste subtopic ID from the database"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={quizForm.reason}
                  onChange={e => setQuizForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Technical issue during attempt"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <Button
                variant="danger"
                onClick={submitQuizReset}
                disabled={!quizForm.userId || !quizForm.subtopicId || submitting}
                className="w-full"
              >
                {submitting ? 'Resetting…' : 'Reset Quiz Attempts'}
              </Button>
            </div>
          </div>
        </div>

        {/* Override log */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Override Log</h2>
          </div>
          {loading ? (
            <div className="px-6 py-6 text-center text-gray-400 text-sm">Loading…</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {logs.map(log => (
                <div key={log.id} className="px-6 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{log.actionType}</span>
                      {log.reason && <span className="text-gray-500"> — {log.reason}</span>}
                    </p>
                    <p className="text-xs text-gray-400">Target: {log.targetUserId} · {log.referenceId ?? '—'}</p>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">No overrides yet</div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
