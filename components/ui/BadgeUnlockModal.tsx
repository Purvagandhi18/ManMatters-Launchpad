'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { useConfetti } from './ConfettiCannon'

interface Props {
  open: boolean
  badge: { name: string; description: string; iconEmoji: string } | null
  onClose: () => void
}

// Sparkle positions around the badge
const SPARKLES = [
  { x: -48, y: -44, delay: 0.25, size: 14 },
  { x:  52, y: -38, delay: 0.35, size: 10 },
  { x: -52, y:  38, delay: 0.30, size: 12 },
  { x:  46, y:  46, delay: 0.40, size: 8  },
  { x:   0, y: -58, delay: 0.20, size: 10 },
  { x:   0, y:  58, delay: 0.45, size: 8  },
]

function Sparkle({ x, y, delay, size }: { x: number; y: number; delay: number; size: number }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.7] }}
      transition={{ delay, duration: 0.6, ease: 'easeOut' }}
      style={{ position: 'absolute', left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
    >
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <path d="M10 0L11.8 8.2L20 10L11.8 11.8L10 20L8.2 11.8L0 10L8.2 8.2L10 0Z" fill="#f59e0b" />
      </svg>
    </motion.div>
  )
}

export function BadgeUnlockModal({ open, badge, onClose }: Props) {
  const fireConfetti = useConfetti()

  useEffect(() => {
    if (open) setTimeout(() => fireConfetti('medium'), 300)
  }, [open, fireConfetti])

  return (
    <AnimatePresence>
      {open && badge && (
        <motion.div
          key="badge-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.75, opacity: 0, y: 32 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="relative bg-white rounded-3xl p-8 text-center max-w-xs w-full shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-amber-50/60 to-white pointer-events-none" />

            {/* Badge + sparkles */}
            <div className="relative inline-block mb-5" style={{ width: 96, height: 96 }}>
              {SPARKLES.map((s, i) => <Sparkle key={i} {...s} />)}
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.1 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-200 mx-auto"
              >
                <span className="text-4xl">{badge.iconEmoji}</span>
              </motion.div>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1"
            >
              Badge Unlocked
            </motion.p>

            <motion.h3
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="text-xl font-black text-gray-900 mb-2"
            >
              {badge.name}
            </motion.h3>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.58 }}
              className="text-sm text-gray-500 mb-6 leading-relaxed"
            >
              {badge.description}
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              onClick={onClose}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
            >
              Nice 🎉
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
