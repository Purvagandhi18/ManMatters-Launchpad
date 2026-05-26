import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { awardProjectXP } from '@/lib/gamification'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { submissionId, criterionScores, feedbackText } = await req.json()

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { criteria: true },
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

  const submission = await prisma.projectSubmission.findUnique({
    where: { id: submissionId },
  })
  if (submission) {
    await awardProjectXP(submission.userId, grade.id, scorePct)

    await prisma.userSubtopicProgress.upsert({
      where: { userId_subtopicId: { userId: submission.userId, subtopicId: project.subtopicId } },
      create: {
        userId: submission.userId,
        subtopicId: project.subtopicId,
        projectRequired: true,
        projectSubmitted: true,
        projectGraded: true,
        completedAt: new Date(),
      },
      update: { projectGraded: true, completedAt: new Date() },
    })
  }

  return NextResponse.json(grade)
}
