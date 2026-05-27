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
        orderBy: [{ startedAt: 'asc' }, { attemptNumber: 'asc' }],
        include: {
          quiz: {
            include: {
              subtopic: { include: { topic: { include: { week: true } } } },
            },
          },
          answers: {
            include: {
              question: { include: { options: { orderBy: { sortOrder: 'asc' } } } },
              selectedOption: true,
            },
          },
        },
      },
      projectSubmissions: {
        include: {
          project: { include: { criteria: { orderBy: { sortOrder: 'asc' } } } },
          grade: { include: { criterionScores: { include: { criterion: true } } } },
        },
      },
      userBadges: { include: { badge: true } },
      topicReflections: {
        include: { topic: { select: { title: true, sortOrder: true } } },
        orderBy: { submittedAt: 'asc' },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const totalXP = await getUserTotalXP(params.userId)
  const streak = await getCurrentStreak(params.userId)
  const level = getLevelFromXP(totalXP)
  const { password: _pw, ...userWithoutPassword } = user

  const retryGrants = await prisma.adminOverrideLog.findMany({
    where: { targetUserId: params.userId, actionType: 'quiz_retry_grant', referenceType: 'quiz' },
    select: { referenceId: true },
  })
  const retryGrantedQuizIds = retryGrants.map(g => g.referenceId).filter(Boolean) as string[]

  return NextResponse.json({ ...userWithoutPassword, totalXP, streak, level, retryGrantedQuizIds })
}
