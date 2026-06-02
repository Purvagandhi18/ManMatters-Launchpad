import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'
import { logActivity } from '@/lib/activity'
import { checkWeekComplete, awardXP } from '@/lib/gamification'

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
    include: {
      subtopics: { select: { title: true, description: true } },
      week: { select: { id: true, number: true } },
    },
  })
  if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const subtopicList = topic.subtopics
    .map(s => `- ${s.title}${s.description ? ': ' + s.description : ''}`)
    .join('\n')

  let aiScore: number | null = null
  let aiFeedback: string | null = null
  let isAiGenerated: boolean | null = null
  let status = 'needs_revision' // default safe — only AI sets this to 'approved'

  // Week 2+ uses enhanced evaluation: non-AI detection + concept check + one-line feedback
  const isWeek2Plus = topic.week && topic.week.number >= 2

  try {
    const prompt = isWeek2Plus
      ? `You are evaluating a learner's reflection for a live learning platform. Be strict, intelligent, and consistent.

Topic: "${topic.title}"
Subtopics covered:
${subtopicList}

Learner's reflection:
"""
${content.trim()}
"""

Evaluate this reflection and assign a score from 0 to 3. Read the full rubric before scoring.

SCORE 0 — INVALID
Assign 0 if ANY of the following are true:
- Gibberish, random characters, keyboard mashing, repeated words/letters
- Completely unrelated to the topic (e.g. "I love dogs")
- Filler text with no substance (e.g. "I learned a lot", "this was great", "very interesting")
- Too short to meaningfully evaluate (under 3 real sentences)
- Copy-pasted definitions with no personal engagement
A score of 0 means the learner has not made a genuine attempt.

SCORE 1 — WEAK
The text is readable and somewhat relevant to the topic, but:
- Shows little to no understanding of the actual concepts
- Does not reference specific ideas, subtopics, or takeaways
- Very surface-level or vague ("I learned about prompts", "RAG is useful")
- Could have been written without doing the lesson at all
A score of 1 means the learner needs to try again with more depth.

SCORE 2 — BASIC UNDERSTANDING
The learner demonstrates at least basic understanding:
- References specific concepts, ideas, or takeaways from the topic/subtopics
- Shows they engaged with the actual content (not just the topic name)
- May be brief but is substantive and relevant
- Does not need to be eloquent — just genuine and correct
A score of 2 means: approved, the learner has shown basic engagement with the material.

SCORE 3 — STRONG REFLECTION
The learner goes beyond naming concepts:
- Explains WHY something works, or HOW they would apply it
- Shows genuine thinking: connects ideas, notes what surprised them, or identifies limitations
- Demonstrates real understanding of at least 2–3 subtopics
- Personal and specific — could not have been written without actually doing the lesson
A score of 3 means: approved, the learner has shown strong understanding and reflection.

AI-GENERATED TEXT CHECK
Also check: does this read like AI-generated text?
AI signals: overly polished structure, formal transitions ("Furthermore", "In conclusion"), bullet-point thinking in prose form, no personal voice, generic completeness.
Human signals: informal language, uncertainty, personal examples, imperfect structure, specific details.

Return ONLY valid JSON — no markdown, no extra text:
{"score": <integer 0, 1, 2, or 3>, "isAiGenerated": <true or false>, "feedback": "<ONE direct sentence — specific and actionable, not generic>", "status": "<approved|needs_revision>"}

Rules:
- score 0 → status must be "needs_revision"
- score 1 → status must be "needs_revision"
- score 2 → status must be "approved"
- score 3 → status must be "approved"
- isAiGenerated true → status must be "needs_revision" regardless of score
- Do NOT auto-approve on retry. Judge the actual content every time.`
      : `You are evaluating a learner's "What Did I Learn?" reflection on a topic they just studied.

Topic: "${topic.title}"
Subtopics covered:
${subtopicList}

Learner's reflection:
"${content.trim()}"

Evaluate quality of understanding on these dimensions (each 0–10, then average for final score):
1. Conceptual understanding – does the learner show they genuinely grasped the topic, not just repeated definitions?
2. Fundamentals strength – are the core concepts correctly understood and explained?
3. Subtopic coverage – how well does it address the key points from the subtopics listed?
4. Specificity – concrete, precise detail vs vague or generic statements?
5. Originality – thoughtful personal synthesis vs AI-sounding or copy-paste phrasing?

Return ONLY valid JSON in this exact shape (no markdown, no extra text):
{"score": <0-10 float>, "feedback": "<2-3 sentence constructive feedback on what they understood well and what could be stronger>", "status": "<approved|needs_revision>"}

Use "needs_revision" if score < 6. Be encouraging but direct. Focus on depth of understanding, not style.`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { text: string }).text.trim()
      .replace(/^```(?:json)?\s*/i, '')  // strip opening ```json
      .replace(/\s*```$/i, '')           // strip closing ```
      .trim()
    const parsed = JSON.parse(raw)
    aiScore = typeof parsed.score === 'number' ? parsed.score : null
    aiFeedback = typeof parsed.feedback === 'string' ? parsed.feedback : null
    isAiGenerated = isWeek2Plus ? (parsed.isAiGenerated === true) : null
    status = parsed.status === 'needs_revision' ? 'needs_revision' : 'approved'
    // Force needs_revision if AI-generated
    if (isAiGenerated) status = 'needs_revision'
  } catch (err: any) {
    console.error('[Reflection AI] Evaluation failed:', err?.message ?? err)
    // If AI evaluation fails for any reason, never auto-approve — keep as needs_revision
    aiFeedback = 'Unable to evaluate this submission. Please try again.'
    status = 'needs_revision'
  }

  const isFirstSubmission = !(await prisma.topicReflection.findUnique({
    where: { userId_topicId: { userId, topicId: params.id } },
  }))

  const reflection = isFirstSubmission
    ? await prisma.topicReflection.create({
        data: { userId, topicId: params.id, content: content.trim(), aiScore, aiFeedback, isAiGenerated, status },
      })
    : await prisma.topicReflection.update({
        where: { userId_topicId: { userId, topicId: params.id } },
        data: { content: content.trim(), aiScore, aiFeedback, isAiGenerated, status, revisedAt: new Date() },
      })

  await logActivity(userId, 'reflection_submit')

  const badgesEarned: { id: string; name: string; iconEmoji: string }[] = []

  // Award reflection XP on first submission
  // Week 1: flat 50 XP
  // Week 2+: level-based XP on the 0–3 scale
  if (isFirstSubmission && aiScore != null) {
    let xpAmount = 50
    if (isWeek2Plus) {
      if (isAiGenerated) {
        xpAmount = 0  // No XP for AI-generated content
      } else {
        // score is 0–3 integer
        const levelXP: Record<number, number> = { 0: 0, 1: 15, 2: 60, 3: 100 }
        xpAmount = levelXP[Math.round(aiScore)] ?? 0
      }
    }
    if (xpAmount > 0) {
      await awardXP(userId, xpAmount, 'reflection_submit', 'topic_reflection', reflection.id)
    }
  }

  // Check week completion after reflection is evaluated
  if (aiScore != null && topic.week) {
    const weekBadge = await checkWeekComplete(userId, topic.week.id)
    if (weekBadge) badgesEarned.push(weekBadge)
  }

  return NextResponse.json({ ...reflection, badgesEarned })
}
