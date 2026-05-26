'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Navbar } from '@/components/learner/Navbar'
import { XPBar } from '@/components/ui/XPBar'
import { getInitials, formatXP } from '@/lib/utils'
import { Flame, Trophy, CheckCircle2 } from 'lucide-react'

interface BadgeData {
  id: string
  name: string
  description: string
  iconEmoji: string
  isSpecial: boolean
  earned: boolean
  earnedAt?: string | null
}

interface UserData {
  id: string
  displayName: string
  email: string
  totalXP: number
  level: { level: number; name: string; minXP: number; maxXP: number }
  streak: number
  userBadges: { badge: { name: string; iconEmoji: string } }[]
  streakRecords: { weekStartDate: string; hasActivity: boolean; streakCount: number }[]
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [badges, setBadges] = useState<BadgeData[]>([])
  const [loading, setLoading] = useState(true)

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
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg">
                {getInitials(userData.displayName)}
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
              { label: 'Level', value: `${userData.level.level} — ${userData.level.name}`, icon: <span className="text-lg">🎯</span> },
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

          {/* Streak calendar */}
          {userData.streakRecords.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Flame size={18} className="text-orange-500" /> Activity Streak
              </h2>
              <div className="flex gap-2 flex-wrap">
                {userData.streakRecords.slice(0, 12).reverse().map((record, i) => (
                  <div
                    key={i}
                    title={new Date(record.weekStartDate).toLocaleDateString()}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-semibold ${
                      record.hasActivity
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {record.hasActivity ? '🔥' : '○'}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">Each block represents one week of activity</p>
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
