import { Bell, Menu, Loader2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/store/authStore'
import { useSchool } from '@/hooks/useSchool'
import { useLogout } from '@/hooks/useAuth'

const PAGE_LABELS: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/students':   'Students',
  '/teachers':   'Teachers',
  '/attendance': 'Attendance',
  '/exams':      'Exams',
  '/fees':       'Fees',
  '/salary':     'Salary',
  '/fleet':      'SmartPads',
  '/analytics':  'Analytics',
  '/sphere':     'NeuraSphere',
  '/settings':   'Settings',
}

function getPageLabel(pathname: string): string {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname]
  const match = Object.entries(PAGE_LABELS).find(
    ([key]) => key !== '/dashboard' && pathname.startsWith(key + '/'),
  )
  return match ? match[1] : 'Dashboard'
}

function getRoleInitial(role: string | null): string {
  switch (role) {
    case 'PRINCIPAL':   return 'P'
    case 'SCHOOL_ADMIN': return 'A'
    case 'TEACHER':     return 'T'
    default:            return role?.[0]?.toUpperCase() ?? 'U'
  }
}

interface HeaderProps {
  onMobileMenuOpen: () => void
}

export default function Header({ onMobileMenuOpen }: HeaderProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { role } = useAuthStore()
  const { data: summary } = useSchool()
  const logout = useLogout()

  const pageLabel = getPageLabel(pathname)
  const roleInitial = getRoleInitial(role)
  const isOnDashboard = pathname === '/dashboard'

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center px-4 gap-4 flex-shrink-0 z-10">
      {/* Mobile hamburger */}
      <button
        className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
        onClick={onMobileMenuOpen}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-slate-600" />
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        {!isOnDashboard && (
          <>
            <span className="text-slate-500 hidden sm:inline">Dashboard</span>
            <span className="text-slate-400 hidden sm:inline">/</span>
          </>
        )}
        <span className="text-slate-900 font-medium">{pageLabel}</span>
      </div>

      {/* Right section */}
      <div className="ml-auto flex items-center gap-3">
        {/* Notification bell */}
        <button
          className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-slate-600" />
          {summary.notification_unread_count > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
          )}
        </button>

        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              aria-label="User menu"
            >
              {roleInitial}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              School Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="text-danger focus:text-danger focus:bg-danger/10"
            >
              {logout.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
              )}
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
