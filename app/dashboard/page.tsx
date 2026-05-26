'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Navbar } from '@/components/learner/Navbar'
import { WeekCard } from '@/components/learner/WeekCard'
import { Trophy, Medal, Award, X, Lock, Zap, Flame, Star } from 'lucide-react'
import { formatXP, getInitials } from '@/lib/utils'
import { staggerContainer } from '@/lib/animations'

// Level-specific ring / accent colours
const LEVEL_COLORS: Record<number, { ring: string; glow: string; label: string }> = {
  1: { ring: '#94a3b8', glow: 'rgba(148,163,184,0.35)', label: 'bg-slate-400/20 text-slate-200'   },
  2: { ring: '#60a5fa', glow: 'rgba(96,165,250,0.35)',  label: 'bg-blue-400/20 text-blue-200'     },
  3: { ring: '#818cf8', glow: 'rgba(129,140,248,0.40)', label: 'bg-indigo-400/20 text-indigo-200' },
  4: { ring: '#a78bfa', glow: 'rgba(167,139,250,0.40)', label: 'bg-violet-400/20 text-violet-200' },
  5: { ring: '#f472b6', glow: 'rgba(244,114,182,0.40)', label: 'bg-pink-400/20 text-pink-200'     },
  6: { ring: '#fb923c', glow: 'rgba(251,146,60,0.40)',  label: 'bg-orange-400/20 text-orange-200' },
  7: { ring: '#fbbf24', glow: 'rgba(251,191,36,0.45)',  label: 'bg-amber-400/20 text-amber-200'   },
}

interface WeekData {
  id: string
  number: number
  title: string
  description: string
  badgeIcon?: string | null
  isPublished: boolean
  weekProgress: { isUnlocked: boolean; isCompleted: boolean }[]
  topics: {
    subtopics: {
      userProgress: { quizPassed?: boolean; completedAt?: string | null }[]
      quiz: { id: string } | null
      project: { id: string } | null
    }[]
  }[]
}

interface UserData {
  displayName: string
  totalXP: number
  level: { name: string; level: number; minXP: number; maxXP: number }
  streak: number
  userBadges: { badge: { name: string; iconEmoji: string } }[]
}

interface LeaderEntry {
  id: string
  displayName: string
  totalXP: number
  level: { name: string }
  streak: number
}

