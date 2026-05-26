import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const weeks = await prisma.week.findMany({
    orderBy: { number: 'asc' },
    include: {
      weekProgress: { where: { userId } },
      topics: {
        include: {
          subtopics: {
            include: {
              userProgress: { where: { userId } },
              quiz: { select: { id: true, status: true } },
              project: { select: { id: true, isPublished: true } },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  return NextResponse.json(weeks)
}
