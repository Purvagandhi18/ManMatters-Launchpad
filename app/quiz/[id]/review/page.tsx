'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReviewOption {
  id: string
  text: string
  isCorrect: boolean
}

interface ReviewQuestion {
  id: string
  text: string
  type: string
  options: ReviewOption[]
  selectedOptionId?: string | null
  correctOptionId?: string | null
  selectedOptionIds?: string[]
  correctOptionIds?: string[]
  isCorrect: boolean | null
}

interface ReviewData {
  attemptNumber: number
  scorePct: number
  rawScore: number
  maxScore: number
  passed: boolean
  completedAt: string | null
  passThreshold: number
  subtopicTitle: string
  questions: ReviewQuestion[]
}

export default function QuizReviewPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<ReviewData | null | undefined>(undefined)

  useEffect(() => {
    fetch(`/api/quizzes/${params.id}/review`)
      .then(r => r.json())
      .then(d => setData(d))
  }, [params.id])

  if (data === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-10 w-48 rounded-xl bg-gray-200 animate-pulse" />
          <div className="h-48 rounded-2xl bg-gray-200 animate-pulse" />
          <div className="h-32 rounded-2xl bg-gray-200 animate-pulse" />
          <div className="h-32 rounded-2xl bg-gray-200 animate-pulse" />
        </div>
      </div>
    )
  }

  if (data === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center shadow-sm">
          <div className="text-5xl mb-4">📭</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No attempts found</h2>
          <p className="text-gray-500 text-sm mb-6">You haven&apos;t completed this quiz yet.</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            <ChevronLeft size={16} /> Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Back button / breadcrumb */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium mb-6 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>

        {/* Hero card */}
        <div
          className={cn(
            'rounded-2xl p-8 text-white text-center mb-6 shadow-xl relative overflow-hidden',
            data.passed
              ? 'bg-gradient-to-br from-green-500 to-emerald-600'
              : 'bg-gradient-to-br from-rose-500 to-red-600'
          )}
        >
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />

          <p className="text-white/70 text-xs uppercase tracking-widest mb-2 relative">Quiz Review</p>
          <h1 className="text-xl font-bold mb-4 relative">{data.subtopicTitle}</h1>

          <div className="flex items-center justify-center gap-8 relative">
            <div className="text-center">
              <p className="text-5xl font-black">{Math.round(data.scorePct)}<span className="text-2xl">%</span></p>
              <p className="text-white/70 text-xs mt-1">Score</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{data.rawScore}/{data.maxScore}</p>
              <p className="text-white/70 text-xs mt-1">Correct</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mt-4 relative">
            <span className={cn(
              'text-xs font-bold px-3 py-1 rounded-full',
              data.passed ? 'bg-white/20 text-white' : 'bg-white/20 text-white'
            )}>
              {data.passed ? 'PASSED' : 'NOT CLEARED'}
            </span>
            <span className="text-white/60 text-xs">Attempt #{data.attemptNumber}</span>
            {data.completedAt && (
              <span className="text-white/60 text-xs">
                {new Date(data.completedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {!data.passed && (
            <p className="text-white/70 text-sm mt-3 relative">
              Pass threshold: {data.passThreshold}%
            </p>
          )}
        </div>

        {/* Question breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Question Breakdown</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {data.questions.map((q, i) => (
              <div key={q.id} className="px-6 py-4">
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
                              'text-xs px-3 py-2 rounded-lg border',
                              isCorrect                  && 'bg-green-50 border-green-300 text-green-800 font-medium',
                              isSelected && !isCorrect   && 'bg-red-50 border-red-300 text-red-800',
                              !isCorrect && !isSelected  && 'border-gray-100 text-gray-500'
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
              </div>
            ))}
          </div>
        </div>

        {/* Bottom back button */}
        <div className="flex justify-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            <ChevronLeft size={16} /> Back
          </button>
        </div>
      </div>
    </div>
  )
}
