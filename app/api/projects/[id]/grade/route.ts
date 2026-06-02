import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { awardProjectXP, checkShipIt, BadgeResult } from '@/lib/gamification'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { submissionId, criterionScores, feedbackText } = await req.json()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      criteria: true,
      // Include all possible scope relations to resolve week number for badges
      subtopic: { include: { topic: { include: { week: { select: { id: true, number: true } } } } } },
      topic: { include: { week: { select: { id: true, number: true } } } },
      week: { select: { id: true, number: true } },
    },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const maxTotalScore = project.criteria.reduce((s, c) => s + c.maxMarks, 0)
  const totalScore = (criterionScores as { criterionId: string; scoreAwarded: number }[]).reduce(
    (s, cs) => s + cs.scoreAwarded, 0
  )
  const scorePct = maxTotalScore > 0 ? (totalScore / maxTotalScore) * 100 : 0

  const grade = await prisma.projectGrade.create({
    data: {
      submissionId,
      totalScore,
      maxTotalScore,
      scorePct,
      feedbackText,
      criterionScores: {
        create: (criterionScores as { criterionId: string; scoreAwarded: number }[]).map(cs => ({
          criterionId: cs.criterionId,
          scoreAwarded: cs.scoreAwarded,
        })),
      },
    },
  })

  const submission = await prisma.projectSubmission.findUnique({ where: { id: submissionId } })
  const badgesEarned: BadgeResult[] = []

  if (submission) {
    const learnerId = submission.userId
    await awardProjectXP(learnerId, grade.id, scorePct)

    // Resolve week for badge checks
    let weekId: string | null = null
    let weekNumber: number | null = null

    if (project.topicId && project.topic) {
      // Topic-level project
      await prisma.userTopicProgress.upsert({
        where: { userId_topicId: { userId: learnerId, topicId: project.topicId } },
        create: {
          userId: learnerId,
          topicId: project.topicId,
          projectRequired: true,
          projectSubmitted: true,
          projectGraded: true,
          completedAt: new Date(),
        },
        update: { projectGraded: true, completedAt: new Date() },
      })
      weekId = project.topic.week.id
      weekNumber = project.topic.week.number

    } else if (project.weekId && project.week) {
      // Week-level project
      await prisma.userWeekProgress.upsert({
        where: { userId_weekId: { userId: learnerId, weekId: project.weekId } },
        create: {
          userId: learnerId,
          weekId: project.weekId,
          isUnlocked: true,
          weekProjectSubmitted: true,
          weekProjectGraded: true,
        },
        update: { weekProjectGraded: true },
      })
      weekId = project.week.id
      weekNumber = project.week.number

    } else if (project.subtopicId && project.subtopic) {
      // Legacy: subtopic-level project
      await prisma.userSubtopicProgress.upsert({
        where: { userId_subtopicId: { userId: learnerId, subtopicId: project.subtopicId } },
        create: {
          userId: learnerId,
          subtopicId: project.subtopicId,
          projectRequired: true,
          projectSubmitted: true,
          projectGraded: true,
          completedAt: new Date(),
        },
        update: { projectGraded: true, completedAt: new Date() },
      })
      weekId = project.subtopic.topic.week.id
      weekNumber = project.subtopic.topic.week.number
    }

    // Check Ship It badge
    if (weekId && weekNumber) {
      const shipBadge = await checkShipIt(learnerId, weekId, weekNumber)
      if (shipBadge) badgesEarned.push(shipBadge)
    }
  }

  return NextResponse.json({ ...grade, badgesEarned })
}
