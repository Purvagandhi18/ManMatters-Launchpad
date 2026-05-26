'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Navbar } from '@/components/learner/Navbar'
import { formatXP, getInitials } from '@/lib/utils'
import { Flame, Zap, Trophy } from 'lucide-react'
import { getLearnerTitle } from '@/lib/gamification'

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
  { rank: 1, height: 'h-24', medal: '🥇', color: '#F59E0B', ring: 'rgba(245,158,11,0.3)'  },
  { rank: 2, height: 'h-16', medal: '🥈', color: '#94A3B8', ring: 'rgba(148,163,184,0.3)' },
  { rank: 3, height: 'h-12', medal: '🥉', color: '#D97706', ring: 'rgba(217,119,6,0.3)'   },
]
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F6FF' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 rounded-full"
          style={{ border: '3px solid #E4DEFF', borderTopColor: '#5B38F5' }}
        />
      </div>
    )
  }

  const podiumEntries = board.slice(0, 3)
  const myRank        = board.findIndex(e => e.id === currentUserId) + 1

  return (
    <div className="min-h-screen" style={{ background: '#F8F6FF' }}>
      <Navbar user={userData} title={getLearnerTitle(userData.level.level, userData.streak)} />

      <main className="pt-14">
        <div className="max-w-2xl mx-auto px-4 py-8">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-500 mb-2">
              <Trophy size={13} /> Mission Control Rankings
            </div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1A1033' }}>Leaderboard</h1>
            <p className="text-sm text-gray-400 mt-1">
              {myRank > 0 ? `You're ranked #${myRank} — keep pushing` : 'See how your cohort is performing'}
            </p>
          </motion.div>

          {/* Podium */}
          {podiumEntries.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              className="rounded-2xl p-6 mb-6"
              style={{ background: 'linear-gradient(145deg, #EDEAFF 0%, #F5F3FF 100%)', border: '1px solid #E4DEFF' }}
            >
              <div className="flex items-end justify-center gap-6 mb-2">
                {PODIUM_ORDER.map(pi => {
                  const p     = PODIUM[pi]
                  const entry = podiumEntries[p.rank - 1]
                  if (!entry) return null
                  const isMe  = entry.id === currentUserId
                  const title = getLearnerTitle(entry.level.level)
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + pi * 0.1, type: 'spring', stiffness: 240, damping: 22 }}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <motion.div
                        whileHover={{ scale: 1.08, rotate: [0, -4, 4, 0] }}
                        transition={{ duration: 0.3 }}
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, ${p.color}, #5B38F5)`,
                          boxShadow: `0 6px 20px ${p.ring}`,
                          outline: isMe ? `2px solid ${p.color}` : 'none',
                          outlineOffset: 2,
                        }}
                      >
                        {getInitials(entry.displayName)}
                      </motion.div>

                      <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wide">{title}</p>
                      <p className={`text-xs font-bold text-center max-w-[72px] truncate ${isMe ? 'text-brand-700' : ''}`} style={!isMe ? { color: '#1A1033' } : {}}>
                        {entry.displayName}{isMe ? ' (you)' : ''}
                      </p>
                      <p className="text-xs font-bold text-brand-600">{formatXP(entry.totalXP)} XP</p>

                      {/* Podium block */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: undefined }}
                        className={`w-20 ${p.height} rounded-t-xl flex items-start justify-center pt-2 shadow-md`}
                        style={{ background: `linear-gradient(180deg, ${p.color}40, ${p.color}20)`, border: `1px solid ${p.color}30` }}
                      >
                        <span className="text-lg">{p.medal}</span>
                      </motion.div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Full ranked list */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl overflow-hidden shadow-sm"
            style={{ border: '1px solid #E4DEFF' }}
          >
            <LayoutGroup>
              <AnimatePresence initial={false}>
                {board.map((entry, i) => {
                  const isMe  = entry.id === currentUserId
                  const rank  = i + 1
                  const title = getLearnerTitle(entry.level.level, entry.streak)
                  return (
                    <motion.div
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ delay: 0.35 + i * 0.05, type: 'spring', stiffness: 260, damping: 26 }}
                      className="flex items-center gap-4 px-5 py-4 transition-colors"
                      style={{
                        borderBottom: i < board.length - 1 ? '1px solid #F5F3FF' : 'none',
                        background: isMe ? '#F5F3FF' : undefined,
                      }}
                    >
                      {/* Rank */}
                      <motion.div layout className="w-8 text-center text-sm font-black" style={{ color: rank <= 3 ? '#F59E0B' : '#CBD5E1' }}>
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                      </motion.div>

                      {/* Avatar */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-sm"
                        style={{
                          background: 'linear-gradient(135deg, #5B38F5, #7C3AED)',
                          outline: isMe ? '2px solid #5B38F5' : 'none',
                          outlineOffset: 2,
                        }}
                      >
                        {getInitials(entry.displayName)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-black truncate" style={{ color: isMe ? '#5B38F5' : '#1A1033' }}>
                            {entry.displayName}{isMe ? ' (you)' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wide">{title}</span>
                          <span className="text-[10px] text-gray-300">·</span>
                          <span className="text-[10px] text-gray-400">{entry.level.name}</span>
                          {entry.streak > 0 && (
                            <span className="text-[10px] text-orange-500 flex items-center gap-0.5 font-medium">
                              <Flame size={9} /> {entry.streak}w
                            </span>
                          )}
                        </div>
                      </div>

                      {/* XP */}
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 justify-end">
                          <Zap size={11} className="text-brand-400" />
                          <p className="text-sm font-black text-brand-600">{formatXP(entry.totalXP)}</p>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">XP</p>
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
