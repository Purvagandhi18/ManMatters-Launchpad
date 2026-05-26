import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserTotalXP, getLevelFromXP, getCurrentStreak } from '@/lib/gamification'

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

  const twelveWeeksAgo = new Date()
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)

  const [user, totalXP, streak, xpTransactions] = await Promise.all([
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
      where: { userId, createdAt: { gte: twelveWeeksAgo } },
      select: { amount: true, createdAt: true },
    }),
  ])

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Compute XP earned per week for activity level
  const xpByWeek: Record<string, number> = {}
  for (const tx of xpTransactions) {
    const d = new Date(tx.createdAt)
    const day = d.getDay()
    const diff = (day === 0 ? -6 : 1) - day
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() + diff)
    weekStart.setHours(0, 0, 0, 0)
    const key = weekStart.toISOString()
    xpByWeek[key] = (xpByWeek[key] ?? 0) + tx.amount
  }

  const streakRecordsWithLevel = user.streakRecords.map(r => {
    const xp = xpByWeek[new Date(r.weekStartDate).toISOString()] ?? 0
    const activityLevel = xp >= 150 ? 'high' : xp > 0 ? 'light' : r.hasActivity ? 'light' : 'none'
    return { ...r, activityLevel }
  })

  const level = getLevelFromXP(totalXP)
  const { password: _pw, ...userWithoutPassword } = user
  return NextResponse.json({
    ...userWithoutPassword,
    streakRecords: streakRecordsWithLevel,
    totalXP,
    level,
    streak,
  })
}
