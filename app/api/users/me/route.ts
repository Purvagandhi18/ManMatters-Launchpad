import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserTotalXP, getLevelFromXP, getCurrentStreak } from '@/lib/gamification'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const [user, totalXP, streak] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        userBadges: { include: { badge: true }, orderBy: { earnedAt: 'desc' } },
        streakRecords: { orderBy: { weekStartDate: 'desc' }, take: 12 },
      },
    }),
    getUserTotalXP(userId),
    getCurrentStreak(userId),
  ])

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const level = getLevelFromXP(totalXP)
  const { password: _pw, ...userWithoutPassword } = user
  return NextResponse.json({ ...userWithoutPassword, totalXP, level, streak })
}
