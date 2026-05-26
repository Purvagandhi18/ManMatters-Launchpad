'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Navbar } from '@/components/learner/Navbar'
import { formatXP, getInitials } from '@/lib/utils'
import { Flame, Zap } from 'lucide-react'

interface LeaderEntry {
  id: string
  displayName: string
  avatarUrl: string | null
  totalXP: number
  level: { level: number; name: string }
  streak: number
  badgeCount: number
}

interface UserData {
  displayName: string
  totalXP: number
  level: { name: string; level: number }
  streak: number
  userBadges: { badge: { name: string; iconEmoji: string } }[]
}

const PODIUM = [
  { rank: 1, height: 'h-24', medal: '🥇', gradient: 'from-yellow-400 to-amber-500', ring: 'ring-yellow-400' },
  { rank: 2, height: 'h-16', medal: '🥈', gradient: 'from-slate-400 to-slate-500',  ring: 'ring-slate-400'  },
  { rank: 3, height: 'h-12', medal: '🥉', gradient: 'from-amber-600 to-amber-700', ring: 'ring-amber-600'  },
]
// Podium display order: 2nd, 1st, 3rd
const PODIUM_ORDER = [1, 0, 2]

export default function LeaderboardPage() {
  const { data: session } = useSession()
  const [board, setBoard]       = useState<LeaderEntry[]>([])
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading]   = useState(true)

  const currentUserId = (session?.user as { id?: string })?.id

  useEffect(() => {
    Promise.all([
      fetch('/api/leaderboard').then(r => r.json()),
      fetch('/api/users/me').then(r => r.json()),
    ]).then(([l, u]) => {
      setBoard(l)
      setUserData(u)
      setLoading(false)
    })
  }, [])

  if (loading || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 rounded-full"
          style={{ border: '3px solid #e0e7ff', borderTopColor: '#4f46e5' }}
        />
      </div>
    )
  }

  const podiumEntries = board.slice(0, 3)
  const listEntries   = board

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={userData} />

      <main className="pt-16">
        <div className="max-w-2xl mx-auto px-4 py-8">

          <motion.h1
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-gray-900 mb-6 text-center"
          >
            Leaderboard
          </motion.h1>

          {/* Podium */}
          {podiumEntries.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              className="bg-gradient-to-br from-brand-50 to-purple-50 rounded-2xl p-6 mb-6 border border-brand-100"
            >
              <div className="flex items-end justify-center gap-4 mb-2">
                {PODIUM_ORDER.map((pi) => {
                  const p     = PODIUM[pi]
                  const entry = podiumEntries[p.rank - 1]
                  if (!entry) return null
                  const isMe = entry.id === currentUserId
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + pi * 0.1, type: 'spring', stiffness: 240, damping: 22 }}
                      className="flex flex-col items-center gap-2"
                    >
                      {/* Avatar */}
                      <motion.div
                        whileHover={{ scale: 1.08, rotate: [0, -4, 4, 0] }}
                        transition={{ duration: 0.3 }}
                        className={`w-12 h-12 rounded-full bg-gradient-to-br ${p.gradient} flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ${p.ring}`}
                      >
                        {getInitials(entry.displayName)}
                      </motion.div>

                      <p className={`text-xs font-semibold text-center max-w-[72px] truncate ${isMe ? 'text-brand-700' : 'text-gray-700'}`}>
                        {entry.displayName}{isMe ? ' (you)' : ''}
                      </p>

                      <p className="text-xs font-bold text-brand-600">
                        {formatXP(entry.totalXP)} XP
                      </p>

                      {/* Podium block */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: undefined }}
                        className={`w-20 ${p.height} bg-gradient-to-t ${p.gradient} rounded-t-xl flex items-start justify-center pt-2 shadow-md`}
                      >
                        <span className="text-lg">{p.medal}</span>
                      </motion.div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Full ranked list with layout animation */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
          >
            <LayoutGroup>
              <AnimatePresence initial={false}>
                {listEntries.map((entry, i) => {
                  const isMe = entry.id === currentUserId
                  const rank = i + 1
                  return (
                    <motion.div
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ delay: 0.35 + i * 0.05, type: 'spring', stiffness: 260, damping: 26 }}
                      className={cn(
                        'flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 transition-colors',
                        isMe ? 'bg-brand-50' : 'hover:bg-gray-50'
                      )}
                    >
                      {/* Rank */}
                      <motion.div
                        layout
                        className={`w-8 text-center text-sm font-bold ${rank <= 3 ? 'text-yellow-600' : 'text-gray-400'}`}
                      >
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                      </motion.div>

                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${isMe ? 'ring-2 ring-brand-400' : ''}`}>
                        {getInitials(entry.displayName)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isMe ? 'text-brand-700' : 'text-gray-900'}`}>
                          {entry.displayName}{isMe ? ' (you)' : ''}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-400">Lvl {entry.level.level} · {entry.level.name}</span>
                          {entry.streak > 0 && (
                            <span className="text-xs text-orange-500 flex items-center gap-0.5 font-medium">
                              <Flame size={10} /> {entry.streak}w
                            </span>
                          )}
                          {entry.badgeCount > 0 && (
                            <span className="text-xs text-gray-400">🏅 {entry.badgeCount}</span>
                          )}
                        </div>
                      </div>

                      {/* XP */}
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 justify-end">
                          <Zap size={12} className="text-brand-400" />
                          <p className="text-sm font-bold text-brand-600">{formatXP(entry.totalXP)}</p>
                        </div>
                        <p className="text-xs text-gray-400">XP</p>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </LayoutGroup>
          </motion.div>
        </div>
      </main>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
