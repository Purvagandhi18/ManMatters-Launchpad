import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { markStreakActivity } from '@/lib/gamification'

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

  await prisma.userSubtopicProgress.upsert({
    where: { userId_subtopicId: { userId, subtopicId: project.subtopicId } },
    create: { userId, subtopicId: project.subtopicId, projectRequired: true, projectSubmitted: true },
    update: { projectSubmitted: true },
  })

  await markStreakActivity(userId)

  return NextResponse.json(submission)
}
