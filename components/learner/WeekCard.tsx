'use client'
import { motion, useAnimation } from 'framer-motion'
import { CheckCircle2, ChevronRight, Rocket } from 'lucide-react'
import Link from 'next/link'
import { fadeUp } from '@/lib/animations'

interface WeekCardProps {
  week: {
    id: string
    number: number
    title: string
    description: string
    badgeIcon?: string | null
    topics: {
      subtopics: {
        userProgress: { quizPassed?: boolean; completedAt?: string | null }[]
        quiz: { id: string } | null
        project: { id: string } | null
      }[]
    }[]
  }
  userProgress?: { isUnlocked: boolean; isCompleted: boolean } | null
  isLocked: boolean
  onLockClick?: () => void
}

export function WeekCard({ week, userProgress, isLocked, onLockClick }: WeekCardProps) {
  const lockControls = useAnimation()

  const allSubtopics    = week.topics.flatMap(t => t.subtopics)
  const completedCount  = allSubtopics.filter(s => s.userProgress.length > 0 && (s.userProgress[0].quizPassed || s.userProgress[0].completedAt)).length
  const totalCount      = allSubtopics.length
  const pct             = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const isCompleted     = userProgress?.isCompleted ?? false
  const isStarted       = completedCount > 0

  async function handleLockedClick() {
    await lockControls.start({ x: [0, -10, 10, -8, 8, -4, 4, 0], transition: { duration: 0.42 } })
    onLockClick?.()
  }

  /* ── LOCKED ─────────────────────────────────────────────────── */
  if (isLocked) {
    return (
      <motion.button
        variants={fadeUp}
        onClick={handleLockedClick}
        className="relative w-full text-left rounded-2xl p-6 cursor-pointer overflow-hidden group"
        style={{
          background: 'linear-gradient(145deg, #F8F7FF, #F2EFFF)',
          border: '1.5px solid #E4DEFF',
        }}
        whileHover={{ scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        {/* Shimmer sweep */}
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

        {/* Content (blurred) */}
        <div className="blur-[2px] opacity-40 select-none pointer-events-none">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{week.badgeIcon ?? '📚'}</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Mission {week.number}</p>
              <h3 className="font-black text-sm" style={{ color: '#1A1033' }}>{week.title}</h3>
            </div>
          </div>
          <p className="text-xs text-gray-400 line-clamp-2">{week.description}</p>
        </div>

        {/* Lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <motion.div
            animate={lockControls}
            className="flex flex-col items-center gap-1.5"
          >
            <motion.div
              animate={{ scale: [1, 1.07, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow"
              style={{ background: '#EDE9FF', border: '1px solid #E4DEFF' }}
            >
              <span className="text-lg">🔒</span>
            </motion.div>
            <p className="text-[10px] font-bold text-brand-400 tracking-wide uppercase">Locked</p>
          </motion.div>
        </div>
      </motion.button>
    )
  }

  /* ── UNLOCKED ───────────────────────────────────────────────── */
  return (
    <motion.div variants={fadeUp}>
      <Link href={`/week/${week.id}`}>
        <motion.div
          className="w-full bg-white rounded-2xl p-6 cursor-pointer group relative overflow-hidden"
          style={{
            border: isCompleted ? '1.5px solid #10B981' : '1.5px solid #E4DEFF',
            boxShadow: '0 2px 12px rgba(91,56,245,0.06)',
          }}
          whileHover={{
            y: -4,
            boxShadow: isCompleted
              ? '0 16px 40px -8px rgba(16,185,129,0.18)'
              : '0 16px 40px -8px rgba(91,56,245,0.16)',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
            style={{ background: isCompleted ? '#10B981' : 'linear-gradient(90deg, #5B38F5, #7C3AED)' }}
          />

          {/* Hover tint */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
            style={{ background: isCompleted ? 'rgba(16,185,129,0.03)' : 'rgba(91,56,245,0.03)' }}
          />

          <div className="flex items-start justify-between mb-3 relative">
            <div className="flex items-center gap-3">
              <motion.span
                className="text-2xl"
                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.15 }}
                transition={{ duration: 0.35 }}
              >
                {week.badgeIcon ?? '📚'}
              </motion.span>
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                  style={{ color: isCompleted ? '#10B981' : '#5B38F5' }}
                >
                  Mission {week.number}
                </p>
                <h3 className="font-black text-sm group-hover:text-brand-700 transition-colors" style={{ color: '#1A1033' }}>
                  {week.title}
                </h3>
              </div>
            </div>

            {isCompleted ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
              </motion.div>
            ) : (
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              >
                <ChevronRight size={18} className="text-gray-300 group-hover:text-brand-500 transition-colors flex-shrink-0" />
              </motion.div>
            )}
          </div>

          <p className="text-xs text-gray-400 mb-4 line-clamp-2 relative leading-relaxed">{week.description}</p>

          {/* Progress + CTA */}
          <div className="space-y-2 relative">
            <div className="flex justify-between text-[10px] font-medium">
              <span className="text-gray-400">{completedCount}/{totalCount} subtopics complete</span>
              <span style={{ color: isCompleted ? '#10B981' : '#5B38F5' }}>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F0ECFF' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: isCompleted ? '#10B981' : 'linear-gradient(90deg, #5B38F5, #7C3AED)' }}
                initial={{ width: '0%' }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: [0.34, 1.2, 0.64, 1] }}
              />
            </div>

            {/* CTA label */}
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: isCompleted ? '#10B981' : '#5B38F5' }}>
                {isCompleted ? 'Mission complete' : isStarted ? 'Continue mission' : 'Start mission'}
              </span>
              {!isCompleted && <Rocket size={10} style={{ color: '#5B38F5' }} />}
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  )
}
