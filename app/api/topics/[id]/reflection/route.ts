import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const reflection = await prisma.topicReflection.findUnique({
    where: { userId_topicId: { userId, topicId: params.id } },
  })
  return NextResponse.json(reflection ?? null)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const { content } = await req.json() as { content: string }
  if (!content || content.trim().length < 20) {
    return NextResponse.json({ error: 'Reflection too short (minimum 20 characters).' }, { status: 400 })
  }

  const topic = await prisma.topic.findUnique({
    where: { id: params.id },
    include: { subtopics: { select: { title: true, description: true } } },
  })
  if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const subtopicList = topic.subtopics
    .map(s => `- ${s.title}${s.description ? ': ' + s.description : ''}`)
    .join('\n')

  let aiScore: number | null = null
  let aiFeedback: string | null = null
  let status = 'approved'

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `You are evaluating a learner's reflection on a topic they just studied.

Topic: "${topic.title}"
Subtopics covered:
${subtopicList}

Learner's reflection:
"${content.trim()}"

Evaluate on these criteria (each 0–10, then average):
1. Coverage – does it reference key ideas from the subtopics?
2. Specificity – concrete details, not generic filler?
3. Correctness – are the concepts understood accurately?
4. Originality – personal insights beyond paraphrasing?

Return ONLY valid JSON in this exact shape (no markdown, no extra text):
{"score": <0-10 float>, "feedback": "<2-3 sentence constructive feedback>", "status": "<approved|needs_revision>"}

Use "needs_revision" if score < 6. Be encouraging but honest.`,
      }],
    })

    const raw = (message.content[0] as { text: string }).text.trim()
    const parsed = JSON.parse(raw)
    aiScore = typeof parsed.score === 'number' ? parsed.score : null
    aiFeedback = typeof parsed.feedback === 'string' ? parsed.feedback : null
    status = parsed.status === 'needs_revision' ? 'needs_revision' : 'approved'
  } catch {
    // AI unavailable — still save the reflection as approved
    status = 'approved'
  }

  const existing = await prisma.topicReflection.findUnique({
    where: { userId_topicId: { userId, topicId: params.id } },
  })

  const reflection = existing
    ? await prisma.topicReflection.update({
        where: { userId_topicId: { userId, topicId: params.id } },
        data: { content: content.trim(), aiScore, aiFeedback, status, revisedAt: new Date() },
      })
    : await prisma.topicReflection.create({
        data: { userId, topicId: params.id, content: content.trim(), aiScore, aiFeedback, status },
      })

  return NextResponse.json(reflection)
}
