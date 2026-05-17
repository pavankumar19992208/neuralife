import { useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, GraduationCap, CalendarCheck, FileText,
  IndianRupee, Wallet, Tablet, BarChart3, Globe2, Settings2,
  ChevronLeft, ChevronRight, CalendarRange,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useSchool } from '@/hooks/useSchool'
import type { SchoolSummary } from '@/hooks/useSchool'

type BadgeKey = keyof Pick<
  SchoolSummary,
  'at_risk_count' | 'fee_overdue_count' | 'salary_pending_count' | 'smartpad_offline_count' | 'sphere_pending_moderation'
>

interface NavItem {
  label: string
  icon: LucideIcon
  href: string
  badge: BadgeKey | null
  badgeColor: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard',   icon: LayoutDashboard, href: '/dashboard',  badge: null, badgeColor: '' },
  { label: 'Students',    icon: Users,           href: '/students',   badge: 'at_risk_count',           badgeColor: 'bg-danger' },
  { label: 'Teachers',    icon: GraduationCap,   href: '/teachers',   badge: null, badgeColor: '' },
  { label: 'Attendance',  icon: CalendarCheck,   href: '/attendance', badge: null, badgeColor: '' },
  { label: 'Timetable',  icon: CalendarRange,   href: '/timetable',  badge: null, badgeColor: '' },
  { label: 'Exams',       icon: FileText,        href: '/exams',      badge: null, badgeColor: '' },
  { label: 'Fees',        icon: IndianRupee,     href: '/fees',       badge: 'fee_overdue_count',       badgeColor: 'bg-warning' },
  { label: 'Salary',      icon: Wallet,          href: '/salary',     badge: 'salary_pending_count',    badgeColor: 'bg-warning' },
  { label: 'SmartPads',   icon: Tablet,          href: '/fleet',      badge: 'smartpad_offline_count',  badgeColor: 'bg-warning' },
  { label: 'Analytics',   icon: BarChart3,       href: '/analytics',  badge: null, badgeColor: '' },
  { label: 'NeuraSphere', icon: Globe2,          href: '/sphere',     badge: 'sphere_pending_moderation', badgeColor: 'bg-warning' },
  { label: 'Settings',    icon: Settings2,       href: '/settings',   badge: null, badgeColor: '' },
]

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { pathname } = useLocation()
  const { school_name: authSchoolName, school_logo_url } = useAuthStore()
  const { data: summary } = useSchool()

  const schoolName = authSchoolName || summary.school_name
  const schoolLogo = school_logo_url || summary.school_logo_url
  const schoolInitial = schoolName[0]?.toUpperCase() ?? 'S'

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <motion.div
      animate={{ width: isCollapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="bg-surface border-r border-border flex flex-col h-full overflow-hidden flex-shrink-0"
    >
      {/* School branding */}
      <div className="h-16 border-b border-border flex items-center px-4 flex-shrink-0">
        {schoolLogo ? (
          <img
            src={schoolLogo}
            alt={schoolName}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-semibold">{schoolInitial}</span>
          </div>
        )}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="ml-3 text-sm font-semibold text-slate-900 whitespace-nowrap overflow-hidden"
            >
              {schoolName}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => {
          const active = isActive(item.href)
          const count = item.badge !== null ? summary[item.badge] : 0

          return (
            <Link key={item.href} to={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg mx-2 relative',
                  'border-l-[3px] transition-colors duration-150',
                  active
                    ? 'border-l-primary bg-primary/10 text-primary'
                    : 'border-l-transparent text-slate-600 hover:bg-slate-100',
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />

                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {item.badge && count > 0 && !isCollapsed && (
                  <span
                    className={cn(
                      'ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full text-white',
                      item.badgeColor,
                    )}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}

                {item.badge && count > 0 && isCollapsed && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger" />
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border py-3 flex-shrink-0">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 px-4 py-2 mx-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors duration-150"
          style={{ width: 'calc(100% - 16px)' }}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm whitespace-nowrap">Collapse</span>
            </>
          )}
        </button>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-xs text-slate-400 text-center px-4 mt-2 whitespace-nowrap"
            >
              Powered by NeuraLife
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
