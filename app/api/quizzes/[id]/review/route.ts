import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const attempt = await prisma.quizAttempt.findFirst({
    where: { userId, quizId: params.id, completedAt: { not: null } },
    orderBy: { attemptNumber: 'desc' },
    include: {
      answers: {
        include: {
          question: {
            include: { options: { orderBy: { sortOrder: 'asc' } } },
          },
        },
      },
      quiz: {
        select: {
          passThreshold: true,
          subtopic: { select: { title: true } },
        },
      },
    },
  })

  if (!attempt) return NextResponse.json(null)

  const questions = attempt.answers
    .sort((a, b) => (a.question.sortOrder ?? 0) - (b.question.sortOrder ?? 0))
    .map(a => ({
      id: a.questionId,
      text: a.question.text,
      type: a.question.type,
      options: a.question.options.map(o => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
      selectedOptionId: a.selectedOptionId,
      correctOptionId: a.question.options.find(o => o.isCorrect)?.id ?? null,
      isCorrect: a.isCorrect,
    }))

  return NextResponse.json({
    attemptNumber: attempt.attemptNumber,
    scorePct: attempt.scorePct,
    rawScore: attempt.rawScore,
    maxScore: attempt.maxScore,
    passed: attempt.passed,
    completedAt: attempt.completedAt,
    passThreshold: attempt.quiz.passThreshold,
    subtopicTitle: attempt.quiz.subtopic.title,
    questions,
  })
}
