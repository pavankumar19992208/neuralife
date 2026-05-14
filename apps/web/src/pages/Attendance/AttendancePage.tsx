import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarCheck, AlertCircle, Calendar, ClipboardList, BarChart2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/LoadingButton'
import PageLayout from '@/components/layout/PageLayout'
import PageHeader from '@/components/layout/PageHeader'
import { slideUp } from '@/lib/animations'
import { useClassAttendance, useMarkAttendance } from '@/hooks/useAttendance'
import { APIError } from '@/lib/api'
import { AttendanceStudentRow } from './components/AttendanceStudentRow'
import type { AttendanceStatus } from '@/types/common'

// ─── Helpers ──────────────────────────────────────────────────────────────

function todayIST(): string {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  return ist.toISOString().split('T')[0]
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Sub-components ───────────────────────────────────────────────────────

function ClassSelector({
  classYear,
  section,
  date,
  onClassYear,
  onSection,
  onDate,
  viewMode,
  onViewMode,
}: {
  classYear: number | null
  section: string | null
  date: string
  onClassYear: (v: number | null) => void
  onSection: (v: string | null) => void
  onDate: (v: string) => void
  viewMode: 'mark' | 'calendar'
  onViewMode: (v: 'mark' | 'calendar') => void
}) {
  const today = todayIST()

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white border border-border rounded-xl p-4 shadow-sm">
      {/* Class */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-text-secondary whitespace-nowrap">Class</label>
        <select
          value={classYear ?? ''}
          onChange={(e) => onClassYear(e.target.value ? Number(e.target.value) : null)}
          className="text-sm border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          aria-label="Select class year"
        >
          <option value="">Select</option>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              Class {n}
            </option>
          ))}
        </select>
      </div>

      {/* Section */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-text-secondary">Section</label>
        <select
          value={section ?? ''}
          onChange={(e) => onSection(e.target.value || null)}
          className="text-sm border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          aria-label="Select section"
        >
          <option value="">Select</option>
          {['A', 'B', 'C', 'D', 'E', 'F'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-text-secondary">Date</label>
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => onDate(e.target.value)}
          className="text-sm border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          aria-label="Select date"
        />
      </div>

      {/* View toggle */}
      <div className="ml-auto flex items-center gap-1 bg-surface-raised rounded-lg p-1">
        <button
          type="button"
          onClick={() => onViewMode('mark')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'mark'
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary'
          }`}
          aria-pressed={viewMode === 'mark'}
        >
          <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
          Mark
        </button>
        <button
          type="button"
          onClick={() => onViewMode('calendar')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'calendar'
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary'
          }`}
          aria-pressed={viewMode === 'calendar'}
        >
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          Calendar
        </button>
      </div>
    </div>
  )
}

function StudentListSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
      <div className="h-12 bg-surface-raised border-b border-border" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-10 rounded-lg" />
            <Skeleton className="h-8 w-10 rounded-lg" />
            <Skeleton className="h-8 w-10 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const navigate = useNavigate()
  const [classYear, setClassYear] = useState<number | null>(null)
  const [section, setSection] = useState<string | null>(null)
  const [date, setDate] = useState(todayIST())
  const [viewMode, setViewMode] = useState<'mark' | 'calendar'>('mark')
  const [overrides, setOverrides] = useState<Map<string, { status: AttendanceStatus; reason?: string }>>(new Map())
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useClassAttendance(classYear, section, date)
  const markMutation = useMarkAttendance()

  // Reset overrides when class/section/date changes
  const handleClassYear = (v: number | null) => { setClassYear(v); setOverrides(new Map()); setSubmitError(null) }
  const handleSection = (v: string | null) => { setSection(v); setOverrides(new Map()); setSubmitError(null) }
  const handleDate = (v: string) => { setDate(v); setOverrides(new Map()); setSubmitError(null) }

  const handleStatusChange = useCallback(
    (neuraId: string, status: AttendanceStatus, reason?: string) => {
      setOverrides((prev) => {
        const next = new Map(prev)
        if (status === 'PRESENT') {
          next.delete(neuraId)
        } else {
          next.set(neuraId, { status, reason })
        }
        return next
      })
    },
    [],
  )

  // Running counts — PRESENT is default for all enrolled
  const counts = useMemo(() => {
    const allStudents = data?.enrolled_students ?? []
    const acc: Record<AttendanceStatus, number> = {
      PRESENT: 0, ABSENT: 0, LATE: 0, APPROVED_LEAVE: 0,
    }
    for (const s of allStudents) {
      const status = overrides.get(s.neura_id)?.status ?? 'PRESENT'
      acc[status] = (acc[status] ?? 0) + 1
    }
    return acc
  }, [data, overrides])

  const canSubmit =
    !isLoading &&
    !markMutation.isPending &&
    !!classYear &&
    !!section &&
    (data?.enrolled_students.length ?? 0) > 0

  const handleSubmit = () => {
    if (!classYear || !section || !data) return
    setSubmitError(null)

    const records = (data.enrolled_students).map((s) => {
      const override = overrides.get(s.neura_id)
      return {
        neura_id: s.neura_id,
        status: override?.status ?? 'PRESENT' as AttendanceStatus,
        ...(override?.reason ? { reason: override.reason } : {}),
      }
    })

    markMutation.mutate(
      { class_year: classYear, section, date, records },
      {
        onError: (err) => {
          if (err instanceof APIError && err.details?.already_marked) {
            setSubmitError('Attendance already submitted for this class and date.')
          } else {
            setSubmitError('Failed to submit. Please try again.')
          }
        },
      },
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title="Attendance"
        description="Mark and review daily class attendance"
        action={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => navigate('/attendance/analytics')}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            View Analytics
          </Button>
        }
      />

      <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-4">
        <ClassSelector
          classYear={classYear}
          section={section}
          date={date}
          onClassYear={handleClassYear}
          onSection={handleSection}
          onDate={handleDate}
          viewMode={viewMode}
          onViewMode={setViewMode}
        />

        {viewMode === 'mark' && (
          <MarkView
            classYear={classYear}
            section={section}
            date={date}
            data={data}
            isLoading={isLoading}
            isError={isError}
            refetch={refetch}
            overrides={overrides}
            counts={counts}
            canSubmit={canSubmit}
            isPending={markMutation.isPending}
            submitError={submitError}
            onStatusChange={handleStatusChange}
            onSubmit={handleSubmit}
          />
        )}

        {viewMode === 'calendar' && (
          <CalendarView classYear={classYear} section={section} />
        )}
      </motion.div>
    </PageLayout>
  )
}

// ─── Mark View ─────────────────────────────────────────────────────────────