function AnimatedXP({ value }: { value: number }) {
  const raw = useMotionValue(0)
  const spring = useSpring(raw, { stiffness: 55, damping: 18 })
  const displayed = useTransform(spring, (v) => Math.round(v).toLocaleString())
  useEffect(() => { raw.set(value) }, [value, raw])
  return <motion.span>{displayed}</motion.span>
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [weeks, setWeeks]             = useState<WeekData[]>([])
  const [userData, setUserData]       = useState<UserData | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([])
  const [lockModal, setLockModal]     = useState(false)
  const [loading, setLoading]         = useState(true)

  const currentUserId = (session?.user as { id?: string })?.id

  useEffect(() => {
    Promise.all([
      fetch('/api/weeks').then((r) => r.json()),
      fetch('/api/users/me').then((r) => r.json()),
      fetch('/api/leaderboard').then((r) => r.json()),
    ]).then(([w, u, l]) => {
      setWeeks(w)
      setUserData(u)
      setLeaderboard(l.slice(0, 3))
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

  const rankIcons = [
    <Trophy key="1" size={18} className="text-yellow-500" />,
    <Medal  key="2" size={18} className="text-gray-400" />,
    <Award  key="3" size={18} className="text-amber-700" />,
  ]

  const xpPct = Math.min(
    100,
    ((userData.totalXP - userData.level.minXP) /
      Math.max(1, userData.level.maxXP - userData.level.minXP)) *
      100
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={userData} />

      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* ── Hero ─────────────────────────────────────────────────── */}
          {(() => {
            const lc      = LEVEL_COLORS[userData.level.level] ?? LEVEL_COLORS[1]
            const nextXP  = userData.level.maxXP < Infinity ? userData.level.maxXP : null
            const xpToNext = nextXP !== null ? nextXP + 1 : null
            return (
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                className="relative rounded-3xl overflow-hidden mb-8 text-white"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 40%, #7c3aed 100%)' }}
              >
                {/* Dot grid */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
                  style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                {/* Floating orbs */}
                <motion.div
                  animate={{ x: [0, 18, 0], y: [0, -12, 0] }}
                  transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
                  className="absolute -top-24 -left-20 w-80 h-80 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }}
                />
                <motion.div
                  animate={{ x: [0, -14, 0], y: [0, 16, 0] }}
                  transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut', delay: 1 }}
                  className="absolute -bottom-20 -right-16 w-72 h-72 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 70%)' }}
                />
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
                  transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 2 }}
                  className="absolute top-8 right-1/3 w-40 h-40 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }}
                />

                {/* Main content */}
                <div className="relative px-6 pt-7 pb-5 md:px-10 md:pt-9">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">

                    {/* Avatar + identity */}
                    <div className="flex items-center gap-5">
                      {/* Avatar ring */}
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                        className="relative flex-shrink-0"
                      >
                        {/* Glow behind ring */}
                        <div className="absolute inset-0 rounded-full blur-md"
                          style={{ background: lc.glow, transform: 'scale(1.3)' }} />
                        {/* Ring */}
                        <div className="relative w-20 h-20 rounded-full flex items-center justify-center"
                          style={{ padding: 3, background: `linear-gradient(135deg, ${lc.ring}, #ffffff30)` }}>
                          <div className="w-full h-full rounded-full bg-[#4338ca] flex items-center justify-center">
                            <span className="text-2xl font-black tracking-tight"
                              style={{ color: lc.ring }}>
                              {getInitials(userData.displayName)}
                            </span>
                          </div>
                        </div>
                        {/* Level badge on avatar */}
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-[#4f46e5]"
                          style={{ background: lc.ring, color: '#0f0c29' }}>
                          {userData.level.level}
                        </div>
                      </motion.div>

                      {/* Name + level */}
                      <div>
                        <motion.p
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.18 }}
                          className="text-xs font-bold uppercase tracking-[0.15em] mb-0.5"
                          style={{ color: lc.ring }}
                        >
                          {userData.level.name}
                        </motion.p>
                        <motion.h1
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.24, type: 'spring', stiffness: 280, damping: 22 }}
                          className="text-3xl md:text-4xl font-black tracking-tight text-white"
                        >
                          {userData.displayName}
                        </motion.h1>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.36 }}
                          className="text-white/40 text-xs mt-0.5"
                        >
                          Level {userData.level.level} operator
                        </motion.p>
                      </div>
                    </div>

                    {/* Stat pills — right aligned */}
                    <div className="sm:ml-auto flex flex-wrap gap-3">
                      {/* XP stat */}
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.28, type: 'spring', stiffness: 300 }}
                        className="flex items-center gap-2.5 bg-white/[0.07] backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3 min-w-[110px]"
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{ background: 'rgba(99,102,241,0.25)' }}>
                          <Zap size={15} className="text-indigo-300" />
                        </div>
                        <div>
                          <p className="text-white font-black text-lg leading-none">
                            <AnimatedXP value={userData.totalXP} />
                          </p>
                          <p className="text-white/40 text-[10px] uppercase tracking-wide mt-0.5">XP earned</p>
                        </div>
                      </motion.div>

                      {/* Streak stat */}
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.36, type: 'spring', stiffness: 300 }}
                        className="flex items-center gap-2.5 bg-white/[0.07] backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3 min-w-[110px]"
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-orange-500/20">
                          <Flame size={15} className="text-orange-400" />
                        </div>
                        <div>
                          <p className="text-white font-black text-lg leading-none">
                            {userData.streak > 0 ? userData.streak : '—'}
                          </p>
                          <p className="text-white/40 text-[10px] uppercase tracking-wide mt-0.5">
                            {userData.streak > 0 ? 'Wk streak' : 'No streak'}
                          </p>
                        </div>
                      </motion.div>

                      {/* Badges stat */}
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.44, type: 'spring', stiffness: 300 }}
                        className="flex items-center gap-2.5 bg-white/[0.07] backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3 min-w-[110px]"
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/20">
                          <Star size={15} className="text-amber-400" />
                        </div>
                        <div>
                          <p className="text-white font-black text-lg leading-none">{userData.userBadges.length}</p>
                          <p className="text-white/40 text-[10px] uppercase tracking-wide mt-0.5">Badges</p>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* XP progress bar — full width, bottom of hero */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 pt-5 border-t border-white/[0.08]"
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-white/50 font-medium">
                        {userData.totalXP.toLocaleString()} XP
                      </span>
                      {xpToNext !== null ? (
                        <span className="text-white/40">
                          Next level at {xpToNext.toLocaleString()} XP
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold">Max level reached 🏆</span>
                      )}
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: `${xpPct}%` }}
                        transition={{ duration: 1.4, ease: [0.34, 1.4, 0.64, 1], delay: 0.55 }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${lc.ring}cc, ${lc.ring})` }}
                      />
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )
          })()}

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Week grid */}
            <div className="flex-1">
              <motion.h2
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-bold text-gray-900 mb-4"
              >
                Your 8-Week Program
              </motion.h2>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {weeks.map((week) => {
                  const progress = week.weekProgress[0] ?? null
                  const isLocked = !progress?.isUnlocked
                  return (
                    <WeekCard
                      key={week.id}
                      week={week}
                      userProgress={progress}
                      isLocked={isLocked}
                      onLockClick={() => setLockModal(true)}
                    />
                  )
                })}
              </motion.div>
            </div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 24 }}
              className="lg:w-72 space-y-6"
            >
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Trophy size={18} className="text-yellow-500" /> Top Learners
                </h3>
                <div className="space-y-3">
                  {leaderboard.map((entry, i) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + i * 0.08 }}
                      className={`flex items-center gap-3 p-2 rounded-xl ${entry.id === currentUserId ? 'bg-brand-50' : ''}`}
                    >
                      <div className="w-7 flex items-center justify-center">{rankIcons[i]}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${entry.id === currentUserId ? 'text-brand-700' : 'text-gray-900'}`}>
                          {entry.displayName}{entry.id === currentUserId ? ' (you)' : ''}
                        </p>
                        <p className="text-xs text-gray-400">{entry.level.name}</p>
                      </div>
                      <span className="text-sm font-bold text-brand-600">{formatXP(entry.totalXP)}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {userData.userBadges.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Recent Badges</h3>
                  <div className="flex flex-wrap gap-2">
                    {userData.userBadges.slice(0, 6).map((ub, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5 + i * 0.07, type: 'spring', stiffness: 400, damping: 18 }}
                        whileHover={{ scale: 1.18, rotate: [0, -8, 8, 0] }}
                        title={ub.badge.name}
                        className="w-11 h-11 bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-100 rounded-xl flex items-center justify-center text-xl cursor-default shadow-sm"
                      >
                        {ub.badge.iconEmoji}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      {/* Lock modal */}
      <AnimatePresence>
        {lockModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setLockModal(false)}
          >
            <motion.div
              initial={{ scale: 0.82, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setLockModal(false)}
                className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <X size={18} />
              </button>

              <motion.div
                animate={{ rotate: [0, -10, 10, -7, 7, 0], y: [0, -5, 0] }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-5 shadow-inner"
              >
                <Lock size={32} className="text-gray-500" />
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-black text-gray-900 mb-2"
              >
                Mission locked. 🔒
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.32 }}
                className="text-gray-500 text-sm leading-relaxed mb-1"
              >
                You&apos;re not ready for this level yet — but you will be soon.
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.44 }}
                className="text-gray-400 text-xs mb-6"
              >
                Crush your current track to unlock the next mission. More startup quests incoming.
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setLockModal(false)}
                className="w-full bg-gradient-to-r from-brand-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity text-sm"
              >
                Back to my mission →
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
