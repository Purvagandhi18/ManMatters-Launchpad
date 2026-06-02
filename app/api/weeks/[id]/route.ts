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
      // Week-level project
      weekProject: { select: { id: true, title: true, isPublished: true } },
      topics: {
        orderBy: { sortOrder: 'asc' },
        where: { tag: { not: 'capstone' } }, // exclude legacy capstone container topics from learner view
        include: {
          references: { orderBy: { sortOrder: 'asc' } },
          // Topic-level projects (multiple allowed)
          projects: {
            where: { isPublished: true },
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              title: true,
              isPublished: true,
              submissions: {
                where: { userId },
                orderBy: { submittedAt: 'desc' },
                take: 1,
                select: { id: true, grade: { select: { scorePct: true } } },
              },
            },
          },
          subtopics: {
            orderBy: { sortOrder: 'asc' },
            where: { tag: { not: 'capstone' } }, // exclude legacy capstone subtopics
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

  // Week-level project submission status
  const weekProgressRecord = week.weekProgress[0]
  const weekProjectProgress = {
    submitted: weekProgressRecord?.weekProjectSubmitted ?? false,
    graded: weekProgressRecord?.weekProjectGraded ?? false,
  }

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
  const projectSubtopicIds = allSubtopics
    .filter(s => (s as any).project)
    .map(s => s.id)

  const weekNumber = week.number
  const [firstAttempts, gradedSubtopicCount, gradedTopicCount, perfBadge, shipBadge] = await Promise.all([
    quizIds.length > 0
      ? prisma.quizAttempt.findMany({
          where: { userId, quizId: { in: quizIds }, attemptNumber: 1 },
          select: { quizId: true, scorePct: true, passed: true },
        })
      : [],
    projectSubtopicIds.length > 0
      ? prisma.userSubtopicProgress.count({
          where: { userId, subtopicId: { in: projectSubtopicIds }, projectGraded: true },
        })
      : 0,
    // Count graded topic-level projects in this week
    prisma.userTopicProgress.count({
      where: { userId, topic: { weekId: week.id }, projectGraded: true },
    }),
    prisma.userBadge.findFirst({ where: { userId, weekNumber, badge: { conditionValue: 'perfectionist' } } }),
    prisma.userBadge.findFirst({ where: { userId, weekNumber, badge: { conditionValue: 'ship_it' } } }),
  ])

  const perfTotal     = quizIds.length
  const perfQualified = (firstAttempts as { quizId: string; scorePct: number; passed: boolean }[])
    .filter(a => a.passed && a.scorePct >= 90).length

  // Ship It counts all project types
  const shipTotal  = projectSubtopicIds.length + week.topics.filter(t => (t as any).project).length
  const shipGraded = (gradedSubtopicCount as number) + (gradedTopicCount as number)

  const weeklyBadgeProgress = {
    perfectionist: { total: perfTotal, qualified: perfQualified, unlocked: !!perfBadge },
    shipIt:        { total: shipTotal, graded: shipGraded,       unlocked: !!shipBadge },
  }

  return NextResponse.json({ ...week, retryGrantedQuizIds, weeklyBadgeProgress, weekProjectProgress })
}
