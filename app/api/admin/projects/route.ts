import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const { criteria, ...projectData } = body
  const project = await prisma.project.create({
    data: {
      ...projectData,
      criteria: criteria ? { create: criteria } : undefined,
    },
    include: { criteria: true },
  })
  return NextResponse.json(project)
}
