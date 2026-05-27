import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sevenDaysAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000)
  const fourteenAgo   = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const startOfWeek   = new Date(); startOfWeek.setHours(0,0,0,0); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())

  const [ungradedSubs, thisWeekSubs, learners] = await Promise.all([
    // Ungraded project submissions
    prisma.projectSubmission.findMany({
      where: { grade: null },
      include: {
        project: { select: { id: true, title: true } },
        user: { select: { id: true, displayName: true } },
      },
      orderBy: { submittedAt: 'asc' },
    }),
    // New submissions this week
    prisma.projectSubmission.findMany({
      where: { submittedAt: { gte: startOfWeek } },
      include: {
        project: { select: { id: true, title: true } },
        user: { select: { id: true, displayName: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 20,
    }),
    // All learners with recent activity data
    prisma.user.findMany({
      where: { role: 'learner', isTestUser: false },
      select: {
        id: true,
        displayName: true,
        lastActiveAt: true,
        weekProgress: { where: { isUnlocked: true }, select: { week: { select: { number: true } } } },
      },
    }),
  ])

  const items: { id: string; type: string; icon: string; title: string; subtitle?: string; href?: string; priority: number }[] = []

  // Ungraded submissions
  for (const sub of ungradedSubs) {
    const daysWaiting = Math.floor((Date.now() - sub.submittedAt.getTime()) / 86400000)
    items.push({
      id: `ungraded-${sub.id}`,
      type: 'ungraded_submission',
      icon: '📋',
      title: `Grade: "${sub.project.title}"`,
      subtitle: `${sub.user.displayName} · submitted ${daysWaiting === 0 ? 'today' : `${daysWaiting}d ago`}`,
      href: `/admin/progress/${sub.user.id}`,
      priority: daysWaiting >= 3 ? 1 : 2,
    })
  }

  // At-risk learners — no activity in 7+ days
  const atRisk = learners.filter(l => {
    const lastActive = new Date(l.lastActiveAt)
    return lastActive < sevenDaysAgo
  })
  for (const l of atRisk) {
    const daysInactive = Math.floor((Date.now() - new Date(l.lastActiveAt).getTime()) / 86400000)
    const currentWeek = Math.max(...l.weekProgress.map((wp: any) => wp.week.number), 0)
    items.push({
      id: `at-risk-${l.id}`,
      type: 'at_risk_learner',
      icon: '⚠️',
      title: `${l.displayName} inactive for ${daysInactive} days`,
      subtitle: currentWeek > 0 ? `Last seen on Week ${currentWeek}` : 'Has not started yet',
      href: `/admin/progress/${l.id}`,
      priority: daysInactive >= 14 ? 1 : 3,
    })
  }

  // New submissions this week (not counting ones already in ungraded)
  const ungradedIds = new Set(ungradedSubs.map(s => s.id))
  const newGraded = thisWeekSubs.filter(s => !ungradedIds.has(s.id))
  if (newGraded.length > 0) {
    items.push({
      id: 'new-submissions-this-week',
      type: 'new_submissions',
      icon: '📦',
      title: `${newGraded.length} new submission${newGraded.length === 1 ? '' : 's'} graded this week`,
      subtitle: newGraded.slice(0, 3).map(s => s.user.displayName).join(', '),
      href: '/admin/progress',
      priority: 4,
    })
  }

  // Learners stuck on same week for 14+ days
  const stuckLearners = learners.filter(l => {
    const lastActive = new Date(l.lastActiveAt)
    return lastActive >= fourteenAgo && lastActive < sevenDaysAgo
  })
  if (stuckLearners.length > 0) {
    items.push({
      id: 'stuck-learners',
      type: 'stuck_learners',
      icon: '🔄',
      title: `${stuckLearners.length} learner${stuckLearners.length === 1 ? '' : 's'} may be stuck`,
      subtitle: 'No progress in 7–14 days — consider a nudge',
      href: '/admin/progress',
      priority: 3,
    })
  }

  items.sort((a, b) => a.priority - b.priority)

  return NextResponse.json({ items, ungradedCount: ungradedSubs.length })
}
