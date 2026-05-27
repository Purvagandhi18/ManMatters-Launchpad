'use client'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { LogOut, Flame, Trophy } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { NotificationBell } from '@/components/ui/NotificationBell'

interface NavbarProps {
  user: {
    displayName: string
    totalXP: number
    level: { name: string; level: number }
    streak: number
    avatarUrl?: string | null
  }
  title?: string
}

export function Navbar({ user, title }: NavbarProps) {
  const firstName = user.displayName.split(' ')[0]
  const displayTitle = title ? `${title} ${firstName}` : firstName

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md h-14" style={{ borderBottom: '1px solid #E4DEFF' }}>
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 font-black text-base tracking-tight" style={{ color: '#1A1033' }}>
          <span className="text-lg">🚀</span>
          <span>The Launchpad</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Streak pill */}
          {user.streak > 0 && (
            <div className="hidden sm:flex items-center gap-1 text-orange-600 font-semibold text-xs bg-orange-50 border border-orange-100 rounded-full px-2.5 py-1">
              <Flame size={13} />
              <span>{user.streak}w streak</span>
            </div>
          )}

          {/* Leaderboard */}
          <Link href="/leaderboard" className="hidden sm:flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand-600 transition-colors">
            <Trophy size={13} />
            <span>Rankings</span>
          </Link>

          {/* Notification bell */}
          <NotificationBell mode="learner" />

          {/* Identity */}
          <Link href="/profile" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white text-[11px] font-black"
                    style={{ background: 'linear-gradient(135deg, #5B38F5, #7C3AED)' }}
                  >
                    {getInitials(user.displayName)}
                  </div>
                )
              }
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold leading-none" style={{ color: '#1A1033' }}>{displayTitle}</p>
              <p className="text-[10px] text-brand-500 font-semibold mt-0.5">{user.level.name}</p>
            </div>
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-gray-300 hover:text-gray-500 transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  )
}
