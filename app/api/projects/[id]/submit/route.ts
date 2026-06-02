import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { markStreakActivity } from '@/lib/gamification'
import { logActivity } from '@/lib/activity'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id
  const { submissionLink, notes } = await req.json()

  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const submission = await prisma.projectSubmission.create({
    data: { projectId: params.id, userId, submissionLink, notes },
  })

  // Scope-aware progress tracking
  if (project.topicId) {
    // Topic-level project
    await prisma.userTopicProgress.upsert({
      where: { userId_topicId: { userId, topicId: project.topicId } },
      create: { userId, topicId: project.topicId, projectRequired: true, projectSubmitted: true },
      update: { projectSubmitted: true },
    })
  } else if (project.weekId) {
    // Week-level project
    await prisma.userWeekProgress.upsert({
      where: { userId_weekId: { userId, weekId: project.weekId } },
      create: { userId, weekId: project.weekId, isUnlocked: true, weekProjectSubmitted: true },
      update: { weekProjectSubmitted: true },
    })
  } else if (project.subtopicId) {
    // Legacy: subtopic-level project
    await prisma.userSubtopicProgress.upsert({
      where: { userId_subtopicId: { userId, subtopicId: project.subtopicId } },
      create: { userId, subtopicId: project.subtopicId, projectRequired: true, projectSubmitted: true },
      update: { projectSubmitted: true },
    })
  }

  await logActivity(userId, 'project_submit')
  await markStreakActivity(userId)

  return NextResponse.json(submission)
}
