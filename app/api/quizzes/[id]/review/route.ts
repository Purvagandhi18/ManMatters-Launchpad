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

  const grouped = new Map<string, typeof attempt.answers>()
  for (const a of attempt.answers) {
    const arr = grouped.get(a.questionId) ?? []
    arr.push(a)
    grouped.set(a.questionId, arr)
  }

  const questions = [...grouped.values()]
    .sort((a, b) => (a[0].question.sortOrder ?? 0) - (b[0].question.sortOrder ?? 0))
    .map(group => {
      const first = group[0]
      const q = first.question
      if (q.type === 'multi_select') {
        return {
          id: first.questionId,
          text: q.text,
          type: q.type,
          options: q.options.map(o => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
          selectedOptionIds: group.map(a => a.selectedOptionId).filter(Boolean),
          correctOptionIds: q.options.filter(o => o.isCorrect).map(o => o.id),
          isCorrect: first.isCorrect,
        }
      }
      return {
        id: first.questionId,
        text: q.text,
        type: q.type,
        options: q.options.map(o => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
        selectedOptionId: first.selectedOptionId,
        correctOptionId: q.options.find(o => o.isCorrect)?.id ?? null,
        isCorrect: first.isCorrect,
      }
    })

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
