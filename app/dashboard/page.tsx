'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Navbar } from '@/components/learner/Navbar'
import { WeekCard } from '@/components/learner/WeekCard'
import { Trophy, Medal, Award, X, Zap, Flame, Star } from 'lucide-react'
import { formatXP, getInitials } from '@/lib/utils'
import { staggerContainer } from '@/lib/animations'
import { getLearnerTitle } from '@/lib/gamification'

const LEVEL_COLORS: Record<number, { ring: string; shadow: string }> = {
  1: { ring: '#94a3b8', shadow: 'rgba(148,163,184,0.30)' },
  2: { ring: '#60a5fa', shadow: 'rgba(96,165,250,0.30)'  },
  3: { ring: '#818cf8', shadow: 'rgba(129,140,248,0.35)' },
  4: { ring: '#a78bfa', shadow: 'rgba(167,139,250,0.35)' },
  5: { ring: '#f472b6', shadow: 'rgba(244,114,182,0.35)' },
  6: { ring: '#fb923c', shadow: 'rgba(251,146,60,0.35)'  },
  7: { ring: '#fbbf24', shadow: 'rgba(251,191,36,0.40)'  },
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
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
      fetch('/api/weeks').then(r => r.json()),
      fetch('/api/users/me').then(r => r.json()),
      fetch('/api/leaderboard').then(r => r.json()),
    ]).then(([w, u, l]) => {
      setWeeks(w)
      setUserData(u)
      setLeaderboard(l.slice(0, 3))
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

  const lc        = LEVEL_COLORS[userData.level.level] ?? LEVEL_COLORS[1]
  const title     = getLearnerTitle(userData.level.level, userData.streak)
  const firstName = userData.displayName.split(' ')[0]
  const greeting  = getGreeting()
  const xpPct     = Math.min(100, ((userData.totalXP - userData.level.minXP) / Math.max(1, userData.level.maxXP - userData.level.minXP)) * 100)

  const rankIcons = [
    <Trophy key="1" size={16} className="text-yellow-500" />,
    <Medal  key="2" size={16} className="text-gray-400"   />,
    <Award  key="3" size={16} className="text-amber-700"  />,
  ]

  return (
    <div className="min-h-screen" style={{ background: '#F8F6FF' }}>
      <Navbar user={userData} title={title} />

      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* ── Hero ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
            className="relative rounded-3xl overflow-hidden mb-8 border"
            style={{
              background: 'linear-gradient(145deg, #EDEAFF 0%, #F5F3FF 55%, #FAFAFE 100%)',
              borderColor: '#E4DEFF',
            }}
          >
            {/* Subtle dot grid */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.055]"
              style={{ backgroundImage: 'radial-gradient(circle, #5B38F5 1px, transparent 1px)', backgroundSize: '26px 26px' }}
            />
            {/* Floating orbs */}
            <motion.div
              animate={{ x: [0, 18, 0], y: [0, -14, 0] }}
              transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut' }}
              className="absolute -top-28 -right-16 w-96 h-96 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(91,56,245,0.09) 0%, transparent 70%)' }}
            />
            <motion.div
              animate={{ x: [0, -12, 0], y: [0, 18, 0] }}
              transition={{ repeat: Infinity, duration: 11, ease: 'easeInOut', delay: 1.5 }}
              className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(91,56,245,0.06) 0%, transparent 70%)' }}
            />

            <div className="relative px-6 pt-8 pb-6 md:px-10">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">

                {/* Avatar + Identity */}
                <div className="flex items-center gap-5">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                    className="relative flex-shrink-0"
                  >
                    <div
                      className="absolute inset-0 rounded-2xl blur-xl opacity-70 pointer-events-none"
                      style={{ background: lc.shadow, transform: 'scale(1.5)' }}
                    />
                    <div
                      className="relative w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${lc.ring}, #5B38F5)` }}
                    >
                      {getInitials(userData.displayName)}
                    </div>
                    <div
                      className="absolute -bottom-1.5 -right-1.5 bg-white rounded-full h-6 px-2 flex items-center text-[10px] font-black shadow border border-gray-100"
                      style={{ color: lc.ring }}
                    >
                      L{userData.level.level}
                    </div>
                  </motion.div>

                  <div>
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.18 }}
                      className="flex items-center gap-2 mb-1"
                    >
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-600">
                        {title}
                      </span>
                      {userData.streak >= 2 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-2 py-0.5">
                          🔥 {userData.streak}w streak
                        </span>
                      )}
                    </motion.div>

                    <motion.h1
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.22, type: 'spring', stiffness: 280, damping: 22 }}
                      className="text-3xl md:text-4xl font-black tracking-tight"
                      style={{ color: '#1A1033' }}
                    >
                      {firstName}
                    </motion.h1>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.34 }}
                      className="text-gray-400 text-xs mt-0.5"
                    >
                      {greeting} · {userData.level.name}
                    </motion.p>
                  </div>
                </div>

                {/* Stat cards */}
                <div className="sm:ml-auto flex flex-wrap gap-3">
                  {[
                    { icon: <Zap size={15} className="text-brand-600" />, bg: 'bg-brand-50', value: <AnimatedXP value={userData.totalXP} />, label: 'XP Earned',  delay: 0.28 },
                    { icon: <Flame size={15} className="text-orange-500" />, bg: 'bg-orange-50', value: userData.streak > 0 ? `${userData.streak}w` : '—', label: userData.streak > 0 ? 'Week streak' : 'Start a streak', delay: 0.36 },
                    { icon: <Star size={15} className="text-amber-500" />, bg: 'bg-amber-50', value: userData.userBadges.length, label: 'Badges earned', delay: 0.44 },
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10, scale: 0.92 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: s.delay, type: 'spring', stiffness: 300 }}
                      className="flex items-center gap-2.5 bg-white/85 backdrop-blur-sm border border-white rounded-2xl px-4 py-3 min-w-[110px] shadow-sm"
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.bg}`}>
                        {s.icon}
                      </div>
                      <div>
                        <p className="font-black text-lg leading-none" style={{ color: '#1A1033' }}>{s.value}</p>
                        <p className="text-gray-400 text-[10px] uppercase tracking-wide mt-0.5">{s.label}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* XP Progress bar */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 pt-5"
                style={{ borderTop: '1px solid #E4DEFF' }}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-medium text-gray-500">{userData.totalXP.toLocaleString()} XP</span>
                  {userData.level.maxXP < Infinity ? (
                    <span className="text-gray-400">
                      {(userData.level.maxXP + 1).toLocaleString()} XP to {userData.level.name === 'Rookie' ? 'Builder' : 'next level'}
                    </span>
                  ) : (
                    <span className="font-semibold" style={{ color: lc.ring }}>Max level reached 🏆</span>
                  )}
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#E4DEFF' }}>
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: `${xpPct}%` }}
                    transition={{ duration: 1.4, ease: [0.34, 1.4, 0.64, 1], delay: 0.55 }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, #5B38F5, ${lc.ring})` }}
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-8">

            {/* ── Missions grid ─────────────────────────────────── */}
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-5"
              >
                <h2 className="text-xl font-black" style={{ color: '#1A1033' }}>Your Missions</h2>
                <p className="text-sm text-gray-400 mt-0.5">8-week startup operator program — one mission at a time</p>
              </motion.div>

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

            {/* ── Sidebar ───────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 24 }}
              className="lg:w-72 space-y-5"
            >
              {/* Top operators */}
              <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid #E4DEFF' }}>
                <h3 className="font-bold mb-4 flex items-center gap-2 text-sm" style={{ color: '#1A1033' }}>
                  <Trophy size={16} className="text-yellow-500" /> Top Operators
                </h3>
                <div className="space-y-2.5">
                  {leaderboard.map((entry, i) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + i * 0.08 }}
                      className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${entry.id === currentUserId ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="w-6 flex items-center justify-center">{rankIcons[i]}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${entry.id === currentUserId ? 'text-brand-700' : ''}`} style={entry.id !== currentUserId ? { color: '#1A1033' } : {}}>
                          {entry.displayName}{entry.id === currentUserId ? ' (you)' : ''}
                        </p>
                        <p className="text-xs text-gray-400">{entry.level.name}</p>
                      </div>
                      <span className="text-sm font-bold text-brand-600">{formatXP(entry.totalXP)}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Badges */}
              {userData.userBadges.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid #E4DEFF' }}>
                  <h3 className="font-bold mb-4 text-sm" style={{ color: '#1A1033' }}>Badges Earned</h3>
                  <div className="flex flex-wrap gap-2">
                    {userData.userBadges.slice(0, 8).map((ub, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5 + i * 0.06, type: 'spring', stiffness: 400, damping: 18 }}
                        whileHover={{ scale: 1.18, rotate: [0, -8, 8, 0] }}
                        title={ub.badge.name}
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl cursor-default shadow-sm"
                        style={{ background: '#F0ECFF', border: '1px solid #E4DEFF' }}
                      >
                        {ub.badge.iconEmoji}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Momentum card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid #E4DEFF' }}>
                <h3 className="font-bold mb-3 text-sm" style={{ color: '#1A1033' }}>Your momentum</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Consistency',  value: userData.streak >= 3 ? 'On a roll 🔥' : userData.streak >= 1 ? 'Building it' : 'Just starting' },
                    { label: 'XP pace',      value: userData.totalXP >= 1000 ? 'Strong' : 'Warming up' },
                    { label: 'Level status', value: `${Math.round(xpPct)}% to next` },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="font-semibold text-brand-600">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* ── Lock modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {lockModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            style={{ background: 'rgba(26,16,51,0.45)' }}
            onClick={() => setLockModal(false)}
          >
            <motion.div
              initial={{ scale: 0.82, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setLockModal(false)}
                className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <X size={18} />
              </button>

              <motion.div
                animate={{ rotate: [0, -12, 12, -8, 8, 0], y: [0, -6, 0] }}
                transition={{ duration: 0.55, delay: 0.15 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5"
                style={{ background: '#F0ECFF' }}
              >
                <span className="text-4xl">🔒</span>
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-black mb-2"
                style={{ color: '#1A1033' }}
              >
                Mission locked.
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-gray-500 text-sm leading-relaxed mb-1"
              >
                You haven&apos;t unlocked this yet — but you&apos;re on the right path.
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.42 }}
                className="text-gray-400 text-xs mb-6"
              >
                Each mission builds on the last. Complete your current track to advance.
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.52 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setLockModal(false)}
                className="w-full text-white font-semibold py-3 rounded-xl text-sm shadow-lg"
                style={{ background: 'linear-gradient(135deg, #5B38F5, #7C3AED)' }}
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
