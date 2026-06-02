import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const week = await prisma.week.findUnique({
    where: { id: params.id },
    include: {
      weekProject: { select: { id: true, title: true } },
      topics: {
        orderBy: { sortOrder: 'asc' },
        where: { tag: { not: 'capstone' } }, // hide legacy capstone container topics
        include: {
          projects: { select: { id: true, title: true }, orderBy: { createdAt: 'asc' } }, // topic-level projects
          subtopics: {
            orderBy: { sortOrder: 'asc' },
            where: { tag: { not: 'capstone' } },
            include: {
              quiz: { select: { id: true, status: true } },
              project: { select: { id: true, title: true } }, // legacy subtopic project
            },
          },
          references: { orderBy: { sortOrder: 'asc' } },
        },
      },
    },
  })
  if (!week) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(week)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const week = await prisma.week.update({ where: { id: params.id }, data: body })
  return NextResponse.json(week)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await prisma.week.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
