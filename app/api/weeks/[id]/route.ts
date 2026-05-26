import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const week = await prisma.week.findUnique({
    where: { id: params.id },
    include: {
      weekProgress: { where: { userId } },
      topics: {
        orderBy: { sortOrder: 'asc' },
        include: {
          subtopics: {
            orderBy: { sortOrder: 'asc' },
            include: {
              references: { orderBy: { sortOrder: 'asc' } },
              quiz: { select: { id: true, status: true, passThreshold: true } },
              project: { select: { id: true, title: true, isPublished: true } },
              userProgress: { where: { userId } },
            },
          },
        },
      },
    },
  })

  if (!week) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(week)
}
