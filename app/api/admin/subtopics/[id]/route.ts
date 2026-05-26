import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const sub = await prisma.subtopic.findUnique({
    where: { id: params.id },
    include: {
      references: { orderBy: { sortOrder: 'asc' } },
      quiz: {
        include: {
          questions: {
            include: { options: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
      project: { include: { criteria: { orderBy: { sortOrder: 'asc' } } } },
    },
  })
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(sub)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const sub = await prisma.subtopic.update({ where: { id: params.id }, data: body })
  return NextResponse.json(sub)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await prisma.subtopic.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
