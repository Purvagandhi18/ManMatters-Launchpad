'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import Link from 'next/link'

interface NotifItem {
  id: string
  type: string
  icon: string
  title: string
  subtitle?: string
  href?: string
  createdAt?: string
  priority?: number
}

interface LearnerPayload {
  events: NotifItem[]
  reminders: NotifItem[]
  nudges: NotifItem[]
}

interface AdminPayload {
  items: NotifItem[]
  ungradedCount: number
}

type Mode = 'learner' | 'admin'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return m <= 1 ? 'just now' : `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 pt-3 pb-1">{label}</p>
  )
}

function NotifRow({ item, isUnread, onClose }: { item: NotifItem; isUnread: boolean; onClose: () => void }) {
  const inner = (
    <div
      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer relative ${isUnread ? 'bg-brand-50/40' : ''}`}
      onClick={onClose}
    >
      {isUnread && <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand-500" />}
      <div className="w-8 h-8 flex-shrink-0 rounded-xl flex items-center justify-center text-base"
        style={{ background: typeColor(item.type).bg, border: `1px solid ${typeColor(item.type).border}` }}>
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug" style={{ color: '#1A1033' }}>{item.title}</p>
        {item.subtitle && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{item.subtitle}</p>}
        {item.createdAt && <p className="text-[10px] text-gray-300 mt-0.5">{timeAgo(item.createdAt)}</p>}
      </div>
    </div>
  )
  return item.href ? <Link href={item.href}>{inner}</Link> : inner
}

function typeColor(type: string) {
  if (type === 'project_graded')      return { bg: '#ECFDF5', border: '#BBF7D0' }
  if (type === 'badge_earned')        return { bg: '#FEFCE8', border: '#FDE68A' }
  if (type === 'retry_granted')       return { bg: '#EFF6FF', border: '#BFDBFE' }
  if (type === 'reminder_quiz')       return { bg: '#FFF7ED', border: '#FED7AA' }
  if (type === 'reminder_project')    return { bg: '#FFF7ED', border: '#FED7AA' }
  if (type === 'reminder_reflection') return { bg: '#F5F3FF', border: '#E4DEFF' }
  if (type === 'nudge_quiz_master')   return { bg: '#ECFDF5', border: '#BBF7D0' }
  if (type === 'nudge_streak')        return { bg: '#FFF7ED', border: '#FED7AA' }
  if (type === 'ungraded_submission') return { bg: '#FFF7ED', border: '#FED7AA' }
  if (type === 'at_risk_learner')     return { bg: '#FEF2F2', border: '#FECACA' }
  if (type === 'new_submissions')     return { bg: '#F0FDF4', border: '#BBF7D0' }
  if (type === 'stuck_learners')      return { bg: '#FFFBEB', border: '#FDE68A' }
  return { bg: '#F9FAFB', border: '#E5E7EB' }
}

export function NotificationBell({ mode }: { mode: Mode }) {
  const [open, setOpen]           = useState(false)
  const [unread, setUnread]       = useState(0)
  const [lastRead, setLastRead]   = useState<string | null>(null)
  const [payload, setPayload]     = useState<LearnerPayload | AdminPayload | null>(null)
  const [loading, setLoading]     = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const storageKey = mode === 'admin' ? 'lp_admin_notif_last_read' : 'lp_notif_last_read'
  const apiUrl     = mode === 'admin' ? '/api/admin/notifications' : '/api/notifications'

  useEffect(() => {
    const lr = localStorage.getItem(storageKey)
    setLastRead(lr)
    // Quick unread count fetch
    fetch(apiUrl).then(r => r.json()).then(data => {
      if (mode === 'admin') {
        setUnread((data as AdminPayload).ungradedCount ?? 0)
      } else {
        const d = data as LearnerPayload
        const since = lr ? new Date(lr).getTime() : 0
        const u = d.events.filter(e => e.createdAt && new Date(e.createdAt).getTime() > since).length
        setUnread(u + d.reminders.length)
      }
      setPayload(data)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggleOpen() {
    if (!open) {
      setLoading(true)
      fetch(apiUrl).then(r => r.json()).then(data => {
        setPayload(data)
        setLoading(false)
        if (mode === 'admin') {
          setUnread((data as AdminPayload).ungradedCount ?? 0)
        }
      }).catch(() => setLoading(false))
    }
    if (!open) {
      // Mark as read
      const now = new Date().toISOString()
      localStorage.setItem(storageKey, now)
      setLastRead(now)
      if (mode === 'learner') setUnread(0)
    }
    setOpen(o => !o)
  }

  const isUnread = (item: NotifItem) => {
    if (!item.createdAt || !lastRead) return true
    return new Date(item.createdAt).getTime() > new Date(lastRead).getTime()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggleOpen}
        className="relative flex items-center justify-center w-8 h-8 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        title="Notifications"
      >
        <Bell size={17} />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl overflow-hidden z-50"
            style={{ border: '1px solid #E4DEFF', boxShadow: '0 8px 32px rgba(91,56,245,0.12), 0 2px 8px rgba(0,0,0,0.08)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <span className="text-sm font-bold" style={{ color: '#1A1033' }}>Notifications</span>
              <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500 transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {loading && (
                <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
              )}

              {!loading && payload && mode === 'learner' && (() => {
                const d = payload as LearnerPayload
                const hasAnything = d.events.length + d.reminders.length + d.nudges.length > 0
                if (!hasAnything) return (
                  <div className="py-10 text-center">
                    <p className="text-2xl mb-2">✨</p>
                    <p className="text-sm text-gray-400">You&apos;re all caught up!</p>
                  </div>
                )
                return (
                  <>
                    {d.events.length > 0 && (
                      <>
                        <SectionLabel label="Updates" />
                        {d.events.slice(0, 6).map(item => (
                          <NotifRow key={item.id} item={item} isUnread={isUnread(item)} onClose={() => setOpen(false)} />
                        ))}
                      </>
                    )}
                    {d.reminders.length > 0 && (
                      <>
                        <SectionLabel label="Action needed" />
                        {d.reminders.slice(0, 4).map(item => (
                          <NotifRow key={item.id} item={item} isUnread={false} onClose={() => setOpen(false)} />
                        ))}
                      </>
                    )}
                    {d.nudges.length > 0 && (
                      <>
                        <SectionLabel label="Progress nudges" />
                        {d.nudges.map(item => (
                          <NotifRow key={item.id} item={item} isUnread={false} onClose={() => setOpen(false)} />
                        ))}
                      </>
                    )}
                  </>
                )
              })()}

              {!loading && payload && mode === 'admin' && (() => {
                const d = payload as AdminPayload
                if (!d.items?.length) return (
                  <div className="py-10 text-center">
                    <p className="text-2xl mb-2">✅</p>
                    <p className="text-sm text-gray-400">No pending actions</p>
                  </div>
                )
                return d.items.map(item => (
                  <NotifRow key={item.id} item={item} isUnread={false} onClose={() => setOpen(false)} />
                ))
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
