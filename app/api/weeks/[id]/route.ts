import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  logActivity(userId, 'page_visit', { deduplicate: true }).catch(() => {})

  const week = await prisma.week.findUnique({
    where: { id: params.id },
    include: {
      weekProgress: { where: { userId } },
      topics: {
        orderBy: { sortOrder: 'asc' },
        include: {
          references: { orderBy: { sortOrder: 'asc' } },
          subtopics: {
            orderBy: { sortOrder: 'asc' },
            include: {
              quiz: {
                select: {
                  id: true, status: true, passThreshold: true,
                  attempts: {
                    where: { userId },
                    orderBy: { attemptNumber: 'desc' },
                    take: 2,
                    select: { attemptNumber: true, scorePct: true, passed: true, completedAt: true, rawScore: true, maxScore: true },
                  },
                },
              },
              project: { select: { id: true, title: true, isPublished: true } },
              userProgress: { where: { userId } },
            },
          },
        },
      },
    },
  })

  if (!week) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allSubtopics = week.topics.flatMap(t => t.subtopics)
  const quizIds = allSubtopics.map(s => (s as any).quiz?.id).filter(Boolean) as string[]

  const retryGrants = quizIds.length > 0
    ? await prisma.adminOverrideLog.findMany({
        where: { targetUserId: userId, actionType: 'quiz_retry_grant', referenceType: 'quiz', referenceId: { in: quizIds } },
        select: { referenceId: true },
      })
    : []
  const retryGrantedQuizIds = retryGrants.map(g => g.referenceId).filter(Boolean) as string[]

  // ── Weekly badge progress ─────────────────────────────────────────────────
  // Use quizIds (already computed above) as source of truth for quiz count.
  // Query attempts and graded-project progress directly to avoid nested-select edge cases.
  const projectSubtopicIds = allSubtopics
    .filter(s => (s as any).project)
    .map(s => s.id)

  const weekNumber = week.number
  const [firstAttempts, gradedCount, perfBadge, shipBadge] = await Promise.all([
    // First attempts for all quizzes in this week
    quizIds.length > 0
      ? prisma.quizAttempt.findMany({
          where: { userId, quizId: { in: quizIds }, attemptNumber: 1 },
          select: { quizId: true, scorePct: true, passed: true },
        })
      : [],
    // Count of graded projects in this week for this user
    projectSubtopicIds.length > 0
      ? prisma.userSubtopicProgress.count({
          where: { userId, subtopicId: { in: projectSubtopicIds }, projectGraded: true },
        })
      : 0,
    prisma.userBadge.findFirst({ where: { userId, weekNumber, badge: { conditionValue: 'perfectionist' } } }),
    prisma.userBadge.findFirst({ where: { userId, weekNumber, badge: { conditionValue: 'ship_it' } } }),
  ])

  const perfTotal     = quizIds.length
  const perfQualified = (firstAttempts as { quizId: string; scorePct: number; passed: boolean }[])
    .filter(a => a.passed && a.scorePct >= 90).length
  const shipTotal  = projectSubtopicIds.length
  const shipGraded = gradedCount as number

  const weeklyBadgeProgress = {
    perfectionist: { total: perfTotal, qualified: perfQualified, unlocked: !!perfBadge },
    shipIt:        { total: shipTotal, graded: shipGraded,       unlocked: !!shipBadge },
  }

  return NextResponse.json({ ...week, retryGrantedQuizIds, weeklyBadgeProgress })
}
