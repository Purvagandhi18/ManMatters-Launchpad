'use client'
import { motion, useMotionValue, useSpring, useMotionValueEvent } from 'framer-motion'
import { useState, useEffect } from 'react'
import { getLevelFromXP, LEVELS } from '@/lib/gamification'
import { cn } from '@/lib/utils'

interface Props {
  totalXP: number
  className?: string
  /** Show the count-up number above the bar (for hero/dark backgrounds) */
  showCounter?: boolean
}

function useCountUp(target: number) {
  const raw    = useMotionValue(0)
  const spring = useSpring(raw, { stiffness: 55, damping: 18 })
  const [display, setDisplay] = useState(0)

  useMotionValueEvent(spring, 'change', (v) => setDisplay(Math.round(v)))

  useEffect(() => {
    raw.set(target)
  }, [target, raw])

  return display
}

export function XPBar({ totalXP, className, showCounter = false }: Props) {
  const level     = getLevelFromXP(totalXP)
  const nextLevel = LEVELS.find((l) => l.level === level.level + 1)
  const pct       = nextLevel
    ? Math.min(100, ((totalXP - level.minXP) / (nextLevel.minXP - level.minXP)) * 100)
    : 100

  const counter = useCountUp(totalXP)

  return (
    <div className={cn('space-y-1', className)}>
      {showCounter && (
        <div className="flex justify-between text-xs font-medium text-white/80 mb-1">
          <span className="tabular-nums">{counter.toLocaleString()} XP</span>
          {nextLevel && <span>{nextLevel.minXP.toLocaleString()} XP</span>}
        </div>
      )}

      {/* Animated fill bar */}
      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #818cf8, #6366f1, #7c3aed)' }}
          initial={{ width: '0%' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.1, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </div>

      {!showCounter && (
        <div className="flex justify-between text-xs text-gray-400 pt-0.5">
          <span>{level.name}</span>
          {nextLevel && (
            <span>{totalXP.toLocaleString()} / {nextLevel.minXP.toLocaleString()} XP</span>
          )}
        </div>
      )}
    </div>
  )
}
