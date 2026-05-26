'use client'
import { useState, FormEvent, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'

// Floating particle positions
const PARTICLES = [
  { x: '12%',  y: '18%',  size: 6,  dur: 3.4, delay: 0    },
  { x: '85%',  y: '14%',  size: 4,  dur: 4.1, delay: 0.6  },
  { x: '7%',   y: '70%',  size: 5,  dur: 3.8, delay: 1.2  },
  { x: '90%',  y: '65%',  size: 7,  dur: 4.5, delay: 0.3  },
  { x: '50%',  y: '8%',   size: 4,  dur: 3.2, delay: 0.9  },
  { x: '25%',  y: '88%',  size: 5,  dur: 4.0, delay: 1.5  },
  { x: '72%',  y: '82%',  size: 4,  dur: 3.6, delay: 0.7  },
  { x: '38%',  y: '5%',   size: 3,  dur: 4.8, delay: 1.1  },
]

const STATUS_MESSAGES = [
  '✦  Initialising mission systems…',
  '✦  Loading startup knowledge base…',
  '✦  Mission Control online.',
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Typewriter status line
  const [statusIdx, setStatusIdx]   = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [charIdx, setCharIdx]       = useState(0)
  const [showForm, setShowForm]     = useState(false)

  // Run typewriter on mount
  useEffect(() => {
    const msg = STATUS_MESSAGES[statusIdx]
    if (charIdx < msg.length) {
      const t = setTimeout(() => setCharIdx((c) => c + 1), 28)
      return () => clearTimeout(t)
    }
    // Finished typing current line
    if (statusIdx < STATUS_MESSAGES.length - 1) {
      const t = setTimeout(() => {
        setStatusIdx((i) => i + 1)
        setCharIdx(0)
        setDisplayText('')
      }, 600)
      return () => clearTimeout(t)
    }
    // All lines done — reveal form
    const t = setTimeout(() => setShowForm(true), 700)
    return () => clearTimeout(t)
  }, [charIdx, statusIdx])

  useEffect(() => {
    setDisplayText(STATUS_MESSAGES[statusIdx].slice(0, charIdx))
  }, [charIdx, statusIdx])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        setError('Invalid email or password.')
        setLoading(false)
        return
      }
      const sessionRes = await fetch('/api/auth/session')
      const session = await sessionRes.json()
      router.push(session?.user?.role === 'admin' ? '/admin/dashboard' : '/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-indigo-400/30"
          style={{ left: p.x, top: p.y, width: p.size, height: p.size }}
          animate={{ y: [0, -18, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: p.dur, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}

      {/* Soft radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-900/30 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Logo + typewriter header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1,   opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 mb-5 shadow-2xl shadow-brand-900/50"
          >
            <span className="text-4xl">🚀</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="text-4xl font-black text-white mb-1 tracking-tight"
          >
            The Launchpad
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="text-indigo-300 text-sm font-medium"
          >
            Level up. Ship faster. Build better.
          </motion.p>

          {/* Typewriter status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-4 h-6 flex items-center justify-center"
          >
            <span className="text-xs text-indigo-400/80 font-mono">
              {displayText}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.6, ease: 'linear' }}
                className="inline-block w-0.5 h-3.5 bg-indigo-400 ml-0.5 align-middle"
              />
            </span>
          </motion.div>
        </div>

        {/* Login form — slides in after typewriter */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              className="bg-white/[0.07] backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl"
            >
              <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-indigo-200 mb-1.5">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@manmatters.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder-indigo-300/50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-indigo-200 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 pr-11 rounded-xl bg-white/10 border border-white/15 text-white placeholder-indigo-300/50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300/60 hover:text-indigo-200 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-red-500/15 border border-red-400/30 text-red-300 text-sm px-4 py-3 rounded-xl"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-brand-500 to-purple-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-brand-900/40 hover:shadow-brand-700/50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                        className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Signing in…
                    </span>
                  ) : (
                    'Enter Mission Control →'
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: showForm ? 1 : 0 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-indigo-400/50 mt-5"
        >
          Man Matters · Internal Training Platform
        </motion.p>
      </div>
    </div>
  )
}
