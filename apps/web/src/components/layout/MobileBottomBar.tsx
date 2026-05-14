import { useLocation, Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarCheck, IndianRupee, Settings2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSchool } from '@/hooks/useSchool'

interface BottomNavItem {
  label: string
  icon: LucideIcon
  href: string
  hasBadge: boolean
}

const bottomNavItems: BottomNavItem[] = [
  { label: 'Dashboard',  icon: LayoutDashboard, href: '/dashboard',  hasBadge: false },
  { label: 'Students',   icon: Users,           href: '/students',   hasBadge: true },
  { label: 'Attendance', icon: CalendarCheck,   href: '/attendance', hasBadge: false },
  { label: 'Fees',       icon: IndianRupee,     href: '/fees',       hasBadge: true },
  { label: 'Settings',   icon: Settings2,       href: '/settings',   hasBadge: false },
]

export default function MobileBottomBar() {
  const { pathname } = useLocation()
  const { data: summary } = useSchool()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  function getBadgeCount(href: string): number {
    if (href === '/students') return summary.at_risk_count
    if (href === '/fees') return summary.fee_overdue_count
    return 0
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border z-50 flex items-center justify-around px-2"
      aria-label="Mobile navigation"
    >
      {bottomNavItems.map((item) => {
        const active = isActive(item.href)
        const badgeCount = item.hasBadge ? getBadgeCount(item.href) : 0

        return (
          <Link
            key={item.href}
            to={item.href}
            className="flex flex-col items-center gap-1 flex-1 py-2"
            aria-label={item.label}
          >
            <div className="relative">
              <item.icon
                className={cn('h-6 w-6', active ? 'text-primary' : 'text-slate-500')}
                aria-hidden="true"
              />
              {item.hasBadge && badgeCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-danger rounded-full" />
              )}
            </div>
            <span className={cn('text-xs', active ? 'text-primary font-medium' : 'text-slate-500')}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
