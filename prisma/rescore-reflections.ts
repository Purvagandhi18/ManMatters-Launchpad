import { PrismaClient } from '@prisma/client'
import Anthropic from '@anthropic-ai/sdk'

const prisma = new PrismaClient()
const anthropic = new Anthropic()

async function evaluateReflection(
  content: string,
  topicTitle: string,
  subtopics: { title: string; description: string }[]
): Promise<{ score: number | null; feedback: string | null; isAiGenerated: boolean | null; status: string }> {
  const subtopicList = subtopics
    .map(s => `- ${s.title}${s.description ? ': ' + s.description : ''}`)
    .join('\n')

  const prompt = `You are evaluating a learner's reflection for a live learning platform. Be strict, intelligent, and consistent.

Topic: "${topicTitle}"
Subtopics covered:
${subtopicList}

Learner's reflection:
"""
${content.trim()}
"""

Assign a score from 0 to 3:

SCORE 0 — INVALID: Gibberish, random characters, filler text ("I learned a lot"), unrelated content, copy-pasted definitions with no engagement, or under 3 real sentences. No genuine attempt.

SCORE 1 — WEAK: Readable and somewhat relevant but shows little understanding. No specific concepts referenced. Could have been written without doing the lesson.

SCORE 2 — BASIC UNDERSTANDING: References specific concepts or takeaways from the topic/subtopics. Substantive and relevant even if brief. Genuine engagement with the material.

SCORE 3 — STRONG REFLECTION: Explains WHY something works or HOW to apply it. Connects ideas across subtopics. Personal and specific. Could not have been written without doing the lesson.

AI-GENERATED CHECK: Overly polished, formal transitions ("Furthermore"), bullet-point thinking in prose, no personal voice = likely AI-generated.

Return ONLY valid JSON — no markdown, no extra text:
{"score": <integer 0, 1, 2, or 3>, "isAiGenerated": <true or false>, "feedback": "<ONE direct sentence — specific and actionable>", "status": "<approved|needs_revision>"}

Rules: score 0 or 1 → needs_revision. score 2 or 3 → approved. isAiGenerated true → needs_revision. Judge content every time — do NOT auto-approve retries.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { text: string }).text.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const parsed = JSON.parse(raw)
    const score = typeof parsed.score === 'number' ? parsed.score : null
    const feedback = typeof parsed.feedback === 'string' ? parsed.feedback : null
    const isAiGenerated = parsed.isAiGenerated === true
    let status = parsed.status === 'needs_revision' ? 'needs_revision' : 'approved'
    if (isAiGenerated) status = 'needs_revision'
    return { score, feedback, isAiGenerated, status }
  } catch (err: any) {
    console.error('  ⚠ AI eval failed:', err?.message)
    return { score: null, feedback: null, isAiGenerated: null, status: 'approved' }
  }
}

async function main() {
  console.log('Finding all Week 2+ reflections...')

  const reflections = await prisma.topicReflection.findMany({
    where: { topic: { week: { number: { gte: 2 } } } },
    include: {
      topic: {
        select: {
          title: true,
          subtopics: { select: { title: true, description: true } },
          week: { select: { number: true } },
        },
      },
      user: { select: { displayName: true } },
    },
    orderBy: { submittedAt: 'asc' },
  })

  console.log(`Found ${reflections.length} reflection(s) from Week 2+\n`)

  if (reflections.length === 0) {
    console.log('Nothing to score.')
    return
  }

  let updated = 0
  let failed = 0

  for (const ref of reflections) {
    const weekNum = ref.topic.week.number
    const alreadyScored = ref.aiScore !== null
    console.log(`[Week ${weekNum}] ${ref.user.displayName} — "${ref.topic.title}" | ${alreadyScored ? `already scored: ${ref.aiScore}` : 'no score — evaluating...'}`)

    const result = await evaluateReflection(ref.content, ref.topic.title, ref.topic.subtopics)

    if (result.score === null) {
      console.log('  ✗ Evaluation failed — skipping\n')
      failed++
      continue
    }

    // Update the reflection record
    await prisma.topicReflection.update({
      where: { id: ref.id },
      data: {
        aiScore: result.score,
        aiFeedback: result.feedback,
        isAiGenerated: result.isAiGenerated,
        status: result.status,
      },
    })

    // Award XP if not already awarded (check existing XP transactions for this reflection)
    const existingXP = await prisma.xPTransaction.findFirst({
      where: { userId: ref.userId, referenceType: 'topic_reflection', referenceId: ref.id },
    })

    if (!existingXP && result.score !== null) {
      let xpAmount = 0
      if (result.isAiGenerated) {
        xpAmount = 0
      } else {
        const levelXP: Record<number, number> = { 0: 0, 1: 15, 2: 60, 3: 100 }
        xpAmount = levelXP[Math.round(result.score)] ?? 0
      }
      if (xpAmount > 0) {
        await prisma.xPTransaction.create({
          data: {
            userId: ref.userId,
            amount: xpAmount,
            reason: 'reflection_submit',
            referenceType: 'topic_reflection',
            referenceId: ref.id,
          },
        })
        console.log(`  ✓ Score: ${result.score}/10 | ${result.status} | AI-generated: ${result.isAiGenerated} | XP awarded: ${xpAmount}`)
      }
    } else {
      console.log(`  ✓ Score: ${result.score}/10 | ${result.status} | AI-generated: ${result.isAiGenerated} | XP: already awarded`)
    }

    console.log(`  Feedback: "${result.feedback}"\n`)
    updated++

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\nDone. Updated: ${updated} | Failed: ${failed}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
