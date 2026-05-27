import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [grades, badges, weekProgress, retryGrants, subtopicProgress, quizAttempts, streakRecords] = await Promise.all([
    // Graded projects in last 30 days
    prisma.projectGrade.findMany({
      where: { gradedAt: { gte: thirtyDaysAgo }, submission: { userId } },
      include: { submission: { include: { project: { select: { id: true, title: true, subtopicId: true } } } } },
      orderBy: { gradedAt: 'desc' },
      take: 10,
    }),
    // Badges earned in last 30 days
    prisma.userBadge.findMany({
      where: { userId, earnedAt: { gte: thirtyDaysAgo } },
      include: { badge: { select: { name: true, iconEmoji: true, conditionType: true } } },
      orderBy: { earnedAt: 'desc' },
      take: 10,
    }),
    // Newly unlocked weeks in last 30 days
    prisma.userWeekProgress.findMany({
      where: { userId, isUnlocked: true },
      include: { week: { select: { id: true, number: true, title: true, isPublished: true } } },
      orderBy: { week: { number: 'asc' } },
    }),
    // Retry grants in last 30 days
    prisma.adminOverrideLog.findMany({
      where: { targetUserId: userId, actionType: 'quiz_retry_grant', createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    // All subtopic progress for reminders
    prisma.userSubtopicProgress.findMany({
      where: { userId },
      include: { subtopic: { include: { quiz: { select: { id: true } }, project: { select: { id: true } }, topic: { include: { week: true } } } } },
    }),
    // All passed quiz attempts for Quiz Master nudge
    prisma.quizAttempt.findMany({
      where: { userId, passed: true },
      select: { quizId: true, scorePct: true, attemptNumber: true },
    }),
    // Streak for Streak Lord nudge
    prisma.streakRecord.findMany({
      where: { userId, hasActivity: true },
      orderBy: { weekStartDate: 'desc' },
      take: 1,
    }),
  ])

  // ── Events (time-based, unread tracked by client) ─────────────────────────
  const events: { id: string; type: string; icon: string; title: string; subtitle?: string; href?: string; createdAt: string }[] = []

  for (const g of grades) {
    events.push({
      id: `grade-${g.id}`,
      type: 'project_graded',
      icon: '✅',
      title: `"${g.submission.project.title}" has been graded`,
      subtitle: `${g.totalScore}/${g.maxTotalScore} · ${Math.round(g.scorePct)}% — check feedback`,
      href: `/project/${g.submission.projectId}`,
      createdAt: g.gradedAt.toISOString(),
    })
  }

  for (const ub of badges) {
    events.push({
      id: `badge-${ub.id}`,
      type: 'badge_earned',
      icon: ub.badge.iconEmoji,
      title: `Badge unlocked: ${ub.badge.name}`,
      href: '/profile',
      createdAt: ub.earnedAt.toISOString(),
    })
  }

  for (const rg of retryGrants) {
    events.push({
      id: `retry-${rg.id}`,
      type: 'retry_granted',
      icon: '🔄',
      title: 'Quiz retry granted',
      subtitle: 'You can now retake this quiz',
      createdAt: rg.createdAt.toISOString(),
    })
  }

  // Sort events newest first
  events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // ── Reminders (state-based, always relevant) ───────────────────────────────
  const reminders: { id: string; type: string; icon: string; title: string; subtitle?: string; href?: string }[] = []

  // Find the current active week (lowest unlocked week with incomplete subtopics)
  const unlockedWeekIds = weekProgress.filter(wp => wp.week.isPublished).map(wp => wp.week.id)

  // Incomplete quizzes & pending reflections & pending projects
  const topicsNeedingReflection = new Set<string>()
  for (const sp of subtopicProgress) {
    const sub = sp.subtopic
    const weekNum = sub.topic.week?.number
    if (!weekNum || !sub.topic.week?.isPublished) continue
    if (!unlockedWeekIds.includes(sub.topic.week.id)) continue

    if (sub.quiz && !sp.quizPassed) {
      reminders.push({
        id: `reminder-quiz-${sp.subtopicId}`,
        type: 'reminder_quiz',
        icon: '📋',
        title: `Quiz pending: ${sub.title}`,
        subtitle: `Week ${weekNum}`,
        href: `/week/${sub.topic.week.id}`,
      })
    }

    if (sub.project && !sp.projectSubmitted) {
      reminders.push({
        id: `reminder-project-${sp.subtopicId}`,
        type: 'reminder_project',
        icon: '📤',
        title: `Project not submitted: ${sub.title}`,
        subtitle: `Week ${weekNum}`,
        href: `/project/${sub.project.id}`,
      })
    }

    // Track topics that are quiz-done for reflection reminders (handled separately)
    if (sp.quizPassed) topicsNeedingReflection.add(sub.topic.id)
  }

  // Fetch reflections to find topics needing one
  if (topicsNeedingReflection.size > 0) {
    const existingReflections = await prisma.topicReflection.findMany({
      where: { userId, topicId: { in: Array.from(topicsNeedingReflection) } },
      select: { topicId: true, status: true },
    })
    const reflectedTopics = new Set(existingReflections.filter(r => r.status === 'approved').map(r => r.topicId))
    const needsRevisionTopics = new Set(existingReflections.filter(r => r.status === 'needs_revision').map(r => r.topicId))

    for (const topicId of Array.from(topicsNeedingReflection)) {
      if (reflectedTopics.has(topicId)) continue
      const prog = subtopicProgress.find(sp => sp.subtopic.topicId === topicId)
      if (!prog) continue
      const weekNum = prog.subtopic.topic.week?.number
      if (needsRevisionTopics.has(topicId)) {
        reminders.push({
          id: `reflection-revision-${topicId}`,
          type: 'reminder_reflection',
          icon: '📝',
          title: 'Reflection needs revision',
          subtitle: `Week ${weekNum} · Check AI feedback and resubmit`,
          href: prog.subtopic.topic.week ? `/week/${prog.subtopic.topic.week.id}` : undefined,
        })
      } else {
        reminders.push({
          id: `reflection-pending-${topicId}`,
          type: 'reminder_reflection',
          icon: '📝',
          title: 'Write your reflection',
          subtitle: `Week ${weekNum} · Share what you learned`,
          href: prog.subtopic.topic.week ? `/week/${prog.subtopic.topic.week.id}` : undefined,
        })
      }
    }
  }

  // ── Nudges (progress toward achievements) ────────────────────────────────
  const nudges: { id: string; type: string; icon: string; title: string; subtitle?: string; href?: string }[] = []

  // Quiz Master nudge: best score per quiz
  const bestByQuiz = new Map<string, number>()
  for (const a of quizAttempts) {
    const prev = bestByQuiz.get(a.quizId) ?? 0
    if (a.scorePct > prev) bestByQuiz.set(a.quizId, a.scorePct)
  }
  const qualifiedQuizzes = Array.from(bestByQuiz.values()).filter(pct => pct >= 95).length
  const hasQuizMaster = badges.some(ub => ub.badge.conditionType === 'special') ||
    (await prisma.userBadge.findFirst({ where: { userId, badge: { conditionValue: 'quiz_master' } } }))
  if (!hasQuizMaster && qualifiedQuizzes > 0 && qualifiedQuizzes < 5) {
    nudges.push({
      id: 'nudge-quiz-master',
      type: 'nudge_quiz_master',
      icon: '🧠',
      title: `${qualifiedQuizzes}/5 quizzes toward Quiz Master`,
      subtitle: 'Score 95%+ on 5 quizzes to earn this badge',
    })
  }

  // Streak Lord nudge
  const currentStreak = streakRecords[0]?.streakCount ?? 0
  const hasStreakLord = await prisma.userBadge.findFirst({ where: { userId, badge: { conditionValue: 'streak_lord' } } })
  if (!hasStreakLord && currentStreak > 0 && currentStreak < 4) {
    nudges.push({
      id: 'nudge-streak-lord',
      type: 'nudge_streak',
      icon: '🔥',
      title: `${currentStreak}/4 weeks toward Streak Lord`,
      subtitle: `${4 - currentStreak} more active week${4 - currentStreak === 1 ? '' : 's'} to unlock`,
    })
  }

  return NextResponse.json({ events, reminders, nudges })
}
