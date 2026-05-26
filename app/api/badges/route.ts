import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const [badges, userBadges] = await Promise.all([
    prisma.badge.findMany(),
    prisma.userBadge.findMany({ where: { userId }, include: { badge: true } }),
  ])

  const earnedIds = new Set(userBadges.map(ub => ub.badgeId))
  return NextResponse.json(
    badges.map(b => ({
      ...b,
      earned: earnedIds.has(b.id),
      earnedAt: userBadges.find(ub => ub.badgeId === b.id)?.earnedAt ?? null,
    }))
  )
}
