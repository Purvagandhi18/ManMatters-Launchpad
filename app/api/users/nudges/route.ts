import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const { searchParams } = new URL(req.url)
  const sinceStr = searchParams.get('since')
  if (!sinceStr) return NextResponse.json({ nudges: [] })
  const since = new Date(sinceStr)
  if (isNaN(since.getTime())) return NextResponse.json({ nudges: [] })

  const [grades, xpAgg, newBadges, reflections] = await Promise.all([
    prisma.projectGrade.findMany({
      where: { gradedAt: { gte: since }, submission: { userId } },
      include: { submission: { include: { project: { select: { title: true } } } } },
      orderBy: { gradedAt: 'asc' },
    }),
    prisma.xPTransaction.aggregate({
      where: { userId, createdAt: { gte: since } },
      _sum: { amount: true },
    }),
    prisma.userBadge.findMany({
      where: { userId, earnedAt: { gte: since } },
      include: { badge: { select: { name: true, iconEmoji: true } } },
      orderBy: { earnedAt: 'asc' },
    }),
    prisma.topicReflection.findMany({
      where: {
        userId,
        aiScore: { not: null },
        OR: [{ submittedAt: { gte: since } }, { revisedAt: { gte: since } }],
      },
      include: { topic: { select: { title: true } } },
      orderBy: { submittedAt: 'asc' },
    }),
  ])

  const nudges: { type: string; icon: string; title: string; subtitle?: string; value?: number }[] = []

  for (const g of grades) {
    nudges.push({
      type: 'project_graded',
      icon: '✅',
      title: `Your project "${g.submission.project.title}" has been graded`,
      subtitle: `${g.totalScore}/${g.maxTotalScore} · ${Math.round(g.scorePct)}%`,
      value: g.scorePct,
    })
  }

  const xpGained = xpAgg._sum.amount ?? 0
  if (xpGained > 0) {
    nudges.push({ type: 'xp_gained', icon: '⚡', title: `+${xpGained.toLocaleString()} XP added`, value: xpGained })
  }

  for (const ub of newBadges) {
    nudges.push({ type: 'badge_earned', icon: ub.badge.iconEmoji, title: `New badge unlocked: ${ub.badge.name}` })
  }

  for (const r of reflections) {
    nudges.push({
      type: 'reflection_scored',
      icon: '📝',
      title: `Your reflection for "${r.topic.title}" was scored`,
      subtitle: r.aiScore != null ? `${r.aiScore.toFixed(1)} / 10` : undefined,
      value: r.aiScore ?? undefined,
    })
  }

  return NextResponse.json({ nudges })
}
