import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      criteria: { orderBy: { sortOrder: 'asc' } },
      submissions: {
        include: {
          user: { select: { id: true, displayName: true, email: true } },
          grade: { include: { criterionScores: true } },
        },
        orderBy: { submittedAt: 'desc' },
      },
    },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const project = await prisma.project.update({ where: { id: params.id }, data: body })
  return NextResponse.json(project)
}
