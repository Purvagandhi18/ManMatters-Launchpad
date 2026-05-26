'use client'
import { motion, useAnimation } from 'framer-motion'
import { Lock, ChevronRight, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
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

  const allSubtopics = week.topics.flatMap((t) => t.subtopics)
  const completedCount = allSubtopics.filter(
    (s) => s.userProgress.length > 0 && (s.userProgress[0].quizPassed || s.userProgress[0].completedAt)
  ).length
  const totalCount = allSubtopics.length
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const isCompleted = userProgress?.isCompleted ?? false

  async function handleLockedClick() {
    // Shake the lock then call parent
    await lockControls.start({
      x: [0, -10, 10, -8, 8, -4, 4, 0],
      transition: { duration: 0.45 },
    })
    onLockClick?.()
  }

  /* ── LOCKED CARD ─────────────────────────────────────────────── */
  if (isLocked) {
    return (
      <motion.button
        variants={fadeUp}
        onClick={handleLockedClick}
        className="relative w-full text-left bg-white border-2 border-gray-200 rounded-2xl p-6 cursor-pointer overflow-hidden group"
        whileHover={{ scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        {/* Shimmer sweep */}
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />

        {/* Pulsing lock */}
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl z-10">
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            className="bg-gray-100 rounded-full p-3 group-hover:bg-gray-200 transition-colors"
          >
            <motion.div animate={lockControls}>
              <Lock size={22} className="text-gray-400" />
            </motion.div>
          </motion.div>
        </div>

        {/* Blurred content behind */}
        <div className="blur-[3px] opacity-50 select-none pointer-events-none">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{week.badgeIcon ?? '📚'}</span>
            <div>
              <p className="text-xs text-gray-500 font-medium">WEEK {week.number}</p>
              <h3 className="font-bold text-gray-900">{week.title}</h3>
            </div>
          </div>
          <p className="text-sm text-gray-500 line-clamp-2">{week.description}</p>
          <div className="mt-4 h-1.5 bg-gray-100 rounded-full" />
        </div>
      </motion.button>
    )
  }

  /* ── UNLOCKED CARD ───────────────────────────────────────────── */
  return (
    <motion.div variants={fadeUp}>
      <Link href={`/week/${week.id}`}>
        <motion.div
          className={cn(
            'w-full bg-white border-2 rounded-2xl p-6 cursor-pointer group relative overflow-hidden',
            isCompleted ? 'border-green-400' : 'border-brand-500'
          )}
          whileHover={{
            y: -5,
            boxShadow: isCompleted
              ? '0 16px 36px -6px rgba(16,185,129,0.18)'
              : '0 16px 36px -6px rgba(79,70,229,0.18)',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        >
          {/* Hover glow tint */}
          <div
            className={cn(
              'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none',
              isCompleted ? 'bg-green-50/40' : 'bg-brand-50/40'
            )}
          />

          <div className="flex items-start justify-between mb-4 relative">
            <div className="flex items-center gap-3">
              <motion.span
                className="text-2xl"
                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.15 }}
                transition={{ duration: 0.4 }}
              >
                {week.badgeIcon ?? '📚'}
              </motion.span>
              <div>
                <p
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wide',
                    isCompleted ? 'text-green-600' : 'text-brand-600'
                  )}
                >
                  Week {week.number}
                </p>
                <h3 className="font-bold text-gray-900 group-hover:text-brand-700 transition-colors">
                  {week.title}
                </h3>
              </div>
            </div>
            {isCompleted ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
              </motion.div>
            ) : (
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              >
                <ChevronRight size={20} className="text-gray-400 group-hover:text-brand-600 transition-colors flex-shrink-0" />
              </motion.div>
            )}
          </div>

          <p className="text-sm text-gray-500 mb-4 line-clamp-2 relative">{week.description}</p>

          {/* Animated progress bar */}
          <div className="space-y-1.5 relative">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{completedCount} / {totalCount} subtopics</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', isCompleted ? 'bg-green-500' : '')}
                style={!isCompleted ? { background: 'linear-gradient(90deg, #6366f1, #7c3aed)' } : {}}
                initial={{ width: '0%' }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: [0.34, 1.2, 0.64, 1] }}
              />
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  )
}
