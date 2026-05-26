'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { Zap } from 'lucide-react'

interface Props {
  amount: number | null
  onDone: () => void
}

export function XPGainToast({ amount, onDone }: Props) {
  return (
    <AnimatePresence onExitComplete={onDone}>
      {amount !== null && (
        <motion.div
          key="xp-toast"
          initial={{ opacity: 0, y: 0, scale: 0.8 }}
          animate={{ opacity: 1, y: -48, scale: 1 }}
          exit={{ opacity: 0, y: -80, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22, duration: 0.5 }}
          onAnimationComplete={(def) => {
            // After the enter animation, wait 900ms then unmount
            if (def === 'animate') {
              setTimeout(onDone, 900)
            }
          }}
          className="inline-flex items-center gap-1.5 bg-brand-600 text-white text-sm font-bold px-3.5 py-2 rounded-full shadow-lg shadow-brand-500/30 pointer-events-none select-none"
        >
          <Zap size={14} className="text-yellow-300" />
          +{amount} XP
        </motion.div>
      )}
    </AnimatePresence>
  )
}
