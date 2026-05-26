import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const weeks = await prisma.week.findMany({
    orderBy: { number: 'asc' },
    include: {
      _count: { select: { topics: true } },
      topics: {
        include: {
          _count: { select: { subtopics: true } },
          subtopics: {
            include: {
              quiz: { select: { id: true, status: true } },
              project: { select: { id: true } },
            },
          },
        },
      },
    },
  })
  return NextResponse.json(weeks)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const week = await prisma.week.create({ data: body })
  return NextResponse.json(week)
}
