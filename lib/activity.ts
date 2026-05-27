import { prisma } from './db'

export const ACTIVITY_SCORES: Record<string, number> = {
  page_visit:         1,
  quiz_attempt:       3,
  reflection_submit:  3,
  project_submit:     5,
}

export const ACTIVITY_LABELS: Record<string, string> = {
  page_visit:         'Dashboard visited',
  quiz_attempt:       'Quiz submitted',
  reflection_submit:  'Reflection submitted',
  project_submit:     'Project submitted',
}

export function scoreToLevel(score: number): 'none' | 'light' | 'medium' | 'high' {
  if (score === 0) return 'none'
  if (score === 1) return 'light'
  if (score <= 5)  return 'medium'
  return 'high'
}

export async function logActivity(
  userId: string,
  type: string,
  { deduplicate = false } = {}
) {
  const score = ACTIVITY_SCORES[type] ?? 1

  if (deduplicate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const existing = await prisma.activityEvent.findFirst({
      where: { userId, type, createdAt: { gte: today, lt: tomorrow } },
      select: { id: true },
    })
    if (existing) return
  }

  await prisma.activityEvent.create({ data: { userId, type, score } })
}
