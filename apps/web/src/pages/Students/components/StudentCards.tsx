import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import EmptyState from '@/components/feedback/EmptyState'
import { timeAgo } from '@/lib/timeAgo'
import { staggerChildren, listItem } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { StudentListItem } from '@/types/common'
import { Users } from 'lucide-react'

interface StudentCardsProps {
  students: StudentListItem[]
  isLoading: boolean
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function MasteryBadge({ classification }: { classification: string | null }) {
  if (!classification) return <span className="text-xs text-slate-400">No mastery data</span>
  const map: Record<string, { label: string; className: string }> = {
    MASTERED:   { label: 'Mastered',   className: 'bg-success/10 text-success' },
    GOOD:       { label: 'Good',       className: 'bg-primary/10 text-primary' },
    DEVELOPING: { label: 'Developing', className: 'bg-warning/10 text-amber-700' },
    AT_RISK:    { label: 'AT_RISK',    className: 'bg-danger/10 text-danger' },
  }
  const style = map[classification] ?? { label: classification, className: 'bg-slate-100 text-slate-600' }
  return (
    <span className={cn('text-xs font-medium rounded-full px-2 py-0.5', style.className)}>
      {style.label}
    </span>
  )
}

export default function StudentCards({ students, isLoading }: StudentCardsProps) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="rounded-xl border border-border">
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No students found"
          description="Try adjusting your filters"
        />
      </div>
    )
  }

  return (
    <motion.div
      variants={staggerChildren}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      {students.map((student) => {
        const isAtRisk = student.mastery_classification === 'AT_RISK'
        const syncDiff = student.last_sync_at
          ? (Date.now() - new Date(student.last_sync_at).getTime()) / 86_400_000
          : Infinity
        const syncClass = syncDiff >= 9 ? 'text-danger' : syncDiff >= 2 ? 'text-warning' : 'text-slate-500'

        return (
          <motion.div
            key={student.neura_id}
            variants={listItem}
            onClick={() => navigate(`/students/${student.neura_id}`)}
            className={cn(
              'rounded-xl border border-border p-4 bg-white cursor-pointer',
              'hover:shadow-md transition-shadow duration-150',
              isAtRisk && 'border-l-4 border-l-danger bg-danger/[0.03]',
            )}
            role="button"
            tabIndex={0}
            aria-label={`View ${student.full_name}'s profile`}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/students/${student.neura_id}`)}
          >
            {/* Top row */}
            <div className="flex items-start justify-between mb-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-primary">{initials(student.full_name)}</span>
              </div>
              {student.status === 'ACTIVE' ? (
                <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-success/10 text-success">
                  Active
                </span>
              ) : (
                <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-slate-100 text-slate-600">
                  {student.status}
                </span>
              )}
            </div>

            {/* Middle */}
            <p className="font-semibold text-slate-900 text-sm leading-snug">{student.full_name}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{student.neura_id}</p>
            <p className="text-xs text-slate-500 mt-1">
              Class {student.class_year}-{student.section} · {student.medium.charAt(0) + student.medium.slice(1).toLowerCase()} medium
            </p>

            {/* Bottom row */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <MasteryBadge classification={student.mastery_classification} />
              <span className={cn('text-xs', syncClass)}>
                {student.last_sync_at ? timeAgo(student.last_sync_at) : 'No SmartPad'}
              </span>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
