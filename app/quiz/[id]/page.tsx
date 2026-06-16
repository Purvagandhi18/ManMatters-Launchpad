'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, ArrowRight, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { LevelUpOverlay } from '@/components/ui/LevelUpOverlay'
import { BadgeUnlockModal } from '@/components/ui/BadgeUnlockModal'
import { useConfetti } from '@/components/ui/ConfettiCannon'
import { getLevelFromXP } from '@/lib/gamification'

interface AnswerOption { id: string; text: string; sortOrder: number }
interface QuestionData  { id: string; text: string; type: string; points: number; options: AnswerOption[] }
interface QuizData {
  id: string
  status: string
  passThreshold: number
  subtopic: { id: string; title: string }
  questions: QuestionData[]
}
interface QuizResult {
  attemptId: string
  scorePct: number
  rawScore: number
  maxScore: number
  passed: boolean
  badgesEarned?: { id: string; name: string; iconEmoji: string; description?: string }[]
  questions: {
    id: string; text: string; type: string; options: AnswerOption[]
    correctOptionId?: string; selectedOptionId?: string; correctOptionIds?: string[]; selectedOptionIds?: string[]; isCorrect?: boolean | null
  }[]
}

type Phase = 'loading' | 'taking' | 'result'

// Animated score counter
function CountUp({ target, duration = 1200 }: { target: number; duration?: number }) {
  const raw = useMotionValue(0)
  const spring = useSpring(raw, { stiffness: 50, damping: 16 })
  const displayed = useTransform(spring, (v) => Math.round(v))
  useEffect(() => { raw.set(target) }, [target, raw])
  return <motion.span>{displayed}</motion.span>
}

