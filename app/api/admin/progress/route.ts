import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserTotalXP, getLevelFromXP, getCurrentStreak } from '@/lib/gamification'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const learners = await prisma.user.findMany({
    where: { role: 'learner' },
    include: {
      weekProgress: true,
      userBadges: true,
      quizAttempts: { select: { scorePct: true, passed: true } },
      projectSubmissions: { include: { grade: true } },
    },
  })

  const result = await Promise.all(
    learners.map(async l => {
      const totalXP = await getUserTotalXP(l.id)
      const streak = await getCurrentStreak(l.id)
      const level = getLevelFromXP(totalXP)
      const weeksCompleted = l.weekProgress.filter(w => w.isCompleted).length
      const passedAttempts = l.quizAttempts.filter(a => a.passed)
      const avgScore =
        passedAttempts.length > 0
          ? passedAttempts.reduce((s, a) => s + a.scorePct, 0) / passedAttempts.length
          : 0

      return {
        id: l.id,
        displayName: l.displayName,
        email: l.email,
        isTestUser: l.isTestUser,
        totalXP,
        level,
        streak,
        weeksCompleted,
        badgeCount: l.userBadges.length,
        avgQuizScore: Math.round(avgScore),
        projectsGraded: l.projectSubmissions.filter(s => s.grade).length,
      }
    })
  )

  return NextResponse.json(result)
}
