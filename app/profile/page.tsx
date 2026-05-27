'use client'
import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Navbar } from '@/components/learner/Navbar'
import { XPBar } from '@/components/ui/XPBar'
import { getInitials, formatXP } from '@/lib/utils'
import { Flame, Trophy, CheckCircle2, Camera, Loader2 } from 'lucide-react'

interface BadgeData {
  id: string
  name: string
  description: string
  iconEmoji: string
  isSpecial: boolean
  earned: boolean
  earnedAt?: string | null
}

interface DayActivity {
  date: string
  xp: number
  count: number
  events: string[]
  level: 'high' | 'medium' | 'light' | 'none'
}

interface UserData {
  id: string
  displayName: string
  email: string
  avatarUrl?: string | null
  totalXP: number
  level: { level: number; name: string; minXP: number; maxXP: number }
  streak: number
  userBadges: { badge: { name: string; iconEmoji: string } }[]
  streakRecords: { weekStartDate: string; hasActivity: boolean; streakCount: number }[]
  dailyActivity?: DayActivity[]
}

const HEATMAP_COLORS = {
  none:   '#F3F4F6',
  light:  '#FEF9C3',
  medium: '#86EFAC',
  high:   '#22C55E',
} as const

export default function ProfilePage() {
  const { data: session } = useSession()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [badges, setBadges] = useState<BadgeData[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [heatmapTooltip, setHeatmapTooltip] = useState<{ day: DayActivity; x: number; y: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/users/me').then(r => r.json()),
      fetch('/api/badges').then(r => r.json()),
    ]).then(([u, b]) => {
      setUserData(u)
      setBadges(b)
      setLoading(false)
    })
  }, [])

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const img = new window.Image()
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        const size = 240
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
        await fetch('/api/users/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: dataUrl }),
        })
        setUserData(prev => prev ? { ...prev, avatarUrl: dataUrl } : prev)
        setUploadingPhoto(false)
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  if (loading || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading profile…</p>
      </div>
    )
  }

  const earnedBadges = badges.filter(b => b.earned)
  const lockedBadges = badges.filter(b => !b.earned)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={userData} />
      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Profile hero */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 mb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-brand-500 to-purple-600">
                  {userData.avatarUrl
                    ? <img src={userData.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : <span className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">{getInitials(userData.displayName)}</span>
                  }
                </div>
                {/* Most recently earned badge */}
                {userData.userBadges[0] && (
                  <div className="absolute -top-2 -right-2 bg-white rounded-full w-7 h-7 flex items-center justify-center text-sm shadow border border-gray-100" title={userData.userBadges[0].badge.name}>
                    {userData.userBadges[0].badge.iconEmoji}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-md hover:bg-brand-700 transition-colors disabled:opacity-60"
                  title="Change photo"
                >
                  {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold text-gray-900">{userData.displayName}</h1>
                <p className="text-gray-500 text-sm mb-3">{userData.email}</p>
                <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                  <span className="bg-brand-100 text-brand-700 text-sm px-3 py-1 rounded-full font-semibold">
                    Level {userData.level.level} · {userData.level.name}
                  </span>
                  <span className="bg-purple-100 text-purple-700 text-sm px-3 py-1 rounded-full font-semibold">
                    {formatXP(userData.totalXP)} XP
                  </span>
                  {userData.streak > 0 && (
                    <span className="bg-orange-100 text-orange-700 text-sm px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                      <Flame size={14} /> {userData.streak}-week streak
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <XPBar totalXP={userData.totalXP} />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total XP', value: formatXP(userData.totalXP), icon: <Trophy size={20} className="text-yellow-500" /> },
              { label: 'Level', value: `${userData.level.level}: ${userData.level.name}`, icon: <span className="text-lg">🎯</span> },
              { label: 'Streak', value: `${userData.streak} weeks`, icon: <Flame size={20} className="text-orange-500" /> },
              { label: 'Badges Earned', value: String(earnedBadges.length), icon: <span className="text-lg">🏅</span> },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="flex justify-center mb-2">{stat.icon}</div>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Day-wise activity heatmap */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Flame size={18} className="text-orange-500" /> Activity
            </h2>
            <p className="text-xs text-gray-400 mb-4">Last 12 weeks · hover a square to see what happened</p>

            {/* Day labels */}
            <div className="flex gap-1 mb-1">
              {['M','T','W','T','F','S','S'].map((d, i) => (
                <div key={i} className="w-3 text-center text-[9px] text-gray-300 font-medium">{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateRows: 'repeat(7, 12px)',
                gridAutoFlow: 'column',
                gap: '3px',
                width: 'fit-content',
              }}
            >
              {(userData.dailyActivity ?? []).map((day) => (
                <div
                  key={day.date}
                  onMouseEnter={(e) => {
                    const r = e.currentTarget.getBoundingClientRect()
                    setHeatmapTooltip({ day, x: r.right + 8, y: r.top })
                  }}
                  onMouseLeave={() => setHeatmapTooltip(null)}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    background: HEATMAP_COLORS[day.level],
                  }}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3">
              {([
                { color: HEATMAP_COLORS.none,   label: 'None'     },
                { color: HEATMAP_COLORS.light,  label: '1 action' },
                { color: HEATMAP_COLORS.medium, label: '2–3'      },
                { color: HEATMAP_COLORS.high,   label: '4+'       },
              ] as { color: string; label: string }[]).map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1 text-xs text-gray-400">
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block', flexShrink: 0 }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Heatmap tooltip — rendered at page level to avoid overflow clipping */}
          {heatmapTooltip && (
            <div
              style={{ position: 'fixed', left: heatmapTooltip.x, top: heatmapTooltip.y - 4, zIndex: 50, pointerEvents: 'none' }}
              className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-[200px]"
            >
              <p className="font-semibold text-gray-200 mb-1">{heatmapTooltip.day.date}</p>
              {heatmapTooltip.day.events.length > 0
                ? heatmapTooltip.day.events.map((e, i) => (
                    <p key={i} className="text-gray-400 leading-relaxed">· {e}</p>
                  ))
                : <p className="text-gray-500">No activity</p>
              }
              {heatmapTooltip.day.xp > 0 && (
                <p className="text-yellow-400 font-semibold mt-1">+{heatmapTooltip.day.xp} XP</p>
              )}
            </div>
          )}

          {/* Badges earned */}
          {earnedBadges.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-500" /> Badges Earned ({earnedBadges.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {earnedBadges.map(badge => (
                  <div key={badge.id} className={`flex flex-col items-center text-center p-4 rounded-xl border-2 ${badge.isSpecial ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}>
                    <span className="text-3xl mb-2">{badge.iconEmoji}</span>
                    <p className="text-xs font-semibold text-gray-900">{badge.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{badge.description}</p>
                    {badge.isSpecial && (
                      <span className="text-xs text-yellow-600 font-bold mt-1">✨ Special</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locked badges */}
          {lockedBadges.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4 text-gray-500">Locked Badges ({lockedBadges.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {lockedBadges.map(badge => (
                  <div key={badge.id} className="flex flex-col items-center text-center p-4 rounded-xl border-2 border-gray-100 bg-gray-50 opacity-50 grayscale">
                    <span className="text-3xl mb-2">{badge.iconEmoji}</span>
                    <p className="text-xs font-semibold text-gray-600">{badge.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{badge.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
