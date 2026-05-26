'use client'
import { useCallback } from 'react'
import confetti from 'canvas-confetti'

export type ConfettiIntensity = 'medium' | 'celebration'

export function useConfetti() {
  const fire = useCallback((intensity: ConfettiIntensity = 'medium') => {
    if (intensity === 'medium') {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#7c3aed', '#06b6d4', '#10b981'],
        disableForReducedMotion: true,
      })
    } else {
      // Two-burst celebration
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: ['#f59e0b', '#4f46e5', '#10b981', '#ec4899'],
        disableForReducedMotion: true,
      })
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.65 },
          colors: ['#f59e0b', '#4f46e5', '#10b981', '#ec4899'],
          disableForReducedMotion: true,
        })
      }, 180)
    }
  }, [])

  return fire
}
