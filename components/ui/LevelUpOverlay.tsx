'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { useConfetti } from './ConfettiCannon'

interface Props {
  open: boolean
  levelName: string
  levelNumber: number
  onClose: () => void
}

const LEVEL_COLORS: Record<number, string> = {
  1: 'from-gray-400 to-gray-500',
  2: 'from-blue-500 to-indigo-600',
  3: 'from-indigo-500 to-purple-600',
  4: 'from-purple-500 to-pink-600',
  5: 'from-pink-500 to-rose-500',
  6: 'from-amber-400 to-orange-500',
  7: 'from-yellow-400 to-amber-500',
}

export function LevelUpOverlay({ open, levelName, levelNumber, onClose }: Props) {
  const fireConfetti = useConfetti()

  useEffect(() => {
    if (open) {
      setTimeout(() => fireConfetti('celebration'), 400)
    }
  }, [open, fireConfetti])

  // Auto-close after 4 s
  useEffect(() => {
    if (!open) return
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [open, onClose])

  const gradient = LEVEL_COLORS[levelNumber] ?? 'from-brand-500 to-purple-600'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="level-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="relative bg-white rounded-3xl p-10 text-center max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow ring */}
            <motion.div
              animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.06, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${gradient} opacity-10 pointer-events-none`}
            />

            {/* Level badge */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.15 }}
              className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br ${gradient} mb-4 shadow-xl mx-auto`}
            >
              <span className="text-4xl">⚡</span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm font-semibold text-brand-500 uppercase tracking-widest mb-1"
            >
              Level Up!
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
              className="text-3xl font-black text-gray-900 mb-2"
            >
              {levelName}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-gray-500 text-sm mb-6"
            >
              You&apos;re now Level {levelNumber}. Keep shipping.
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              onClick={onClose}
              className="w-full bg-gradient-to-r from-brand-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              Let&apos;s go 🚀
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