function MarkView({
  classYear, section, date, data, isLoading, isError, refetch,
  overrides, counts, canSubmit, isPending, submitError, onStatusChange, onSubmit,
}: {
  classYear: number | null
  section: string | null
  date: string
  data: import('@/types/common').ClassAttendanceResponse | undefined
  isLoading: boolean
  isError: boolean
  refetch: () => void
  overrides: Map<string, { status: AttendanceStatus; reason?: string }>
  counts: Record<AttendanceStatus, number>
  canSubmit: boolean
  isPending: boolean
  submitError: string | null
  onStatusChange: (neuraId: string, status: AttendanceStatus, reason?: string) => void
  onSubmit: () => void
}) {
  if (!classYear || !section) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 rounded-xl border border-border bg-white p-12 text-center">
        <CalendarCheck className="h-12 w-12 text-text-muted" aria-hidden="true" />
        <div>
          <p className="font-semibold text-text-primary">Select a class and section</p>
          <p className="text-sm text-text-muted mt-1">Choose a class year and section to mark attendance</p>
        </div>
      </div>
    )
  }

  if (isLoading) return <StudentListSkeleton />

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4 rounded-xl border border-border bg-white p-12 text-center">
        <AlertCircle className="h-10 w-10 text-danger" aria-hidden="true" />
        <p className="text-sm text-text-secondary">Could not load class data. Check your connection.</p>
        <Button onClick={refetch}>Try again</Button>
      </div>
    )
  }

  if (!data || data.enrolled_students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4 rounded-xl border border-border bg-white p-12 text-center">
        <CalendarCheck className="h-10 w-10 text-text-muted" aria-hidden="true" />
        <p className="text-sm text-text-secondary">No students enrolled in Class {classYear}-{section}</p>
      </div>
    )
  }

  // Already marked — show read-only view
  if (data.already_marked) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl bg-warning/10 border border-warning/30 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-warning flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-warning">Attendance already submitted</p>
            <p className="text-xs text-warning/80 mt-0.5">
              Class {classYear}-{section} · {formatDateDisplay(date)} · You can correct individual records below
            </p>
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2 px-1">
          <Badge className="bg-success/10 text-success border-success/30">
            {data.summary.present} Present
          </Badge>
          <Badge className="bg-danger/10 text-danger border-danger/30">
            {data.summary.absent} Absent
          </Badge>
          {data.summary.late > 0 && (
            <Badge className="bg-warning/10 text-warning border-warning/30">
              {data.summary.late} Late
            </Badge>
          )}
          <Badge variant="secondary">{data.summary.total} Total</Badge>
        </div>

        <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
          {data.records.map((record) => (
            <AttendanceStudentRow
              key={record.neura_id}
              student={{ neura_id: record.neura_id, full_name: record.full_name }}
              status={record.correction?.corrected_status ?? record.status}
              readOnly
              existingRecord={record}
              onStatusChange={() => {}}
            />
          ))}
        </div>
      </div>
    )
  }

  // Not yet marked — interactive marking
  const total = data.enrolled_students.length

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
      {/* Sticky count strip */}
      <div className="flex items-center gap-5 px-4 py-3 bg-white border-b border-border sticky top-0 z-10">
        <span className="text-sm font-semibold text-success">
          {counts.PRESENT ?? 0} Present
        </span>
        <span className="text-sm font-semibold text-danger">
          {counts.ABSENT ?? 0} Absent
        </span>
        <span className="text-sm font-semibold text-warning">
          {counts.LATE ?? 0} Late
        </span>
        <span className="text-sm text-text-muted ml-auto">{total} Total</span>
      </div>

      {/* Student list */}
      {data.enrolled_students.map((student) => {
        const override = overrides.get(student.neura_id)
        return (
          <AttendanceStudentRow
            key={student.neura_id}
            student={student}
            status={override?.status ?? 'PRESENT'}
            reason={override?.reason}
            onStatusChange={(status, reason) => onStatusChange(student.neura_id, status, reason)}
          />
        )
      })}

      {/* Sticky submit bar */}
      <div className="sticky bottom-0 bg-white border-t border-border px-4 py-3 flex items-center justify-between gap-4">
        <div className="text-sm text-text-muted">
          {counts.PRESENT ?? 0}P · {counts.ABSENT ?? 0}A · {counts.LATE ?? 0}L
          {submitError && (
            <span className="ml-3 text-danger text-xs">{submitError}</span>
          )}
        </div>
        <LoadingButton
          loading={isPending}
          disabled={!canSubmit}
          onClick={onSubmit}
          className="bg-primary hover:bg-primary/90"
        >
          Submit Attendance
        </LoadingButton>
      </div>
    </div>
  )
}

// ─── Calendar View ─────────────────────────────────────────────────────────

function CalendarView({
  classYear,
  section,
}: {
  classYear: number | null
  section: string | null
}) {
  if (!classYear || !section) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4 rounded-xl border border-border bg-white p-12 text-center">
        <Calendar className="h-10 w-10 text-text-muted" aria-hidden="true" />
        <p className="text-sm text-text-secondary">Select a class and section to view the calendar</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-text-secondary text-center">
        Calendar view — coming in next iteration (monthly class-level heatmap)
      </p>
      <p className="text-xs text-text-muted text-center mt-1">
        Class {classYear}-{section} monthly stats will appear here
      </p>
    </div>
  )
}
