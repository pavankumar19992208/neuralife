import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import EmptyState from '@/components/feedback/EmptyState'
import { timeAgo } from '@/lib/timeAgo'
import { staggerChildren, listItem } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { StudentListItem } from '@/types/common'
import { Users } from 'lucide-react'

interface StudentTableProps {
  students: StudentListItem[]
  isLoading: boolean
}

function MasteryBadge({ classification }: { classification: string | null }) {
  if (!classification) return <span className="text-xs text-slate-400">No data</span>
  const map: Record<string, { label: string; className: string }> = {
    MASTERED: { label: 'Mastered', className: 'bg-success/10 text-success border-success/20' },
    GOOD:     { label: 'Good',     className: 'bg-primary/10 text-primary border-primary/20' },
    DEVELOPING: { label: 'Developing', className: 'bg-warning/10 text-amber-700 border-warning/20' },
    AT_RISK:  { label: 'AT_RISK',  className: 'bg-danger/10 text-danger border-danger/20' },
  }
  const style = map[classification] ?? { label: classification, className: 'bg-slate-100 text-slate-600' }
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', style.className)}>
      {style.label}
    </span>
  )
}

function SyncText({ lastSyncAt }: { lastSyncAt: string | null }) {
  if (!lastSyncAt) return <span className="text-xs text-slate-400">Never</span>
  const diff = Date.now() - new Date(lastSyncAt).getTime()
  const days = diff / 86_400_000
  const cls = days >= 9 ? 'text-danger' : days >= 2 ? 'text-warning' : 'text-slate-500'
  return <span className={cn('text-xs', cls)}>{timeAgo(lastSyncAt)}</span>
}

export default function StudentTable({ students, isLoading }: StudentTableProps) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm" aria-label="Students loading">
          <thead className="bg-slate-50 border-b border-border">
            <tr>
              {['Name', 'Class', 'Status', 'Mastery', 'Last Sync', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4 py-3"><Skeleton className="h-8 w-14 rounded-md" /></td>
              </tr>
            ))}
          </tbody>
        </table>
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
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm" aria-label="Students">
        <thead className="bg-slate-50 border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Class</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Mastery</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Sync</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <motion.tbody variants={staggerChildren} initial="initial" animate="animate">
          {students.map((student) => {
            const isAtRisk = student.mastery_classification === 'AT_RISK'
            return (
              <motion.tr
                key={student.neura_id}
                variants={listItem}
                className={cn(
                  'border-b border-border last:border-0 hover:bg-slate-50 transition-colors',
                  isAtRisk && 'border-l-4 border-l-danger bg-danger/[0.03]',
                )}
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{student.full_name}</p>
                  <p className="text-xs text-slate-400 font-mono">{student.neura_id}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  Class {student.class_year}-{student.section}
                </td>
                <td className="px-4 py-3">
                  {student.status === 'ACTIVE' ? (
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-success/10 text-success border-success/20">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 border-slate-200">
                      {student.status}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <MasteryBadge classification={student.mastery_classification} />
                </td>
                <td className="px-4 py-3">
                  <SyncText lastSyncAt={student.last_sync_at} />
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/students/${student.neura_id}`)}
                    aria-label={`View ${student.full_name}'s profile`}
                  >
                    View
                  </Button>
                </td>
              </motion.tr>
            )
          })}
        </motion.tbody>
      </table>
    </div>
  )
}
