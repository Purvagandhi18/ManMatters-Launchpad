import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { awardQuizXP, markStreakActivity, checkWeekComplete, checkQuizMaster, checkPerfectionist, BadgeResult } from '@/lib/gamification'
import { logActivity } from '@/lib/activity'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const body = await req.json()
  const { answers } = body as { answers: Record<string, string | string[]> }

  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    include: {
      questions: { include: { options: true } },
      subtopic: { include: { topic: { include: { week: true } } } },
    },
  })
  if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const prevAttempts = await prisma.quizAttempt.count({ where: { userId, quizId: params.id } })
  const isRetry = prevAttempts > 0

  if (prevAttempts >= 1) {
    const grant = await prisma.adminOverrideLog.findFirst({
      where: { targetUserId: userId, actionType: 'quiz_retry_grant', referenceType: 'quiz', referenceId: params.id },
    })
    if (!grant || prevAttempts >= 2) {
      return NextResponse.json({ error: 'attempt_limit_reached' }, { status: 403 })
    }
  }

  let rawScore = 0
  const maxScore = quiz.questions.reduce((s, q) => s + q.points, 0)
  const attemptAnswers: {
    questionId: string
    selectedOptionId: string | null
    textResponse: string | null
    isCorrect: boolean | null
  }[] = []

  for (const question of quiz.questions) {
    const ans = answers[question.id]
    if (question.type === 'short_answer') {
      attemptAnswers.push({ questionId: question.id, selectedOptionId: null, textResponse: (ans as string) ?? '', isCorrect: null })
    } else if (question.type === 'multi_select') {
      const selectedIds = Array.isArray(ans) ? ans : []
      const correctIds = new Set(question.options.filter(o => o.isCorrect).map(o => o.id))
      const selectedSet = new Set(selectedIds)
      const correct = correctIds.size === selectedSet.size && [...correctIds].every(id => selectedSet.has(id))
      if (correct) rawScore += question.points
      for (const optId of selectedIds) {
        attemptAnswers.push({ questionId: question.id, selectedOptionId: optId, textResponse: null, isCorrect: correct })
      }
      if (selectedIds.length === 0) {
        attemptAnswers.push({ questionId: question.id, selectedOptionId: null, textResponse: null, isCorrect: false })
      }
    } else {
      const selectedOpt = question.options.find(o => o.id === (ans as string))
      const correct = selectedOpt?.isCorrect ?? false
      if (correct) rawScore += question.points
      attemptAnswers.push({ questionId: question.id, selectedOptionId: (ans as string) ?? null, textResponse: null, isCorrect: correct })
    }
  }

  const scorePct = maxScore > 0 ? (rawScore / maxScore) * 100 : 0
  const passed = scorePct >= quiz.passThreshold

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId,
      quizId: params.id,
      attemptNumber: prevAttempts + 1,
      rawScore,
      maxScore,
      scorePct,
      passed,
      completedAt: new Date(),
      answers: { create: attemptAnswers },
    },
  })

  await logActivity(userId, 'quiz_attempt')

  const badgesEarned: BadgeResult[] = []

  if (passed) {
    await awardQuizXP(userId, attempt.id, scorePct, isRetry)
    await markStreakActivity(userId)

    await prisma.userSubtopicProgress.upsert({
      where: { userId_subtopicId: { userId, subtopicId: quiz.subtopicId } },
      create: { userId, subtopicId: quiz.subtopicId, quizPassed: true, completedAt: new Date() },
      update: { quizPassed: true, completedAt: new Date() },
    })

    const week = quiz.subtopic.topic.week
    const weekNumber = week.number

    // Check week-completion badge
    const weekBadge = await checkWeekComplete(userId, week.id)
    if (weekBadge) badgesEarned.push(weekBadge)

    // Check Perfectionist for this week (first-attempt pass)
    if (!isRetry) {
      const perfBadge = await checkPerfectionist(userId, week.id, weekNumber)
      if (perfBadge) badgesEarned.push(perfBadge)
    }

    // Check Quiz Master (program-wide)
    const masterBadge = await checkQuizMaster(userId)
    if (masterBadge) badgesEarned.push(masterBadge)
  }

  const questionsWithAnswers = quiz.questions.map(q => {
    const givenAll = attemptAnswers.filter(a => a.questionId === q.id)
    if (q.type === 'multi_select') {
      const correctIds = q.options.filter(o => o.isCorrect).map(o => o.id)
      const selectedIds = givenAll.map(a => a.selectedOptionId).filter(Boolean) as string[]
      return {
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        correctOptionIds: correctIds,
        selectedOptionIds: selectedIds,
        isCorrect: givenAll[0]?.isCorrect ?? false,
      }
    }
    const correct = q.options.find(o => o.isCorrect)
    const given = givenAll[0]
    return {
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options,
      correctOptionId: correct?.id,
      selectedOptionId: given?.selectedOptionId,
      isCorrect: given?.isCorrect,
    }
  })

  return NextResponse.json({
    attemptId: attempt.id,
    scorePct,
    rawScore,
    maxScore,
    passed,
    questions: questionsWithAnswers,
    badgesEarned,
  })
}
