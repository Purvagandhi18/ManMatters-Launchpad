'use client'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { LogOut, Flame } from 'lucide-react'
import { formatXP, getInitials } from '@/lib/utils'

interface NavbarProps {
  user: {
    displayName: string
    totalXP: number
    level: { name: string; level: number }
    streak: number
  }
}

export function Navbar({ user }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 h-16">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-brand-600">
          <span>🚀</span>
          <span>The Launchpad</span>
        </Link>

        <div className="flex items-center gap-4">
          {user.streak > 0 && (
            <div className="flex items-center gap-1 text-orange-500 font-semibold text-sm">
              <Flame size={16} />
              <span>{user.streak}w streak</span>
            </div>
          )}

          <Link href="/leaderboard" className="text-sm text-gray-600 hover:text-brand-600 transition-colors hidden sm:block">
            Leaderboard
          </Link>

          <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
              {getInitials(user.displayName)}
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900 leading-none">{user.displayName}</p>
              <p className="text-xs text-brand-600 font-semibold">{user.level.name} · {formatXP(user.totalXP)} XP</p>
            </div>
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  )
}
