import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import EmptyState from '@/components/feedback/EmptyState'
import PageLayout from '@/components/layout/PageLayout'
import { LoadingButton } from '@/components/ui/LoadingButton'
import { slideUp } from '@/lib/animations'
import { useExam, useMarksSheet, useSubmitMarks } from '@/hooks/useExams'
import type { MarksSheetStudent } from '@/types/common'
import { cn } from '@/lib/utils'

const GRADE_COLORS: Record<string, string> = {
  'A+': 'text-emerald-700', A: 'text-teal-700', B: 'text-blue-700',
  C: 'text-indigo-700', D: 'text-amber-700', F: 'text-red-600',
}

function computeGrade(pct: number): string {
  if (pct >= 90) return 'A+'
  if (pct >= 75) return 'A'
  if (pct >= 60) return 'B'
  if (pct >= 50) return 'C'
  if (pct >= 35) return 'D'
  return 'F'
}

export default function MarksEntryPage() {
  const { examId } = useParams<{ examId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const subjectId = searchParams.get('subject_id') ?? ''

  const { data: exam } = useExam(examId)
  const { data: sheet, isLoading, isError, refetch } = useMarksSheet(examId, subjectId)

  // Local state for editing
  const [rows, setRows] = useState<Array<MarksSheetStudent & { isDirty: boolean }>>([])
  const [saved, setSaved] = useState(false)

  const submitMut = useSubmitMarks(examId!)

  useEffect(() => {
    if (sheet) {
      setRows(
        sheet.students.map((s) => ({ ...s, isDirty: false })),
      )
    }
  }, [sheet])

  const updateRow = (i: number, updates: Partial<MarksSheetStudent>) => {
    setSaved(false)
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== i) return r
        const updated = { ...r, ...updates, isDirty: true }
        // Recalculate grade preview
        if (updates.marks_obtained !== undefined && sheet) {
          const maxMarks = sheet.subject.max_marks
          const pct = updates.marks_obtained != null
            ? (updates.marks_obtained / maxMarks) * 100
            : null
          updated.percentage = pct != null ? Math.round(pct * 100) / 100 : null
          updated.grade = pct != null ? computeGrade(pct) : null
        }
        if (updates.is_absent) {
          updated.marks_obtained = null
          updated.percentage = null
          updated.grade = 'AB'
        }
        return updated
      }),
    )
  }

  const handleSubmit = () => {
    if (!sheet || !examId) return
    const marks = rows.map((r) => ({
      neura_id: r.neura_id,
      marks_obtained: r.is_absent ? null : r.marks_obtained,
      is_absent: r.is_absent,
    }))
    submitMut.mutate(
      { exam_subject_id: sheet.subject.id, marks },
      {
        onSuccess: () => {
          setSaved(true)
          void refetch()
        },
      },
    )
  }

  const subject = exam?.subjects.find((s) => s.id === subjectId) ?? sheet?.subject
  const maxMarks = subject?.max_marks ?? 100

  return (
    <PageLayout>
      <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/exams/${examId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              {exam?.name ?? 'Exam'} — Marks Entry
            </h1>
            {subject && (
              <p className="text-sm text-text-secondary">
                {subject.subject} · Class {subject.class_year}
                {subject.section ? ` — Section ${subject.section}` : ''} · Max: {maxMarks} marks
              </p>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : isError || !sheet ? (
          <EmptyState
            icon={<AlertCircle className="h-8 w-8 text-danger" />}
            title="Could not load marks sheet"
            action={<Button onClick={() => refetch()}>Try again</Button>}
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-raised text-xs font-semibold text-text-secondary">
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">NeuraID</th>
                    <th className="px-4 py-3 text-center">Absent</th>
                    <th className="px-4 py-3 text-right">Marks / {maxMarks}</th>
                    <th className="px-4 py-3 text-right">%</th>
                    <th className="px-4 py-3 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.neura_id}
                      className={cn(
                        'border-b border-border last:border-0 transition-colors',
                        row.is_absent && 'bg-slate-50',
                        row.isDirty && 'bg-blue-50/30',
                      )}
                    >
                      <td className="px-4 py-2.5 text-text-secondary">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium">{row.full_name}</td>
                      <td className="px-4 py-2.5 text-xs text-text-secondary">{row.neura_id}</td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded accent-primary"
                          checked={row.is_absent}
                          onChange={(e) => updateRow(i, { is_absent: e.target.checked })}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Input
                          type="number"
                          min={0}
                          max={maxMarks}
                          step={0.5}
                          className={cn(
                            'ml-auto w-20 text-right text-sm',
                            row.is_absent && 'opacity-40 cursor-not-allowed',
                          )}
                          disabled={row.is_absent}
                          value={row.marks_obtained ?? ''}
                          placeholder="—"
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Number(e.target.value)
                            updateRow(i, { marks_obtained: val })
                          }}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-text-secondary">
                        {row.is_absent ? '—' : row.percentage != null ? `${row.percentage.toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {row.is_absent ? (
                          <span className="text-xs text-slate-400">AB</span>
                        ) : row.grade ? (
                          <span className={cn('text-xs font-bold', GRADE_COLORS[row.grade] ?? 'text-slate-600')}>
                            {row.grade}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Save bar */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
              <div>
                <p className="text-sm font-medium">
                  {rows.filter((r) => r.marks_obtained != null || r.is_absent).length} / {rows.length} students entered
                </p>
                {saved && (
                  <p className="flex items-center gap-1 text-xs text-green-700">
                    <CheckCircle className="h-3 w-3" /> Saved successfully
                  </p>
                )}
                {submitMut.isError && (
                  <p className="flex items-center gap-1 text-xs text-danger">
                    <AlertCircle className="h-3 w-3" /> Failed to save
                  </p>
                )}
              </div>
              <LoadingButton
                loading={submitMut.isPending}
                onClick={handleSubmit}
                className="gap-2"
                disabled={rows.filter((r) => r.isDirty).length === 0}
              >
                <Save className="h-4 w-4" />
                Save Marks
              </LoadingButton>
            </div>
          </>
        )}
      </motion.div>
    </PageLayout>
  )
}
