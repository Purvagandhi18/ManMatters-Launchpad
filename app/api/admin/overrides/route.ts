import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const adminId = (session.user as { id: string }).id
  const { action, userId, weekId, subtopicId, quizId, reason } = await req.json()

  if (action === 'unlock_week') {
    await prisma.userWeekProgress.upsert({
      where: { userId_weekId: { userId, weekId } },
      create: { userId, weekId, isUnlocked: true, unlockedAt: new Date(), unlockedByAdmin: true },
      update: { isUnlocked: true, unlockedAt: new Date(), unlockedByAdmin: true },
    })
  } else if (action === 'lock_week') {
    await prisma.userWeekProgress.upsert({
      where: { userId_weekId: { userId, weekId } },
      create: { userId, weekId, isUnlocked: false },
      update: { isUnlocked: false },
    })
  } else if (action === 'reset_quiz') {
    const subtopic = await prisma.subtopic.findUnique({
      where: { id: subtopicId },
      include: { quiz: true },
    })
    if (subtopic?.quiz) {
      await prisma.quizAttempt.deleteMany({ where: { userId, quizId: subtopic.quiz.id } })
      await prisma.userSubtopicProgress.updateMany({
        where: { userId, subtopicId },
        data: { quizPassed: false, completedAt: null },
      })
    }
  } else if (action === 'quiz_retry_grant') {
    console.log(`quiz_retry_grant: admin=${adminId} user=${userId} quiz=${quizId}`)
  }

  const referenceType =
    action === 'unlock_week' || action === 'lock_week' ? 'week' :
    action === 'reset_quiz' ? 'subtopic' :
    action === 'quiz_retry_grant' ? 'quiz' :
    undefined

  const referenceId =
    action === 'unlock_week' || action === 'lock_week' ? weekId :
    action === 'reset_quiz' ? subtopicId :
    action === 'quiz_retry_grant' ? quizId :
    weekId ?? subtopicId

  await prisma.adminOverrideLog.create({
    data: {
      adminId,
      targetUserId: userId,
      actionType: action,
      referenceType,
      referenceId,
      reason,
    },
  })

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const logs = await prisma.adminOverrideLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json(logs)
}
