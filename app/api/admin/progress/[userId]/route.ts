import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserTotalXP, getLevelFromXP, getCurrentStreak } from '@/lib/gamification'

export async function GET(_: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    include: {
      weekProgress: { include: { week: true } },
      subtopicProgress: {
        include: {
          subtopic: { include: { topic: { include: { week: true } } } },
        },
      },
      quizAttempts: {
        orderBy: { startedAt: 'desc' },
        include: {
          quiz: { include: { subtopic: true } },
          answers: { include: { question: true, selectedOption: true } },
        },
      },
      projectSubmissions: {
        include: {
          project: true,
          grade: { include: { criterionScores: { include: { criterion: true } } } },
        },
      },
      userBadges: { include: { badge: true } },
    },
  })

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const totalXP = await getUserTotalXP(params.userId)
  const streak = await getCurrentStreak(params.userId)
  const level = getLevelFromXP(totalXP)
  const { password: _pw, ...userWithoutPassword } = user

  return NextResponse.json({ ...userWithoutPassword, totalXP, streak, level })
}
