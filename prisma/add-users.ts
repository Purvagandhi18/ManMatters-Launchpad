import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Get cohort 1
  const cohort = await prisma.cohort.findFirst()

  const users = [
    { email: 'admin@manmatters.com', password: 'admin123',   displayName: 'Admin',  role: 'admin'   },
    { email: 'kunal@manmatters.com', password: 'Learner123', displayName: 'Kunal',  role: 'learner' },
    { email: 'sabika@manmatters.com', password: 'Learner456', displayName: 'Sabika', role: 'learner' },
  ]

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10)
    const existing = await prisma.user.findUnique({ where: { email: u.email } })

    if (existing) {
      // Update password only
      await prisma.user.update({ where: { email: u.email }, data: { password: hash } })
      console.log(`Updated password for ${u.email}`)
    } else {
      const created = await prisma.user.create({
        data: {
          email: u.email,
          password: hash,
          displayName: u.displayName,
          role: u.role,
          cohortId: u.role === 'learner' ? cohort?.id : undefined,
        },
      })
      // Unlock week 1 for new learners
      if (u.role === 'learner') {
        const week1 = await prisma.week.findFirst({ where: { number: 1 } })
        if (week1) {
          await prisma.userWeekProgress.create({
            data: { userId: created.id, weekId: week1.id, isUnlocked: true, unlockedAt: new Date() },
          })
        }
        // Award Early Operator badge
        const badge = await prisma.badge.findFirst({ where: { conditionValue: 'early_operator' } })
        if (badge) {
          await prisma.userBadge.create({ data: { userId: created.id, badgeId: badge.id } })
        }
      }
      console.log(`Created ${u.role}: ${u.email}`)
    }
  }

  console.log('Done.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
