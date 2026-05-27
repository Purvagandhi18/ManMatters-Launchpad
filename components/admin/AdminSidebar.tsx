'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Sliders,
  Trophy,
  ArrowLeft,
} from 'lucide-react'
import { NotificationBell } from '@/components/ui/NotificationBell'

const links = [
  { href: '/admin/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/curriculum', label: 'Curriculum',  icon: BookOpen },
  { href: '/admin/progress',   label: 'Progress',    icon: Users },
  { href: '/admin/overrides',  label: 'Overrides',   icon: Sliders },
  { href: '/leaderboard',      label: 'Leaderboard', icon: Trophy },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-gray-900 text-white flex flex-col z-40">
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2 font-bold text-lg">
            <span>🚀</span>
            <span className="text-white">The Launchpad</span>
          </Link>
          {/* Admin bell — white tinted version */}
          <div className="[&_button]:text-gray-400 [&_button:hover]:text-white [&_button:hover]:bg-gray-700">
            <NotificationBell mode="admin" />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">Admin Panel</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href) || pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={18} />
          Learner view
        </Link>
      </div>
    </aside>
  )
}
