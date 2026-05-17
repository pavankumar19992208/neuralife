import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, BookOpen, Sparkles, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import PageLayout from '@/components/layout/PageLayout'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/feedback/EmptyState'
import CreateExamModal from './components/CreateExamModal'
import { useExams } from '@/hooks/useExams'
import { useAuthStore } from '@/store/authStore'
import { slideUp, staggerChildren, listItem } from '@/lib/animations'
import { EXAM_TYPE_BADGE_COLORS, EXAM_STATUS_COLORS, EXAM_TYPE_SHORT } from '@/lib/examDefaults'
import { UserRole } from '@/types/common'
import type { ExamSummary } from '@/types/common'
import { cn } from '@/lib/utils'

const STATUS_TABS = [
  { key: null,            label: 'All' },
  { key: 'DRAFT',         label: 'Draft' },
  { key: 'SCHEDULED',     label: 'Scheduled' },
  { key: 'MARKS_PENDING', label: 'Marks Pending' },
  { key: 'PUBLISHED',     label: 'Published' },
]

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  const cfg = EXAM_STATUS_COLORS[status] ?? { bg: 'bg-slate-100', text: 'text-slate-600', label: status }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', cfg.bg, cfg.text)}>
      {cfg.label}
    </span>
  )
}

function MarksProgress({ entered, total }: { entered: number; total: number }) {
  const pct = total > 0 ? Math.round((entered / total) * 100) : 0
  const color = pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="space-y-1 min-w-[120px]">
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>{total > 0 ? `${entered} / ${total}` : '—'}</span>
        {total > 0 && <span>{pct}%</span>}
      </div>
      {total > 0 && (
        <div className="h-1.5 w-full rounded-full bg-slate-100">
          <div className={cn('h-1.5 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}

function ClassRangeChip({ range }: { range: string | null }) {
  if (!range) return <span className="text-xs text-slate-300">—</span>
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      Class {range}
    </span>
  )
}

function ExamRow({ exam }: { exam: ExamSummary }) {
  const navigate = useNavigate()
  const typeBadge = EXAM_TYPE_BADGE_COLORS[exam.exam_type] ?? 'bg-slate-100 text-slate-600'
  const actionLabel = exam.status === 'MARKS_PENDING' || exam.status === 'IN_PROGRESS'
    ? 'Enter Marks' : exam.status === 'PUBLISHED' ? 'View Results' : 'View'

  return (
    <motion.tr
      variants={listItem}
      className="group cursor-pointer hover:bg-surface-raised transition-colors"
      onClick={() => navigate(`/exams/${exam.id}`)}
    >
      <td className="px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span className={cn('mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-bold', typeBadge)}>
            {EXAM_TYPE_SHORT[exam.exam_type]}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">{exam.name}</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {fmtDate(exam.start_date)} – {fmtDate(exam.end_date)}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <ClassRangeChip range={exam.class_range} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm text-text-secondary">
          <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{exam.subjects_count} subject{exam.subjects_count !== 1 ? 's' : ''}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <MarksProgress entered={exam.marks_entered_count} total={exam.marks_total_count} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={exam.status} />
      </td>
      <td className="px-4 py-3 max-w-[200px]">
        {exam.ai_insight ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                  <p className="text-xs text-text-secondary truncate italic">
                    {exam.ai_insight.slice(0, 55)}{exam.ai_insight.length > 55 ? '…' : ''}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs whitespace-normal text-xs">
                {exam.ai_insight}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : <span className="text-xs text-slate-300">—</span>}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          variant="ghost" size="sm"
          className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); navigate(`/exams/${exam.id}`) }}
        >
          {actionLabel} <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </td>
    </motion.tr>
  )
}

export default function ExamsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const { role } = useAuthStore()
  const { data: exams, isLoading, isError, refetch } = useExams(statusFilter ? { status: statusFilter } : undefined)
  const canCreate = role === UserRole.PRINCIPAL || role === UserRole.SCHOOL_ADMIN

  const counts: Record<string, number> = {}
  for (const e of exams ?? []) counts[e.status] = (counts[e.status] ?? 0) + 1

  return (
    <PageLayout>
      <PageHeader
        title="Exams"
        description={`${exams?.length ?? 0} exam${(exams?.length ?? 0) !== 1 ? 's' : ''} this academic year`}
        action={canCreate ? (
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" /> Schedule Exam
          </Button>
        ) : undefined}
      />

      <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-4">
        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_TABS.map((tab) => {
            const count = tab.key === null ? (exams?.length ?? 0) : (counts[tab.key] ?? 0)
            const active = statusFilter === tab.key
            return (
              <button
                key={tab.key ?? 'all'}
                onClick={() => setStatusFilter(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/40',
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className={cn('rounded-full px-1.5 text-[10px] font-bold', active ? 'bg-primary/20' : 'bg-slate-100')}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-5 w-12 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-20" /><Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <p className="text-sm text-slate-500">Failed to load exams.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
            </div>
          ) : !exams?.length ? (
            <div className="py-16">
              <EmptyState
                icon={<BookOpen className="h-10 w-10 text-slate-300" />}
                title="No exams scheduled yet"
                description="Create your first exam to get started tracking student performance."
                action={canCreate ? (
                  <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Schedule Exam
                  </Button>
                ) : undefined}
              />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-raised text-xs text-text-secondary uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left">Exam</th>
                  <th className="px-4 py-2.5 text-left">Classes</th>
                  <th className="px-4 py-2.5 text-left">Subjects</th>
                  <th className="px-4 py-2.5 text-left">Progress</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-left">AI Insight</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <motion.tbody variants={staggerChildren} initial="initial" animate="animate" className="divide-y divide-border">
                {exams.map((exam) => <ExamRow key={exam.id} exam={exam} />)}
              </motion.tbody>
            </table>
          )}
        </div>
      </motion.div>

      {canCreate && <CreateExamModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />}
    </PageLayout>
  )
}
