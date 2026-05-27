import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const cohort = await prisma.cohort.findFirst()

  // ── 1. Convert existing Kunal → Test QC account ──────────────────────────
  const existingKunal = await prisma.user.findUnique({ where: { email: 'kunal@manmatters.com' } })
  if (existingKunal) {
    const testHash = await bcrypt.hash('test', 10)
    await prisma.user.update({
      where: { id: existingKunal.id },
      data: {
        username:    'test',
        displayName: 'Test',
        password:    testHash,
        isTestUser:  true,
      },
    })
    console.log(`✓ Converted Kunal → Test QC account (username: test, isTestUser: true)`)
  } else {
    console.log('⚠ Existing kunal@manmatters.com not found — skipped conversion')
  }

  // ── 2. Create new Kunal learner account ───────────────────────────────────
  const learnerHash = await bcrypt.hash('Learner12345', 10)
  const kunalEmail  = 'kunal@launchpad.com'

  const existingNew = await prisma.user.findUnique({ where: { email: kunalEmail } })
  if (existingNew) {
    console.log(`⚠ ${kunalEmail} already exists — skipped creation`)
  } else {
    const newKunal = await prisma.user.create({
      data: {
        email:       kunalEmail,
        username:    'kunal',
        displayName: 'Kunal',
        password:    learnerHash,
        role:        'learner',
        isTestUser:  false,
        cohortId:    cohort?.id,
      },
    })

    // Unlock Week 1
    const week1 = await prisma.week.findFirst({ where: { number: 1 } })
    if (week1) {
      await prisma.userWeekProgress.create({
        data: { userId: newKunal.id, weekId: week1.id, isUnlocked: true, unlockedAt: new Date() },
      })
    }

    // Award Early Operator badge
    const badge = await prisma.badge.findFirst({ where: { conditionValue: 'early_operator' } })
    if (badge) {
      await prisma.userBadge.create({ data: { userId: newKunal.id, badgeId: badge.id } })
    }

    console.log(`✓ Created Kunal learner (username: kunal, password: Learner12345)`)
  }

  console.log('\nDone.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
