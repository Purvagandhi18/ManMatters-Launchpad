import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      criteria: { orderBy: { sortOrder: 'asc' } },
      submissions: {
        where: { userId },
        orderBy: { submittedAt: 'desc' },
        take: 1,
        include: {
          grade: { include: { criterionScores: { include: { criterion: true } } } },
        },
      },
    },
  })

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}
