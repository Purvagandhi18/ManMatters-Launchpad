import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserTotalXP, getLevelFromXP, getCurrentStreak } from '@/lib/gamification'
import { logActivity, ACTIVITY_LABELS, scoreToLevel } from '@/lib/activity'

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const body = await req.json() as { avatarUrl?: string; displayName?: string }

  const data: { avatarUrl?: string; displayName?: string } = {}
  if (typeof body.avatarUrl === 'string') data.avatarUrl = body.avatarUrl
  if (typeof body.displayName === 'string' && body.displayName.trim()) data.displayName = body.displayName.trim()

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  await prisma.user.update({ where: { id: userId }, data })
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  // Fire-and-forget: log dashboard visit (deduplicated per day)
  logActivity(userId, 'page_visit', { deduplicate: true }).catch(() => {})

  const eightyFourDaysAgo = new Date()
  eightyFourDaysAgo.setDate(eightyFourDaysAgo.getDate() - 83)
  eightyFourDaysAgo.setHours(0, 0, 0, 0)

  const [user, totalXP, streak, xpTransactions, activityEvents] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        userBadges: { include: { badge: true }, orderBy: { earnedAt: 'desc' } },
        streakRecords: { orderBy: { weekStartDate: 'desc' }, take: 12 },
      },
    }),
    getUserTotalXP(userId),
    getCurrentStreak(userId),
    prisma.xPTransaction.findMany({
      where: { userId, createdAt: { gte: eightyFourDaysAgo } },
      select: { amount: true, createdAt: true, reason: true },
    }),
    prisma.activityEvent.findMany({
      where: { userId, createdAt: { gte: eightyFourDaysAgo } },
      select: { type: true, score: true, createdAt: true },
    }),
  ])

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // XP by day (for tooltip "+X XP" display)
  const xpByDay: Record<string, number> = {}
  for (const tx of xpTransactions) {
    const key = new Date(tx.createdAt).toISOString().split('T')[0]
    xpByDay[key] = (xpByDay[key] ?? 0) + tx.amount
  }

  // Activity score + events by day (primary source for heatmap level)
  const scoreByDay: Record<string, number> = {}
  const eventsByDay: Record<string, string[]> = {}
  for (const ev of activityEvents) {
    const key = new Date(ev.createdAt).toISOString().split('T')[0]
    scoreByDay[key] = (scoreByDay[key] ?? 0) + ev.score
    if (!eventsByDay[key]) eventsByDay[key] = []
    const label = ACTIVITY_LABELS[ev.type] ?? ev.type
    if (!eventsByDay[key].includes(label)) eventsByDay[key].push(label)
  }

  // 84-day activity grid (oldest → newest)
  const dailyActivity = Array.from({ length: 84 }, (_, i) => {
    const d = new Date(eightyFourDaysAgo)
    d.setDate(eightyFourDaysAgo.getDate() + i)
    const date = d.toISOString().split('T')[0]
    const xp = xpByDay[date] ?? 0
    const score = scoreByDay[date] ?? 0
    const events = eventsByDay[date] ?? []
    const level = scoreToLevel(score)
    return { date, xp, score, events, level }
  })

  const level = getLevelFromXP(totalXP)
  const { password: _pw, ...userWithoutPassword } = user
  return NextResponse.json({ ...userWithoutPassword, totalXP, level, streak, dailyActivity })
}
