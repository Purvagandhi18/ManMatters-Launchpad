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
import { signOut } from 'next-auth/react'

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
  avatarUrl?: string | null
  learnerTitle?: string | null
  totalXP: number
  level: { name: string; level: number; minXP: number; maxXP: number }
  streak: number
  userBadges: { badge: { name: string; iconEmoji: string; conditionType: string }; weekNumber: number | null; earnedAt: string }[]
}

interface LeaderEntry {
  id: string
  displayName: string
  totalXP: number
  level: { name: string }
  streak: number
}

interface NudgeItem {
  type: string
  icon: string
  title: string
  subtitle?: string
  value?: number
}

function nudgeBg(type: string) {
  if (type === 'project_graded')   return { bg: '#ECFDF5', border: '#BBF7D0' }
  if (type === 'xp_gained')        return { bg: '#EEF2FF', border: '#C7D2FE' }
  if (type === 'badge_earned')     return { bg: '#FEFCE8', border: '#FDE68A' }
  if (type === 'reflection_scored')return { bg: '#F5F3FF', border: '#E4DEFF' }
  if (type === 'week_unlocked')    return { bg: '#FFF7ED', border: '#FED7AA' }
  return { bg: '#F9FAFB', border: '#E5E7EB' }
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
  const [weeks, setWeeks]                       = useState<WeekData[]>([])
  const [userData, setUserData]                 = useState<UserData | null>(null)
  const [leaderboard, setLeaderboard]           = useState<LeaderEntry[]>([])
  const [lockModal, setLockModal]               = useState(false)
  const [loading, setLoading]                   = useState(true)
  const [nudges, setNudges]                     = useState<NudgeItem[]>([])
  const [xpDelta, setXpDelta]                   = useState(0)
  const [newBadgeKey, setNewBadgeKey]           = useState(0)
  const [newlyUnlockedWeekIds, setNewlyUnlockedWeekIds] = useState<Set<string>>(new Set())
  const [leveledUp, setLeveledUp]               = useState<string | null>(null)

  const currentUserId = (session?.user as { id?: string })?.id

  useEffect(() => {
    const lastSeen = localStorage.getItem('lp_last_seen')
    localStorage.setItem('lp_last_seen', new Date().toISOString())

    Promise.all([
      fetch('/api/weeks').then(r => r.json()),
      fetch('/api/users/me').then(async r => ({ ok: r.ok, data: await r.json() })),
      fetch('/api/leaderboard').then(r => r.json()),
      lastSeen
        ? fetch(`/api/users/nudges?since=${encodeURIComponent(lastSeen)}`).then(r => r.json()).catch(() => ({ nudges: [] }))
        : Promise.resolve({ nudges: [] }),
    ]).then(([w, u, l, nd]) => {
      if (!u.ok) { signOut({ callbackUrl: '/login' }); return }

      setWeeks(w)
      setUserData(u.data)
      setLeaderboard(l.slice(0, 3))
      setLoading(false)

      // Level-up detection
      const prevLevelNum = parseInt(localStorage.getItem('lp_level') ?? '0', 10)
      const currentLevelNum = u.data.level?.level ?? 1
      if (prevLevelNum > 0 && currentLevelNum > prevLevelNum) {
        setLeveledUp(u.data.level.name)
        setTimeout(() => setLeveledUp(null), 5000)
      }
      localStorage.setItem('lp_level', String(currentLevelNum))

      // Process nudges
      const items: NudgeItem[] = nd.nudges ?? []
      if (items.length > 0) {
        setNudges(items)
        const xpNudge = items.find(n => n.type === 'xp_gained')
        if (xpNudge?.value) {
          setXpDelta(xpNudge.value)
          setTimeout(() => setXpDelta(0), 3500)
        }
        if (items.some(n => n.type === 'badge_earned')) setNewBadgeKey(k => k + 1)
      }

      // Week unlock tracking (client-side, no schema change needed)
      const currentUnlocked = (w as WeekData[]).filter(wk => wk.weekProgress[0]?.isUnlocked).map(wk => wk.id)
      const prev: string[] = JSON.parse(localStorage.getItem('lp_unlocked_weeks') ?? '[]')
      const prevSet = new Set(prev)
      if (prevSet.size > 0) {
        const fresh = new Set(currentUnlocked.filter(id => !prevSet.has(id)))
        if (fresh.size > 0) {
          setNewlyUnlockedWeekIds(fresh)
          setTimeout(() => setNewlyUnlockedWeekIds(new Set()), 5000)
        }
      }
      localStorage.setItem('lp_unlocked_weeks', JSON.stringify(currentUnlocked))
    })
  }, [])

  if (loading || !userData || !userData.level) {
    return (
      <div className="min-h-screen" style={{ background: '#F8F6FF' }}>
        <div className="h-14 bg-white border-b border-[#E4DEFF]" />
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
          <div className="h-48 rounded-3xl bg-[#EDEAFF]/70 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-40 rounded-2xl bg-white border border-[#E4DEFF] animate-pulse" />)}
          </div>
        </div>
      </div>
    )
  }

  const lc        = LEVEL_COLORS[userData.level.level] ?? LEVEL_COLORS[1]
  const adjective = (userData.learnerTitle ?? getLearnerTitle(userData.level.level, userData.streak)).toUpperCase()
  const firstName = userData.displayName.split(' ')[0].toUpperCase()
  const greeting  = getGreeting()
  const xpPct     = Math.min(100, ((userData.totalXP - userData.level.minXP) / Math.max(1, userData.level.maxXP - userData.level.minXP)) * 100)

  const rankIcons = [
    <Trophy key="1" size={16} className="text-yellow-500" />,
    <Medal  key="2" size={16} className="text-gray-400"   />,
    <Award  key="3" size={16} className="text-amber-700"  />,
  ]

  return (
    <div className="min-h-screen" style={{ background: '#F8F6FF' }}>
      <Navbar user={userData} title={adjective} />

      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* ── Hero ─────────────────────────────────────────────── */}
          <div
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
            {/* Static orbs — no CPU repaint */}
            <div className="absolute -top-28 -right-16 w-96 h-96 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(91,56,245,0.08) 0%, transparent 70%)' }}
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
                      className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-lg"
                      style={userData.avatarUrl ? {} : { background: `linear-gradient(135deg, ${lc.ring}, #5B38F5)` }}
                    >
                      {userData.avatarUrl
                        ? <img src={userData.avatarUrl} alt="" className="w-full h-full object-cover" />
                        : <span className="w-full h-full flex items-center justify-center text-white font-black text-2xl">{getInitials(userData.displayName)}</span>
                      }
                    </div>
                    {userData.userBadges[0] ? (
                      <motion.div
                        key={`badge-${userData.userBadges[0].badge.name}-${newBadgeKey}`}
                        initial={newBadgeKey > 0 ? { scale: 0, rotate: -20 } : false}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.3 }}
                        className="absolute -bottom-1.5 -right-1.5 bg-white rounded-full w-7 h-7 flex items-center justify-center text-base shadow border border-gray-100"
                        title={userData.userBadges[0].badge.name}
                        style={newBadgeKey > 0 ? { boxShadow: '0 0 0 3px rgba(91,56,245,0.25), 0 2px 8px rgba(91,56,245,0.2)' } : {}}
                      >
                        {userData.userBadges[0].badge.iconEmoji}
                      </motion.div>
                    ) : (
                      <div
                        className="absolute -bottom-1.5 -right-1.5 bg-white rounded-full h-6 px-2 flex items-center text-[10px] font-black shadow border border-gray-100"
                        style={{ color: lc.ring }}
                      >
                        L{userData.level.level}
                      </div>
                    )}
                  </motion.div>

                  <div>
                    <motion.h1
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.18 }}
                      className="font-black leading-none mb-1.5 tracking-widest"
                      style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.15rem)', color: '#1A1033' }}
                    >
                      {adjective} {firstName}
                    </motion.h1>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs font-medium">Level {userData.level.level} · {userData.level.name}</span>
                      {userData.streak >= 2 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-2 py-0.5">
                          🔥 {userData.streak}w streak
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stat cards */}
                <div className="sm:ml-auto flex flex-wrap gap-3">
                  {/* XP card — with burst animation */}
                  <div className="relative flex items-center gap-2.5 bg-white/85 backdrop-blur-sm border border-white rounded-2xl px-4 py-3 min-w-[110px] shadow-sm">
                    <AnimatePresence>
                      {xpDelta > 0 && (
                        <motion.span
                          key="xp-burst"
                          initial={{ opacity: 0, y: 4, scale: 0.8 }}
                          animate={{ opacity: 1, y: -22, scale: 1 }}
                          exit={{ opacity: 0, y: -36, scale: 0.9 }}
                          transition={{ duration: 0.65, ease: 'easeOut' }}
                          className="absolute top-0 left-1/2 -translate-x-1/2 text-[11px] font-black text-brand-600 bg-white border border-brand-200 px-2 py-0.5 rounded-full shadow-sm pointer-events-none whitespace-nowrap z-10"
                        >
                          +{xpDelta.toLocaleString()} XP
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-brand-50">
                      <Zap size={15} className="text-brand-600" />
                    </div>
                    <div>
                      <p className="font-black text-lg leading-none" style={{ color: '#1A1033' }}><AnimatedXP value={userData.totalXP} /></p>
                      <p className="text-gray-400 text-[10px] uppercase tracking-wide mt-0.5">XP Earned</p>
                    </div>
                  </div>
                  {/* Streak card */}
                  <div className="flex items-center gap-2.5 bg-white/85 backdrop-blur-sm border border-white rounded-2xl px-4 py-3 min-w-[110px] shadow-sm">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-orange-50">
                      <Flame size={15} className="text-orange-500" />
                    </div>
                    <div>
                      <p className="font-black text-lg leading-none" style={{ color: '#1A1033' }}>{userData.streak > 0 ? `${userData.streak}w` : '—'}</p>
                      <p className="text-gray-400 text-[10px] uppercase tracking-wide mt-0.5">{userData.streak > 0 ? 'Week streak' : 'Start a streak'}</p>
                    </div>
                  </div>
                  {/* Badges card */}
                  <div className="flex items-center gap-2.5 bg-white/85 backdrop-blur-sm border border-white rounded-2xl px-4 py-3 min-w-[110px] shadow-sm">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-50">
                      <Star size={15} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="font-black text-lg leading-none" style={{ color: '#1A1033' }}>{userData.userBadges.length}</p>
                      <p className="text-gray-400 text-[10px] uppercase tracking-wide mt-0.5">Badges earned</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* XP Progress bar */}
              <div className="mt-6 pt-5" style={{ borderTop: '1px solid #E4DEFF' }}>
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
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${xpPct}%`, background: `linear-gradient(90deg, #5B38F5, ${lc.ring})` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Level-up banner ─────────────────────────────── */}
          <AnimatePresence>
            {leveledUp && (
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="mb-5 flex items-center gap-4 px-5 py-4 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #5B38F5 0%, #7C3AED 100%)', boxShadow: '0 4px 24px rgba(91,56,245,0.3)' }}
              >
                <motion.span
                  animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.25, 1] }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="text-3xl"
                >🎖️</motion.span>
                <div className="flex-1">
                  <p className="text-white font-black text-sm leading-snug">Level up — you&apos;re now {leveledUp}!</p>
                  <p className="text-white/70 text-xs mt-0.5">Keep going. Every week brings you closer to the top.</p>
                </div>
                <button onClick={() => setLeveledUp(null)} className="text-white/50 hover:text-white/90 transition-colors">
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── What's new nudge panel ───────────────────────── */}
          <AnimatePresence>
            {nudges.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                className="overflow-hidden"
              >
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ border: '1px solid #E4DEFF', boxShadow: '0 0 0 1px rgba(91,56,245,0.04), 0 4px 20px rgba(91,56,245,0.07)' }}
                >
                  <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(90deg, #F0ECFF 0%, #F8F6FF 100%)', borderBottom: '1px solid #E4DEFF' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">✨</span>
                      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#5B38F5' }}>
                        What&apos;s new since your last session
                      </span>
                    </div>
                    <button
                      onClick={() => setNudges([])}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-white/60"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className="bg-white px-5 py-4 grid sm:grid-cols-2 gap-x-6 gap-y-3">
                    {nudges.map((n, i) => {
                      const colors = nudgeBg(n.type)
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.08 + i * 0.07, type: 'spring', stiffness: 260, damping: 22 }}
                          className="flex items-center gap-3"
                        >
                          <div
                            className="w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center text-lg"
                            style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                          >
                            {n.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-snug" style={{ color: '#1A1033' }}>{n.title}</p>
                            {n.subtitle && <p className="text-xs text-gray-400 mt-0.5">{n.subtitle}</p>}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col lg:flex-row gap-8">

            {/* ── Missions grid ─────────────────────────────────── */}
            <div className="flex-1">
              <div className="mb-5">
                <h2 className="text-xl font-black" style={{ color: '#1A1033' }}>Your Missions</h2>
                <p className="text-sm text-gray-400 mt-0.5">8-week startup operator program. One mission at a time.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {weeks.map((week) => {
                  const progress = week.weekProgress[0] ?? null
                  const isLocked = !progress?.isUnlocked
                  const isNew = newlyUnlockedWeekIds.has(week.id)
                  return (
                    <motion.div
                      key={week.id}
                      className="rounded-2xl"
                      animate={isNew ? {
                        boxShadow: [
                          '0 0 0 0px rgba(91,56,245,0)',
                          '0 0 0 3px rgba(91,56,245,0.35), 0 0 20px rgba(91,56,245,0.15)',
                          '0 0 0 2px rgba(91,56,245,0.2)',
                          '0 0 0 3px rgba(91,56,245,0.3), 0 0 16px rgba(91,56,245,0.12)',
                          '0 0 0 0px rgba(91,56,245,0)',
                        ],
                      } : {}}
                      transition={isNew ? { duration: 2.4, ease: 'easeInOut' } : {}}
                    >
                      <WeekCard
                        week={week}
                        userProgress={progress}
                        isLocked={isLocked}
                        onLockClick={() => setLockModal(true)}
                      />
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* ── Sidebar ───────────────────────────────────────── */}
            <div className="lg:w-72 space-y-5">
              {/* Top operators */}
              <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid #E4DEFF' }}>
                <h3 className="font-bold mb-4 flex items-center gap-2 text-sm" style={{ color: '#1A1033' }}>
                  <Trophy size={16} className="text-yellow-500" /> Top Operators
                </h3>
                <div className="space-y-2.5">
                  {leaderboard.map((entry, i) => (
                    <div
                      key={entry.id}
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
                    </div>
                  ))}
                </div>
              </div>

              {/* Badges */}
              {userData.userBadges.length > 0 && (() => {
                // Split into one-time (overall) and recurring (weekly)
                const overallBadges = userData.userBadges.filter(ub => ub.badge.conditionType !== 'weekly_performance')
                // Group recurring by badge name with count
                const weeklyMap = new Map<string, { badge: UserData['userBadges'][0]['badge']; count: number; earnedAt: string }>()
                for (const ub of userData.userBadges.filter(ub => ub.badge.conditionType === 'weekly_performance')) {
                  const key = ub.badge.name
                  const existing = weeklyMap.get(key)
                  if (existing) {
                    existing.count++
                    if (ub.earnedAt > existing.earnedAt) existing.earnedAt = ub.earnedAt
                  } else {
                    weeklyMap.set(key, { badge: ub.badge, count: 1, earnedAt: ub.earnedAt })
                  }
                }
                const weeklyBadges = Array.from(weeklyMap.values())
                return (
                  <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid #E4DEFF' }}>
                    {overallBadges.length > 0 && (
                      <>
                        <h3 className="font-bold mb-3 text-sm" style={{ color: '#1A1033' }}>Overall badges</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {overallBadges.map((ub, i) => (
                            <AnimatePresence key={i}>
                              <motion.div
                                key={`ob-${i}-${newBadgeKey}`}
                                initial={i === 0 && newBadgeKey > 0 ? { scale: 0, rotate: -20 } : false}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 480, damping: 18, delay: i * 0.04 }}
                                title={ub.badge.name}
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl cursor-default shadow-sm hover:scale-110 transition-transform"
                                style={{ background: '#F0ECFF', border: '1px solid #E4DEFF' }}
                              >
                                {ub.badge.iconEmoji}
                              </motion.div>
                            </AnimatePresence>
                          ))}
                        </div>
                      </>
                    )}
                    {weeklyBadges.length > 0 && (
                      <>
                        <h3 className="font-bold mb-3 text-sm" style={{ color: '#1A1033' }}>Weekly badges</h3>
                        <div className="flex flex-wrap gap-2">
                          {weeklyBadges.map((wb, i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                              <div
                                title={`${wb.badge.name} ×${wb.count}`}
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl cursor-default shadow-sm hover:scale-110 transition-transform"
                                style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}
                              >
                                {wb.badge.iconEmoji}
                              </div>
                              {wb.count > 1 && (
                                <span className="text-[9px] font-black tracking-wide" style={{ color: '#f97316' }}>×{wb.count}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              })()}

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
            </div>
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
                You haven&apos;t unlocked this yet. Keep going, you&apos;re on the right path.
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
