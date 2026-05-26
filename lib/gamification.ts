import { prisma } from './db'

export const LEVELS = [
  { level: 1, name: 'Rookie',          minXP: 0,     maxXP: 999   },
  { level: 2, name: 'Builder',         minXP: 1000,  maxXP: 2999  },
  { level: 3, name: 'Operator',        minXP: 3000,  maxXP: 5999  },
  { level: 4, name: 'Growth Hacker',   minXP: 6000,  maxXP: 9999  },
  { level: 5, name: 'Product Ninja',   minXP: 10000, maxXP: 14999 },
  { level: 6, name: 'Founding Team',   minXP: 15000, maxXP: 19999 },
  { level: 7, name: 'Chief Architect', minXP: 20000, maxXP: Infinity },
]

export function getLevelFromXP(xp: number) {
  return LEVELS.findLast(l => xp >= l.minXP) ?? LEVELS[0]
}

// Aspirational identity titles that evolve with level progression
export const LEARNER_TITLES: Record<number, string> = {
  1: 'Curious',
  2: 'Explorer',
  3: 'Builder',
  4: 'Operator',
  5: 'Catalyst',
  6: 'Pioneer',
  7: 'Visionary',
}

export function getLearnerTitle(levelNum: number, streak = 0): string {
  const base = LEARNER_TITLES[levelNum] ?? 'Explorer'
  if (streak >= 4) return `Relentless ${base}`
  if (streak >= 2) return `Focused ${base}`
  return base
}

export async function getUserTotalXP(userId: string): Promise<number> {
  const result = await prisma.xPTransaction.aggregate({
    where: { userId },
    _sum: { amount: true },
  })
  return result._sum.amount ?? 0
}

export async function awardXP(
  userId: string,
  amount: number,
  reason: string,
  referenceType?: string,
  referenceId?: string
) {
  await prisma.xPTransaction.create({
    data: { userId, amount, reason, referenceType, referenceId },
  })
}

export async function awardQuizXP(
  userId: string,
  attemptId: string,
  scorePct: number,
  isRetry: boolean
) {
  if (isRetry) {
    await awardXP(userId, 70, 'quiz_retry_pass', 'quiz_attempt', attemptId)
    return
  }
  await awardXP(userId, 100, 'quiz_pass_base', 'quiz_attempt', attemptId)
  if (scorePct >= 95) {
    await awardXP(userId, 50, 'quiz_pass_high_score', 'quiz_attempt', attemptId)
  } else if (scorePct >= 90) {
    await awardXP(userId, 20, 'quiz_pass_high_score', 'quiz_attempt', attemptId)
  }
}

export async function awardProjectXP(
  userId: string,
  gradeId: string,
  scorePct: number
) {
  await awardXP(userId, 200, 'project_complete', 'project_grade', gradeId)
  if (scorePct >= 90) {
    await awardXP(userId, 50, 'project_high_score', 'project_grade', gradeId)
  }
}

export async function awardWeekCompleteXP(userId: string, weekId: string) {
  await awardXP(userId, 150, 'week_complete', 'week', weekId)
}

export async function getCurrentStreak(userId: string): Promise<number> {
  const records = await prisma.streakRecord.findMany({
    where: { userId, hasActivity: true },
    orderBy: { weekStartDate: 'desc' },
  })
  if (records.length === 0) return 0
  return records[0].streakCount
}

export async function markStreakActivity(userId: string) {
  const now = new Date()
  const day = now.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + diff)
  weekStart.setHours(0, 0, 0, 0)

  const existing = await prisma.streakRecord.findUnique({
    where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
  })
  if (existing?.hasActivity) return

  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)
  const prevRecord = await prisma.streakRecord.findUnique({
    where: { userId_weekStartDate: { userId, weekStartDate: prevWeekStart } },
  })
  const prevStreak = prevRecord?.hasActivity ? (prevRecord.streakCount ?? 0) : 0
  const newStreak = prevStreak + 1

  await prisma.streakRecord.upsert({
    where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
    create: { userId, weekStartDate: weekStart, hasActivity: true, streakCount: newStreak },
    update: { hasActivity: true, streakCount: newStreak },
  })

  await awardXP(userId, 50, 'streak_bonus', 'streak', weekStart.toISOString())

  if (newStreak >= 4) {
    await checkAndAwardBadge(userId, 'special', 'streak_lord')
  }
}

export async function checkAndAwardBadge(
  userId: string,
  conditionType: string,
  conditionValue: string
) {
  const badge = await prisma.badge.findFirst({
    where: { conditionType, conditionValue },
  })
  if (!badge) return
  await prisma.userBadge.upsert({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
    create: { userId, badgeId: badge.id },
    update: {},
  })
}

export async function checkWeekCompleteBadge(userId: string, weekNumber: number) {
  await checkAndAwardBadge(userId, 'week_complete', String(weekNumber))
}

export async function getLeaderboard() {
  const users = await prisma.user.findMany({
    where: { role: 'learner' },
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      lastActiveAt: true,
      xpTransactions: { select: { amount: true } },
      userBadges: { select: { id: true } },
      streakRecords: {
        where: { hasActivity: true },
        orderBy: { weekStartDate: 'desc' },
        take: 1,
        select: { streakCount: true },
      },
    },
  })

  const withXP = users.map(u => {
    const totalXP = u.xpTransactions.reduce((s, t) => s + t.amount, 0)
    const level = getLevelFromXP(totalXP)
    const streak = u.streakRecords[0]?.streakCount ?? 0
    return {
      id: u.id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      totalXP,
      level,
      streak,
      badgeCount: u.userBadges.length,
      lastActiveAt: u.lastActiveAt,
    }
  })

  return withXP.sort((a, b) => {
    if (b.totalXP !== a.totalXP) return b.totalXP - a.totalXP
    return new Date(a.lastActiveAt).getTime() - new Date(b.lastActiveAt).getTime()
  })
}
