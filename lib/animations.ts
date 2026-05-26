import type { Variants } from 'framer-motion'

// ─── Spring presets ───────────────────────────────────────────────────────────
export const spring = { type: 'spring' as const, stiffness: 400, damping: 28 }
export const smoothSpring = { type: 'spring' as const, stiffness: 220, damping: 24 }
export const bouncySpring = { type: 'spring' as const, stiffness: 500, damping: 22 }
export const gentleSpring = { type: 'spring' as const, stiffness: 150, damping: 20 }

// ─── Fade variants ────────────────────────────────────────────────────────────
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { ...smoothSpring } },
  exit:   { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit:   { opacity: 0, transition: { duration: 0.2 } },
}

export const scaleIn: Variants = {
  hidden: { scale: 0.7,  opacity: 0 },
  show:   { scale: 1,    opacity: 1, transition: { ...bouncySpring } },
  exit:   { scale: 0.85, opacity: 0, transition: { duration: 0.18 } },
}

export const scaleInSmooth: Variants = {
  hidden: { scale: 0.9, opacity: 0 },
  show:   { scale: 1,   opacity: 1, transition: { ...smoothSpring } },
  exit:   { scale: 0.95, opacity: 0, transition: { duration: 0.2 } },
}

// ─── Stagger container ────────────────────────────────────────────────────────
export const staggerContainer: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

export const staggerContainerFast: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.05, delayChildren: 0 } },
}

// ─── Slide variants ───────────────────────────────────────────────────────────
export const slideInRight: Variants = {
  hidden: { x: 40,  opacity: 0 },
  show:   { x: 0,   opacity: 1, transition: { ...smoothSpring } },
  exit:   { x: -24, opacity: 0, transition: { duration: 0.2 } },
}

export const slideInLeft: Variants = {
  hidden: { x: -40, opacity: 0 },
  show:   { x: 0,   opacity: 1, transition: { ...smoothSpring } },
  exit:   { x: 24,  opacity: 0, transition: { duration: 0.2 } },
}

// ─── Card hover (use with whileHover prop) ────────────────────────────────────
export const cardHover = {
  y: -4,
  boxShadow: '0 12px 32px -4px rgba(79,70,229,0.15), 0 4px 8px -2px rgba(79,70,229,0.08)',
  transition: { ...smoothSpring },
}

export const cardHoverSubtle = {
  y: -2,
  boxShadow: '0 8px 20px -4px rgba(0,0,0,0.08)',
  transition: { ...smoothSpring },
}

// ─── Celebration shake (for locked lock icon) ─────────────────────────────────
export const shakeKeyframes = {
  x: [0, -8, 8, -6, 6, -4, 4, 0],
  transition: { duration: 0.5, ease: 'easeInOut' },
}

// ─── Celebration pop (for XP badge, badge unlock) ────────────────────────────
export const popIn: Variants = {
  hidden: { scale: 0, rotate: -12, opacity: 0 },
  show:   {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: { ...bouncySpring, delay: 0.1 },
  },
}

// ─── Pulse (for streak badge, locked cards) ───────────────────────────────────
export const pulsate: Variants = {
  idle: { scale: 1,    opacity: 1 },
  pulse: {
    scale:   [1, 1.06, 1],
    opacity: [1, 0.85, 1],
    transition: { repeat: Infinity, duration: 2.4, ease: 'easeInOut' },
  },
}
