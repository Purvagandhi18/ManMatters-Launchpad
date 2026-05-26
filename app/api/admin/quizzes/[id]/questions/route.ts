import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { type, text, points, options } = await req.json()

  const question = await prisma.question.create({
    data: {
      quizId: params.id,
      type,
      text,
      points: points ?? 1,
      options: options
        ? {
            create: options.map(
              (o: { text: string; isCorrect: boolean }, i: number) => ({
                text: o.text,
                isCorrect: o.isCorrect,
                sortOrder: i,
              })
            ),
          }
        : undefined,
    },
    include: { options: true },
  })
  return NextResponse.json(question)
}