// XP gain badge
function XPBadge({ xp, show }: { xp: number; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.9 }}
          className="inline-flex items-center gap-1.5 bg-white/25 text-white text-base font-bold px-4 py-2 rounded-full shadow-lg mt-2"
        >
          <Zap size={15} className="text-yellow-300" />
          +{xp} XP earned
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function QuizPage() {
  const params    = useParams()
  const router    = useRouter()
  const fireConfetti = useConfetti()

  const [quiz, setQuiz]           = useState<QuizData | null>(null)
  const [phase, setPhase]         = useState<Phase>('loading')
  const [answers, setAnswers]     = useState<Record<string, string | string[]>>({})
  const [currentQ, setCurrentQ]   = useState(0)
  const [result, setResult]       = useState<QuizResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [attemptBlocked, setAttemptBlocked] = useState(false)

  // Level-up detection
  const [xpBefore, setXPBefore]   = useState<number | null>(null)
  const [levelUp, setLevelUp]     = useState<{ name: string; number: number } | null>(null)
  const [showXPBadge, setShowXPBadge] = useState(false)
  const [unlockedBadge, setUnlockedBadge] = useState<{ name: string; description: string; iconEmoji: string } | null>(null)
  const [badgeQueue, setBadgeQueue] = useState<{ name: string; description: string; iconEmoji: string }[]>([])

  useEffect(() => {
    // Capture XP before quiz
    fetch('/api/users/me').then(r => r.json()).then(u => setXPBefore(u.totalXP))
    fetch(`/api/quizzes/${params.id}`)
      .then(r => r.json())
      .then(data => { setQuiz(data); setPhase('taking') })
  }, [params.id])

  function selectAnswer(questionId: string, optionId: string, isMulti: boolean) {
    if (isMulti) {
      setAnswers(prev => {
        const current = (prev[questionId] as string[]) || []
        const next = current.includes(optionId)
          ? current.filter(id => id !== optionId)
          : [...current, optionId]
        return { ...prev, [questionId]: next }
      })
    } else {
      setAnswers(prev => ({ ...prev, [questionId]: optionId }))
    }
  }

  async function submitQuiz() {
    if (!quiz) return
    setSubmitting(true)
    const res = await fetch(`/api/quizzes/${params.id}/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    })
    if (res.status === 403) {
      setAttemptBlocked(true)
      setSubmitting(false)
      return
    }
    const data: QuizResult = await res.json()
    setResult(data)
    setPhase('result')
    setSubmitting(false)

    if (data.passed) {
      setTimeout(() => fireConfetti('medium'), 800)

      // Show badge unlock modals (queue them)
      if (data.badgesEarned?.length) {
        const badges = data.badgesEarned.map((b: any) => ({
          name: b.name,
          description: b.description ?? '',
          iconEmoji: b.iconEmoji,
        }))
        setTimeout(() => {
          setBadgeQueue(badges.slice(1))
          setUnlockedBadge(badges[0])
        }, 1400)
      }

      // Check for level-up
      setTimeout(async () => {
        setShowXPBadge(true)
        const after = await fetch('/api/users/me').then(r => r.json())
        if (xpBefore !== null) {
          const levelBefore = getLevelFromXP(xpBefore)
          const levelAfter  = getLevelFromXP(after.totalXP)
          if (levelAfter.level > levelBefore.level) {
            setTimeout(() => setLevelUp({ name: levelAfter.name, number: levelAfter.level }), 1200)
          }
        }
      }, 600)
    }
  }

  // ── Result screen ─────────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    const xpEarned = result.passed
      ? result.scorePct >= 95 ? 150 : result.scorePct >= 90 ? 120 : 100
      : 0

    return (
      <>
        <LevelUpOverlay
          open={!!levelUp}
          levelName={levelUp?.name ?? ''}
          levelNumber={levelUp?.number ?? 1}
          onClose={() => setLevelUp(null)}
        />
        <BadgeUnlockModal
          open={!!unlockedBadge}
          badge={unlockedBadge}
          onClose={() => {
            // Dequeue next badge if any
            if (badgeQueue.length > 0) {
              setUnlockedBadge(badgeQueue[0])
              setBadgeQueue(q => q.slice(1))
            } else {
              setUnlockedBadge(null)
            }
          }}
        />

        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-2xl mx-auto">

            {/* Result hero */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              className={cn(
                'rounded-2xl p-8 text-white text-center mb-6 shadow-xl relative overflow-hidden',
                result.passed
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-gradient-to-br from-rose-500 to-red-600'
              )}
            >
              {/* Subtle pattern */}
              <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
              />

              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 360, damping: 20, delay: 0.1 }}
                className="text-6xl mb-3 relative"
              >
                {result.passed ? '🎉' : '😓'}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-2xl font-bold mb-1 relative"
              >
                {result.passed ? 'Quiz Passed!' : 'Not quite there'}
              </motion.h1>

              {/* Animated score */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35, type: 'spring', stiffness: 280 }}
                className="flex items-center justify-center gap-8 mt-4 relative"
              >
                <div className="text-center">
                  <p className="text-5xl font-black">
                    <CountUp target={Math.round(result.scorePct)} />
                    <span className="text-2xl">%</span>
                  </p>
                  <p className="text-white/70 text-xs mt-1">Score</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {result.rawScore}/{result.maxScore}
                  </p>
                  <p className="text-white/70 text-xs mt-1">Correct</p>
                </div>
              </motion.div>

              {/* XP badge */}
              {result.passed && (
                <div className="flex justify-center mt-1 relative">
                  <XPBadge xp={xpEarned} show={showXPBadge} />
                </div>
              )}

              {!result.passed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-white/80 text-sm mt-3 relative"
                >
                  You need {quiz?.passThreshold ?? 80}% to pass. Review the materials and try again.
                </motion.p>
              )}
            </motion.div>

            {/* Question breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, type: 'spring', stiffness: 200, damping: 24 }}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6"
            >
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Question Breakdown</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {result.questions.map((q, i) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.06 }}
                    className="px-6 py-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {q.isCorrect === true
                          ? <CheckCircle2 size={18} className="text-green-500" />
                          : <XCircle size={18} className="text-red-500" />
                        }
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-2">{i + 1}. {q.text}</p>
                        <div className="space-y-1.5">
                          {q.options.map(opt => {
                            const isCorrect  = q.type === 'multi_select'
                              ? (q.correctOptionIds ?? []).includes(opt.id)
                              : opt.id === q.correctOptionId
                            const isSelected = q.type === 'multi_select'
                              ? (q.selectedOptionIds ?? []).includes(opt.id)
                              : opt.id === q.selectedOptionId
                            return (
                              <div
                                key={opt.id}
                                className={cn(
                                  'text-xs px-3 py-2 rounded-lg border transition-colors',
                                  isCorrect                    && 'bg-green-50 border-green-300 text-green-800 font-medium',
                                  isSelected && !isCorrect    && 'bg-red-50 border-red-300 text-red-800',
                                  !isCorrect && !isSelected   && 'border-gray-100 text-gray-500'
                                )}
                              >
                                {opt.text}
                                {isCorrect && ' ✓'}
                                {isSelected && !isCorrect && ' ✗'}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex gap-3"
            >
              {!result.passed && (
                <p className="text-xs text-gray-400 text-center py-1 flex-1 self-center">
                  Contact your admin to request a retry.
                </p>
              )}
              <Button onClick={() => router.back()} className="flex-1">
                <ArrowRight size={16} className="mr-2" />
                {result.passed ? 'Continue' : 'Back to Week'}
              </Button>
            </motion.div>
          </div>
        </div>
      </>
    )
  }

  // ── Attempt blocked ───────────────────────────────────────────────────────
  if (attemptBlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center shadow-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Attempt Limit Reached</h2>
          <p className="text-gray-500 text-sm mb-6">
            You&apos;ve used your attempt for this quiz. Contact your admin if you need another try.
          </p>
          <Button onClick={() => router.back()} className="w-full">Back to Week</Button>
        </div>
      </div>
    )
  }

  // ── Taking phase ──────────────────────────────────────────────────────────
  if (!quiz || phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 rounded-full"
          style={{ border: '3px solid #e0e7ff', borderTopColor: '#4f46e5' }}
        />
      </div>
    )
  }

  const question     = quiz.questions[currentQ]
  const totalQ       = quiz.questions.length
  const allAnswered  = quiz.questions.every(q => {
    const a = answers[q.id]
    if (!a) return false
    return Array.isArray(a) ? a.length > 0 : true
  })

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Progress header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Quiz</p>
              <h1 className="font-bold text-gray-900">{quiz.subtopic.title}</h1>
            </div>
            <span className="text-sm text-gray-500 font-medium">{currentQ + 1} / {totalQ}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #6366f1, #7c3aed)' }}
              animate={{ width: `${((currentQ + 1) / totalQ) * 100}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            />
          </div>
        </motion.div>

        {/* Question card — slides on question change */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 mb-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                Question {currentQ + 1}
              </span>
              <span className="text-xs text-gray-400 capitalize">{question.type.replace('_', ' ')}</span>
            </div>

            <h2 className="text-lg font-semibold text-gray-900 mb-6 leading-snug">{question.text}</h2>

            <div className="space-y-3">
              {question.type === 'multi_select' && (
                <p className="text-xs text-gray-400 -mt-2 mb-1">Select all that apply</p>
              )}
              {question.options.map((opt) => {
                const isMulti = question.type === 'multi_select'
                const isSelected = isMulti
                  ? ((answers[question.id] as string[]) || []).includes(opt.id)
                  : answers[question.id] === opt.id
                return (
                  <motion.button
                    key={opt.id}
                    onClick={() => selectAnswer(question.id, opt.id, isMulti)}
                    whileHover={{ scale: 1.015, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    animate={isSelected
                      ? { borderColor: '#4f46e5', backgroundColor: '#eef2ff' }
                      : { borderColor: '#e5e7eb', backgroundColor: '#ffffff' }
                    }
                    transition={{ duration: 0.15 }}
                    className={cn(
                      'w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-colors flex items-center gap-3',
                      isSelected ? 'text-brand-700' : 'text-gray-700'
                    )}
                  >
                    {isMulti && (
                      <span className={cn(
                        'w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center text-[10px]',
                        isSelected ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-300'
                      )}>
                        {isSelected && '✓'}
                      </span>
                    )}
                    {opt.text}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="secondary" size="sm"
            onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
            disabled={currentQ === 0}
          >
            <ChevronLeft size={16} /> Previous
          </Button>

          <div className="flex gap-1">
            {quiz.questions.map((q, i) => (
              <motion.button
                key={q.id}
                onClick={() => setCurrentQ(i)}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  'w-7 h-7 rounded-full text-xs font-bold transition-colors',
                  i === currentQ
                    ? 'bg-brand-600 text-white'
                    : (Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).length > 0 : !!answers[q.id])
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-500'
                )}
              >
                {i + 1}
              </motion.button>
            ))}
          </div>

          {currentQ < totalQ - 1 ? (
            <Button variant="secondary" size="sm" onClick={() => setCurrentQ(q => Math.min(totalQ - 1, q + 1))}>
              Next <ChevronRight size={16} />
            </Button>
          ) : (
            <motion.div whileHover={{ scale: allAnswered ? 1.03 : 1 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="sm"
                onClick={submitQuiz}
                disabled={!allAnswered || submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                      className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Grading…
                  </span>
                ) : 'Submit Quiz'}
              </Button>
            </motion.div>
          )}
        </div>

        {!allAnswered && (
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-center text-xs text-gray-400 mt-3"
          >
            {quiz.questions.filter(q => { const a = answers[q.id]; return !a || (Array.isArray(a) && a.length === 0) }).length} question{quiz.questions.filter(q => { const a = answers[q.id]; return !a || (Array.isArray(a) && a.length === 0) }).length !== 1 ? 's' : ''} remaining
          </motion.p>
        )}
      </div>
    </div>
  )
}
