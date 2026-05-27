import { prisma } from './db'

export type BadgeResult = { id: string; name: string; description: string; iconEmoji: string }

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

// ─── XP award with milestone badge check ─────────────────────────────────────

export async function awardXP(
  userId: string,
  amount: number,
  reason: string,
  referenceType?: string,
  referenceId?: string
) {
  const prevTotal = await getUserTotalXP(userId)
  await prisma.xPTransaction.create({
    data: { userId, amount, reason, referenceType, referenceId },
  })
  const newTotal = prevTotal + amount
  await checkXPMilestoneBadges(userId, prevTotal, newTotal)
}

async function checkXPMilestoneBadges(userId: string, prevTotal: number, newTotal: number) {
  const thresholds = [1000, 5000, 10000]
  for (const threshold of thresholds) {
    if (prevTotal < threshold && newTotal >= threshold) {
      await awardOneTimeBadge(userId, 'xp_milestone', String(threshold))
    }
  }
}

// ─── Quiz XP ─────────────────────────────────────────────────────────────────

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

// ─── Project XP ──────────────────────────────────────────────────────────────

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

// ─── Week complete XP + badge ─────────────────────────────────────────────────

export async function awardWeekCompleteXP(userId: string, weekId: string) {
  await awardXP(userId, 150, 'week_complete', 'week', weekId)
}

// ─── Streak ───────────────────────────────────────────────────────────────────

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
    await awardOneTimeBadge(userId, 'special', 'streak_lord')
  }
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

// Awards a one-time badge (weekNumber = null). Safe to call repeatedly — upsert is idempotent.
export async function awardOneTimeBadge(
  userId: string,
  conditionType: string,
  conditionValue: string
): Promise<BadgeResult | null> {
  const badge = await prisma.badge.findFirst({ where: { conditionType, conditionValue } })
  if (!badge) return null
  // weekNumber is null for one-time badges — Prisma doesn't support null in compound unique lookups, use findFirst
  const existing = await prisma.userBadge.findFirst({
    where: { userId, badgeId: badge.id, weekNumber: null },
  })
  if (existing) return null
  await prisma.userBadge.create({ data: { userId, badgeId: badge.id } })
  return { id: badge.id, name: badge.name, description: badge.description, iconEmoji: badge.iconEmoji }
}

// Awards a recurring weekly badge (weekNumber = the week number). Idempotent per week.
export async function awardWeeklyBadge(
  userId: string,
  conditionValue: string,
  weekNumber: number
): Promise<BadgeResult | null> {
  const badge = await prisma.badge.findFirst({ where: { conditionType: 'weekly_performance', conditionValue } })
  if (!badge) return null
  const existing = await prisma.userBadge.findUnique({
    where: { userId_badgeId_weekNumber: { userId, badgeId: badge.id, weekNumber } },
  })
  if (existing) return null
  await prisma.userBadge.create({ data: { userId, badgeId: badge.id, weekNumber } })
  return { id: badge.id, name: badge.name, description: badge.description, iconEmoji: badge.iconEmoji }
}

// ─── Week-completion check ────────────────────────────────────────────────────

export async function checkWeekComplete(
  userId: string,
  weekId: string
): Promise<BadgeResult | null> {
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    include: {
      topics: {
        include: {
          subtopics: {
            include: {
              quiz: { select: { id: true } },
              userProgress: { where: { userId }, select: { quizPassed: true } },
            },
          },
          reflections: { where: { userId }, select: { aiScore: true } },
        },
      },
    },
  })
  if (!week) return null

  for (const topic of week.topics) {
    // Check all quiz subtopics are passed
    for (const subtopic of topic.subtopics) {
      if (!subtopic.quiz) continue
      const passed = subtopic.userProgress[0]?.quizPassed ?? false
      if (!passed) return null
    }
    // Check reflection evaluated if topic has one
    const hasReflection = topic.subtopics.some(s => !s.quiz) // heuristic; adjust if you add a reflectionRequired field
    if (hasReflection) {
      const reflection = topic.reflections[0]
      if (!reflection || reflection.aiScore == null) return null
    }
  }

  // All checks passed — award badge + XP
  const newBadge = await awardOneTimeBadge(userId, 'week_complete', String(week.number))
  // Only award week-complete XP once (badge award returns null if already earned)
  if (newBadge) {
    await awardWeekCompleteXP(userId, weekId)
  }
  return newBadge
}

// ─── Quiz Master check ────────────────────────────────────────────────────────

export async function checkQuizMaster(
  userId: string
): Promise<BadgeResult | null> {
  // Best score per quiz across all attempts
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId, passed: true },
    select: { quizId: true, scorePct: true },
  })
  const bestByQuiz = new Map<string, number>()
  for (const a of attempts) {
    const prev = bestByQuiz.get(a.quizId) ?? 0
    if (a.scorePct > prev) bestByQuiz.set(a.quizId, a.scorePct)
  }
  const qualifying = Array.from(bestByQuiz.values()).filter(pct => pct >= 95)
  if (qualifying.length >= 5) {
    return awardOneTimeBadge(userId, 'special', 'quiz_master')
  }
  return null
}

// ─── Perfectionist weekly badge ───────────────────────────────────────────────

export async function checkPerfectionist(
  userId: string,
  weekId: string,
  weekNumber: number
): Promise<BadgeResult | null> {
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    include: {
      topics: {
        include: {
          subtopics: {
            include: { quiz: { select: { id: true } } },
          },
        },
      },
    },
  })
  if (!week) return null

  const quizIds = week.topics
    .flatMap(t => t.subtopics)
    .map(s => s.quiz?.id)
    .filter((id): id is string => !!id)

  if (quizIds.length === 0) return null

  // For each quiz, check that attempt 1 scored >= 90% and passed
  for (const quizId of quizIds) {
    const firstAttempt = await prisma.quizAttempt.findFirst({
      where: { userId, quizId, attemptNumber: 1 },
      select: { scorePct: true, passed: true },
    })
    if (!firstAttempt || !firstAttempt.passed || firstAttempt.scorePct < 90) return null
  }

  return awardWeeklyBadge(userId, 'perfectionist', weekNumber)
}

// ─── Ship It weekly badge ─────────────────────────────────────────────────────

export async function checkShipIt(
  userId: string,
  weekId: string,
  weekNumber: number
): Promise<BadgeResult | null> {
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    include: {
      topics: {
        include: {
          subtopics: {
            include: {
              project: { select: { id: true } },
              userProgress: { where: { userId }, select: { projectGraded: true } },
            },
          },
        },
      },
    },
  })
  if (!week) return null

  const projectSubtopics = week.topics
    .flatMap(t => t.subtopics)
    .filter(s => s.project)

  if (projectSubtopics.length === 0) return null

  const allGraded = projectSubtopics.every(s => s.userProgress[0]?.projectGraded === true)
  if (!allGraded) return null

  return awardWeeklyBadge(userId, 'ship_it', weekNumber)
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard() {
  const users = await prisma.user.findMany({
    where: { role: 'learner', isTestUser: false },
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

// Legacy alias kept for any callers that haven't been updated yet
export async function checkAndAwardBadge(
  userId: string,
  conditionType: string,
  conditionValue: string
) {
  await awardOneTimeBadge(userId, conditionType, conditionValue)
}

export async function checkWeekCompleteBadge(userId: string, weekNumber: number) {
  await awardOneTimeBadge(userId, 'week_complete', String(weekNumber))
}
