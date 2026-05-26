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
      topics: {
        orderBy: { sortOrder: 'asc' },
        include: {
          subtopics: {
            orderBy: { sortOrder: 'asc' },
            include: {
              quiz: { select: { id: true, status: true } },
              project: { select: { id: true, title: true } },
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
