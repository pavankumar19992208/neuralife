import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, ChevronRight, ChevronLeft, Check, Loader2,
  BookOpen, AlertCircle, Sparkles, CalendarDays, LayoutGrid, User,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LoadingButton } from '@/components/ui/LoadingButton'
import {
  useCreateExam, useChapters, useAutoSelectChapters, useSubjectsForGrade, useBatchPrepare,
} from '@/hooks/useExams'
import {
  EXAM_TYPE_LABELS, BOARDS_LIST, buildExamName, getDefaultMarks,
} from '@/lib/examDefaults'
import type { ExamType, ExamSubjectInput, BatchClassSection } from '@/types/common'
import { cn } from '@/lib/utils'
import BatchGanttStep from './BatchGanttStep'

const EXAM_TYPES: ExamType[] = ['FA1', 'FA2', 'FA3', 'FA4', 'SA1', 'SA2', 'UNIT_TEST', 'PTM']

// ─── Chapter selector (individual mode) ──────────────────────────────────────

interface ChapterSelectorProps {
  board: string
  grade: number
  subject: string
  examType: ExamType
  selectedIds: string[]
  onToggle: (id: string) => void
  onAutoSelect: (ids: string[]) => void
}

function ChapterSelector({ board, grade, subject, examType, selectedIds, onToggle, onAutoSelect }: ChapterSelectorProps) {
  const [open, setOpen] = useState(false)
  const { data: chapters, isLoading } = useChapters(
    open ? board : undefined,
    open ? grade : undefined,
    open ? subject : undefined,
  )
  const autoMut = useAutoSelectChapters()

  const handleAutoSelect = () => {
    autoMut.mutate({ board, grade, subject, exam_type: examType }, {
      onSuccess: (res) => onAutoSelect(res.chapter_ids),
    })
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-primary underline underline-offset-2 hover:no-underline"
      >
        <BookOpen className="h-3 w-3" />
        {open ? 'Hide chapters' : `Select chapters${selectedIds.length > 0 ? ` (${selectedIds.length} selected)` : ''}`}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-lg border border-border bg-surface-raised p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary font-medium">
                  Chapters for {subject} — Class {grade}
                </span>
                <Button
                  type="button" variant="outline" size="sm"
                  className="h-6 text-xs gap-1 px-2"
                  onClick={handleAutoSelect}
                  disabled={autoMut.isPending}
                >
                  {autoMut.isPending
                    ? <><Loader2 className="h-3 w-3 animate-spin" /> Selecting…</>
                    : <><Sparkles className="h-3 w-3" /> Auto Select</>}
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center gap-2 text-xs text-text-secondary py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading chapters…
                </div>
              ) : !chapters?.length ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-amber-800">
                    No chapters in content library yet. Add via Content Studio. Chapters are optional.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto">
                  {chapters.map((ch) => {
                    const checked = selectedIds.includes(ch.id)
                    return (
                      <label
                        key={ch.id}
                        className={cn(
                          'flex items-start gap-2 rounded-md border px-2 py-1.5 cursor-pointer transition-all text-xs',
                          checked ? 'border-primary/40 bg-blue-50' : 'border-border hover:border-primary/30',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggle(ch.id)}
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-primary"
                        />
                        <div className="min-w-0">
                          <p className="font-medium truncate">Ch {ch.chapter_number}. {ch.title_en}</p>
                          {ch.title_te && (
                            <p className="text-[10px] text-text-secondary font-telugu truncate" lang="te">
                              {ch.title_te}
                            </p>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Subject row (individual mode) ───────────────────────────────────────────

interface SubjectRow extends ExamSubjectInput {
  chapter_ids: string[]
}

function makeDefaultRow(board: string, examType: ExamType): SubjectRow {
  const d = getDefaultMarks(board, examType)
  return { subject: '', class_year: 10, section: null, max_marks: d.max, pass_marks: d.pass, chapter_ids: [] }
}

interface SubjectRowProps {
  sub: SubjectRow
  idx: number
  board: string
  examType: ExamType
  canRemove: boolean
  onUpdate: (i: number, updates: Partial<SubjectRow>) => void
  onRemove: (i: number) => void
  onToggleChapter: (i: number, chId: string) => void
  onAutoSelectChapters: (i: number, ids: string[]) => void
}

function SubjectRowCard({
  sub, idx, board, examType, canRemove,
  onUpdate, onRemove, onToggleChapter, onAutoSelectChapters,
}: SubjectRowProps) {
  const { data: availableSubjects, isLoading: subjectsLoading } = useSubjectsForGrade(board, sub.class_year)

  return (
    <div className="rounded-xl border border-border bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        {/* Grade first */}
        <select
          className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          value={sub.class_year}
          onChange={(e) => onUpdate(idx, { class_year: Number(e.target.value), subject: '' })}
          aria-label="Class grade"
        >
          {Array.from({ length: 12 }, (_, j) => j + 1).map((c) => (
            <option key={c} value={c}>Class {c}</option>
          ))}
        </select>

        {/* Section */}
        <Input
          className="w-24 text-sm"
          placeholder="Section"
          value={sub.section ?? ''}
          onChange={(e) => onUpdate(idx, { section: e.target.value || null })}
          aria-label="Section"
        />

        {/* Subject — dynamic from cs_textbooks */}
        <div className="flex-1 relative">
          <select
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
            value={sub.subject}
            onChange={(e) => onUpdate(idx, { subject: e.target.value })}
            disabled={subjectsLoading}
            aria-label="Subject"
          >
            <option value="">
              {subjectsLoading ? 'Loading subjects…' : 'Select subject'}
            </option>
            {availableSubjects?.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {subjectsLoading && (
            <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-text-secondary" />
          )}
        </div>

        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 shrink-0 text-slate-400 hover:text-danger"
          onClick={() => onRemove(idx)}
          disabled={!canRemove}
          aria-label="Remove subject"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Marks row */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Label className="text-xs text-text-secondary w-20 shrink-0">Max Marks</Label>
          <Input
            type="number" className="w-20 text-sm" min={0}
            value={sub.max_marks ?? ''}
            onChange={(e) => onUpdate(idx, { max_marks: Number(e.target.value) })}
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Label className="text-xs text-text-secondary w-20 shrink-0">Pass Marks</Label>
          <Input
            type="number" className="w-20 text-sm" min={0}
            value={sub.pass_marks ?? ''}
            onChange={(e) => onUpdate(idx, { pass_marks: Number(e.target.value) })}
          />
        </div>
      </div>

      {sub.subject && (
        <ChapterSelector
          board={board}
          grade={sub.class_year}
          subject={sub.subject}
          examType={examType}
          selectedIds={sub.chapter_ids}
          onToggle={(id) => onToggleChapter(idx, id)}
          onAutoSelect={(ids) => onAutoSelectChapters(idx, ids)}
        />
      )}

      {!subjectsLoading && availableSubjects?.length === 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-amber-800">
            No subjects found in Content Studio for Class {sub.class_year} ({board}). Add textbooks first.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Shared details form (step 0 for both modes) ──────────────────────────────

interface ExamDetailsFormProps {
  examType: ExamType
  board: string
  name: string
  description: string
  startDate: string
  endDate: string
  onTypeSelect: (t: ExamType) => void
  onBoardChange: (b: string) => void
  onNameChange: (v: string) => void
  onDescChange: (v: string) => void
  onStartDateChange: (v: string) => void
  onEndDateChange: (v: string) => void
  // batch-only
  isBatch?: boolean
  classFrom?: number
  classTo?: number
  onClassFromChange?: (v: number) => void
  onClassToChange?: (v: number) => void
}

function ExamDetailsForm({
  examType, board, name, description, startDate, endDate,
  onTypeSelect, onBoardChange, onNameChange, onDescChange,
  onStartDateChange, onEndDateChange,
  isBatch, classFrom, classTo, onClassFromChange, onClassToChange,
}: ExamDetailsFormProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Exam Type*</Label>
        <select
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          value={examType}
          onChange={(e) => onTypeSelect(e.target.value as ExamType)}
        >
          {EXAM_TYPES.map((t) => (
            <option key={t} value={t}>{EXAM_TYPE_LABELS[t]} ({t})</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Board / Syllabus</Label>
        <div className="flex gap-2 flex-wrap">
          {BOARDS_LIST.map((b) => (
            <button
              key={b.value}
              type="button"
              onClick={() => onBoardChange(b.value)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm font-medium transition-all',
                board === b.value
                  ? 'border-primary bg-blue-50 text-primary'
                  : 'border-border text-text-secondary hover:border-primary/40',
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {isBatch && onClassFromChange && onClassToChange && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>From Class*</Label>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              value={classFrom}
              onChange={(e) => onClassFromChange(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((c) => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>To Class*</Label>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              value={classTo}
              onChange={(e) => onClassToChange(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((c) => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
          </div>
          {classFrom !== undefined && classTo !== undefined && classFrom > classTo && (
            <p className="col-span-2 text-xs text-danger -mt-1">"From" class must be ≤ "To" class</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="examName">Exam Name*</Label>
        <Input
          id="examName"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. FA1 — 2025-26"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="desc">Description (optional)</Label>
        <Textarea
          id="desc"
          rows={2}
          value={description}
          onChange={(e) => onDescChange(e.target.value)}
          placeholder="e.g. Covers Chapters 1-3 of all subjects"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date*</Label>
          <Input id="startDate" type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date*</Label>
          <Input id="endDate" type="date" value={endDate} min={startDate} onChange={(e) => onEndDateChange(e.target.value)} />
        </div>
      </div>
      {endDate && startDate && endDate < startDate && (
        <p className="text-xs text-danger">End date must be on or after start date</p>
      )}
    </div>
  )
}

// ─── Batch review summary ─────────────────────────────────────────────────────

function BatchReviewStep({ sections, name, examType, board, startDate, endDate, description }: {
  sections: BatchClassSection[]
  name: string
  examType: ExamType
  board: string
  startDate: string
  endDate: string
  description: string
}) {
  const totalExams = sections.reduce((a, s) => a + s.subjects.length, 0)
  const allSubjects = [...new Set(sections.flatMap((s) => s.subjects.map((sub) => sub.subject)))].sort()
  const classYears = [...new Set(sections.map((s) => s.class_year))].sort((a, b) => a - b)

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface-raised p-4 space-y-2">
        <h3 className="font-semibold text-slate-900">{name}</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-secondary">
          <span>{examType} · {board}</span>
          <span>{fmt(startDate)} – {fmt(endDate)}</span>
        </div>
        {description && <p className="text-sm text-text-secondary italic">{description}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border p-3 text-center">
          <p className="text-2xl font-bold text-primary">{sections.length}</p>
          <p className="text-xs text-text-secondary mt-0.5">Class Sections</p>
        </div>
        <div className="rounded-lg border border-border p-3 text-center">
          <p className="text-2xl font-bold text-primary">{allSubjects.length}</p>
          <p className="text-xs text-text-secondary mt-0.5">Subjects</p>
        </div>
        <div className="rounded-lg border border-border p-3 text-center">
          <p className="text-2xl font-bold text-primary">{totalExams}</p>
          <p className="text-xs text-text-secondary mt-0.5">Total Exams</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-slate-700">
          Classes: {classYears.length === 1 ? `Class ${classYears[0]}` : `Class ${classYears[0]} – ${classYears[classYears.length - 1]}`}
          {' '}· {allSubjects.join(', ')}
        </p>
        <div className="max-h-52 overflow-y-auto space-y-1">
          {sections.map((sec) => (
            <div key={`${sec.class_year}-${sec.section}`} className="flex items-start justify-between rounded-lg border border-border px-3 py-2 text-xs">
              <span className="font-medium text-slate-700">Class {sec.class_year}-{sec.section}</span>
              <div className="flex flex-wrap justify-end gap-1 max-w-[70%]">
                {sec.subjects.map((slot, i) => (
                  <span key={i} className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-blue-700">
                    {slot.subject.split(' ')[0]}
                    {slot.exam_date ? ` · ${new Date(slot.exam_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props { open: boolean; onClose: () => void }

type ScheduleMode = null | 'INDIVIDUAL' | 'BATCH'

export default function CreateExamModal({ open, onClose }: Props) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<ScheduleMode>(null)
  const [step, setStep] = useState(0)
  const [createdExam, setCreatedExam] = useState<{ id: string; name: string } | null>(null)

  // Shared fields
  const [examType, setExamType] = useState<ExamType>('FA1')
  const [board, setBoard] = useState('SCERT_AP')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Individual mode
  const [subjects, setSubjects] = useState<SubjectRow[]>(() => [makeDefaultRow('SCERT_AP', 'FA1')])

  // Batch mode
  const [classFrom, setClassFrom] = useState(6)
  const [classTo, setClassTo] = useState(10)
  const [batchSections, setBatchSections] = useState<BatchClassSection[]>([])
  const [batchWorkingDays, setBatchWorkingDays] = useState<string[]>([])

  const createMut = useCreateExam()
  const batchPrepareMut = useBatchPrepare()

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTypeSelect = (type: ExamType) => {
    setExamType(type)
    setName(buildExamName(type))
    const d = getDefaultMarks(board, type)
    setSubjects((s) => s.map((sub) => ({ ...sub, max_marks: d.max, pass_marks: d.pass })))
  }

  const handleBoardChange = (newBoard: string) => {
    setBoard(newBoard)
    const d = getDefaultMarks(newBoard, examType)
    setSubjects((s) => s.map((sub) => ({ ...sub, max_marks: d.max, pass_marks: d.pass, subject: '' })))
  }

  const handleSelectMode = (m: 'INDIVIDUAL' | 'BATCH') => {
    setMode(m)
    setName(buildExamName(examType))
    setStep(0)
  }

  const addSubject = () => setSubjects((s) => [...s, makeDefaultRow(board, examType)])
  const removeSubject = (i: number) => setSubjects((s) => s.filter((_, idx) => idx !== i))
  const updateSubject = (i: number, updates: Partial<SubjectRow>) =>
    setSubjects((s) => s.map((sub, idx) => (idx === i ? { ...sub, ...updates } : sub)))

  const toggleChapter = (subIdx: number, chId: string) => {
    setSubjects((s) => s.map((sub, idx) => {
      if (idx !== subIdx) return sub
      const ids = sub.chapter_ids.includes(chId)
        ? sub.chapter_ids.filter((id) => id !== chId)
        : [...sub.chapter_ids, chId]
      return { ...sub, chapter_ids: ids }
    }))
  }

  const setSubjectChapters = (subIdx: number, ids: string[]) =>
    setSubjects((s) => s.map((sub, idx) => idx === subIdx ? { ...sub, chapter_ids: ids } : sub))

  const handleBatchProceed = () => {
    batchPrepareMut.mutate(
      {
        board,
        class_from: classFrom,
        class_to: classTo,
        exam_type: examType,
        start_date: startDate,
        end_date: endDate,
      },
      {
        onSuccess: (result) => {
          setBatchSections(result.sections)
          setBatchWorkingDays(result.working_days)
          setStep(1)
        },
      },
    )
  }

  const handleIndividualSubmit = () => {
    const validSubjects = subjects
      .filter((s) => s.subject.trim())
      .map(({ chapter_ids: _c, ...rest }) => rest)
    if (validSubjects.length === 0) return
    const allChapterIds = [...new Set(subjects.flatMap((s) => s.chapter_ids))]

    createMut.mutate(
      {
        name: name.trim(),
        exam_type: examType,
        description: description.trim() || undefined,
        start_date: startDate,
        end_date: endDate,
        subjects: validSubjects,
        chapter_ids: allChapterIds,
        board,
        schedule_type: 'INDIVIDUAL',
      },
      {
        onSuccess: (exam) => {
          setCreatedExam({ id: exam.id, name: exam.name })
          setStep(3)
        },
      },
    )
  }

  const handleBatchSubmit = () => {
    const subjects: ExamSubjectInput[] = batchSections.flatMap((sec) =>
      sec.subjects.map((slot) => ({
        subject: slot.subject,
        class_year: sec.class_year,
        section: sec.section,
        max_marks: slot.max_marks,
        pass_marks: slot.pass_marks,
        exam_date: slot.exam_date,
      }))
    )
    const allChapterIds = [
      ...new Set(batchSections.flatMap((sec) => sec.subjects.flatMap((slot) => slot.chapter_ids))),
    ]

    createMut.mutate(
      {
        name: name.trim(),
        exam_type: examType,
        description: description.trim() || undefined,
        start_date: startDate,
        end_date: endDate,
        subjects,
        chapter_ids: allChapterIds,
        board,
        schedule_type: 'BATCH',
      },
      {
        onSuccess: (exam) => {
          setCreatedExam({ id: exam.id, name: exam.name })
          setStep(3)
        },
      },
    )
  }

  const handleClose = () => {
    setMode(null)
    setStep(0)
    setCreatedExam(null)
    setName('')
    setDescription('')
    setStartDate('')
    setEndDate('')
    setExamType('FA1')
    setBoard('SCERT_AP')
    setSubjects([makeDefaultRow('SCERT_AP', 'FA1')])
    setClassFrom(6)
    setClassTo(10)
    setBatchSections([])
    setBatchWorkingDays([])
    onClose()
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const isBatchGantt = mode === 'BATCH' && step === 1

  const INDIVIDUAL_STEPS = ['Exam Details', 'Add Subjects', 'Review']
  const BATCH_STEPS = ['Batch Setup', 'Schedule', 'Review']
  const steps = mode === 'BATCH' ? BATCH_STEPS : INDIVIDUAL_STEPS

  const canProceed = (): boolean => {
    if (mode === null) return false
    const baseValid = !!examType && name.trim().length >= 2 && !!startDate && !!endDate && endDate >= startDate
    if (mode === 'INDIVIDUAL') {
      if (step === 0) return baseValid
      if (step === 1) return subjects.filter((s) => s.subject.trim()).length > 0
      return true
    }
    // BATCH
    if (step === 0) return baseValid && classFrom <= classTo
    if (step === 1) return batchSections.some((s) => s.subjects.length > 0)
    return true
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          'max-h-[90vh] overflow-y-auto transition-all duration-300',
          isBatchGantt ? 'max-w-[95vw]' : 'max-w-3xl',
        )}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === null
              ? 'Schedule New Exam'
              : mode === 'BATCH'
              ? 'Batch Exam Scheduling'
              : 'Schedule New Exam'}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        {mode !== null && step < 3 && (
          <div className="flex items-center gap-2 py-1">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                  i < step ? 'bg-green-500 text-white' : i === step ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400',
                )}>
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span className={cn('text-xs', i === step ? 'font-semibold text-primary' : 'text-text-secondary')}>
                  {s}
                </span>
                {i < steps.length - 1 && <div className="h-px w-8 bg-border" />}
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── MODE SELECTION ── */}
          {mode === null && (
            <motion.div
              key="mode"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-4"
            >
              <p className="text-sm text-text-secondary">
                Choose how you want to schedule this exam.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleSelectMode('INDIVIDUAL')}
                  className="flex flex-col items-start gap-3 rounded-xl border-2 border-border bg-white p-5 text-left hover:border-primary/60 hover:bg-blue-50/30 transition-all group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Individual</h3>
                    <p className="mt-1 text-sm text-text-secondary leading-relaxed">
                      Schedule for one class at a time. Add subjects, chapters, and dates manually.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-primary">
                    Select <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectMode('BATCH')}
                  className="flex flex-col items-start gap-3 rounded-xl border-2 border-border bg-white p-5 text-left hover:border-primary/60 hover:bg-blue-50/30 transition-all group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary group-hover:bg-secondary/20 transition-colors">
                    <LayoutGrid className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Batch (School-wide)</h3>
                    <p className="mt-1 text-sm text-text-secondary leading-relaxed">
                      Schedule FA/SA exams for all classes across a date range. Dates auto-assigned; drag to adjust.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-secondary">
                    Select <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {/* ── INDIVIDUAL: STEP 0 — Exam Details ── */}
          {mode === 'INDIVIDUAL' && step === 0 && (
            <motion.div key="ind-s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <ExamDetailsForm
                examType={examType} board={board} name={name} description={description}
                startDate={startDate} endDate={endDate}
                onTypeSelect={handleTypeSelect} onBoardChange={handleBoardChange}
                onNameChange={setName} onDescChange={setDescription}
                onStartDateChange={setStartDate} onEndDateChange={setEndDate}
              />
            </motion.div>
          )}

          {/* ── INDIVIDUAL: STEP 1 — Add Subjects ── */}
          {mode === 'INDIVIDUAL' && step === 1 && (
            <motion.div key="ind-s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <p className="text-sm text-text-secondary">
                Select grade, section, and subject for each exam paper. Subjects load from Content Studio.
              </p>
              <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                {subjects.map((sub, i) => (
                  <SubjectRowCard
                    key={i}
                    sub={sub} idx={i} board={board} examType={examType}
                    canRemove={subjects.length > 1}
                    onUpdate={updateSubject} onRemove={removeSubject}
                    onToggleChapter={toggleChapter} onAutoSelectChapters={setSubjectChapters}
                  />
                ))}
              </div>
              <Button
                variant="outline" size="sm"
                onClick={addSubject}
                className="gap-1.5"
                disabled={subjects.length >= 20}
              >
                <Plus className="h-3.5 w-3.5" /> Add Subject
              </Button>
            </motion.div>
          )}

          {/* ── INDIVIDUAL: STEP 2 — Review ── */}
          {mode === 'INDIVIDUAL' && step === 2 && (
            <motion.div key="ind-s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="rounded-xl border border-border p-4 space-y-3 bg-surface-raised">
                <h3 className="font-semibold text-slate-900">{name}</h3>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-secondary">
                  <span>{examType} · {board}</span>
                  <span>
                    {new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' – '}
                    {new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {description && <p className="text-sm text-text-secondary italic">{description}</p>}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  {subjects.filter((s) => s.subject).length} Subject{subjects.filter((s) => s.subject).length !== 1 ? 's' : ''}
                </p>
                {subjects.filter((s) => s.subject.trim()).map((sub, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{sub.subject}</span>
                      <span className="text-text-secondary ml-2">
                        Class {sub.class_year}{sub.section ? `-${sub.section}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-secondary">
                      <span>Max: {sub.max_marks}</span>
                      <span>Pass: {sub.pass_marks}</span>
                      {sub.chapter_ids.length > 0 && (
                        <span className="text-primary">{sub.chapter_ids.length} ch</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {createMut.isError && (
                <p className="text-xs text-danger">Failed to create exam. Please try again.</p>
              )}
            </motion.div>
          )}

          {/* ── BATCH: STEP 0 — Batch Setup ── */}
          {mode === 'BATCH' && step === 0 && (
            <motion.div key="bat-s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                <CalendarDays className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                  Subjects will be fetched from Content Studio for each class. Exam dates are auto-assigned across working days — you can drag to adjust in the next step.
                </p>
              </div>
              <ExamDetailsForm
                examType={examType} board={board} name={name} description={description}
                startDate={startDate} endDate={endDate}
                onTypeSelect={handleTypeSelect} onBoardChange={handleBoardChange}
                onNameChange={setName} onDescChange={setDescription}
                onStartDateChange={setStartDate} onEndDateChange={setEndDate}
                isBatch
                classFrom={classFrom} classTo={classTo}
                onClassFromChange={setClassFrom} onClassToChange={setClassTo}
              />
              {batchPrepareMut.isError && (
                <p className="mt-3 text-xs text-danger">
                  Failed to prepare schedule. Ensure subjects exist in Content Studio for these classes.
                </p>
              )}
            </motion.div>
          )}

          {/* ── BATCH: STEP 1 — Gantt ── */}
          {mode === 'BATCH' && step === 1 && (
            <motion.div key="bat-s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <BatchGanttStep
                sections={batchSections}
                workingDays={batchWorkingDays}
                board={board}
                examType={examType}
                onChange={setBatchSections}
              />
            </motion.div>
          )}

          {/* ── BATCH: STEP 2 — Review ── */}
          {mode === 'BATCH' && step === 2 && (
            <motion.div key="bat-s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <BatchReviewStep
                sections={batchSections}
                name={name} examType={examType} board={board}
                startDate={startDate} endDate={endDate}
                description={description}
              />
              {createMut.isError && (
                <p className="mt-3 text-xs text-danger">Failed to create exam. Please try again.</p>
              )}
            </motion.div>
          )}

          {/* ── SUCCESS ── */}
          {step === 3 && createdExam && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-8 gap-5 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Check className="h-8 w-8 text-green-600" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Exam Created Successfully!</h3>
                <p className="mt-1 text-text-secondary">{createdExam.name}</p>
                {mode === 'BATCH' && (
                  <p className="mt-1 text-sm text-text-secondary">
                    {batchSections.length} sections · {batchSections.reduce((a, s) => a + s.subjects.length, 0)} exams scheduled
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => {
                    handleClose()
                    navigate(`/exams/${createdExam.id}`)
                  }}
                  className="gap-1.5"
                >
                  View Exam <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="outline" onClick={handleClose}>Back to List</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer navigation */}
        {step < 3 && (
          <div className="flex justify-between border-t border-border pt-4">
            {/* Left: Cancel / Back */}
            <Button
              variant="ghost"
              onClick={
                mode === null
                  ? handleClose
                  : step === 0
                  ? () => { setMode(null); setStep(0) }
                  : () => setStep((s) => s - 1)
              }
              className="gap-1.5"
            >
              {mode === null ? (
                'Cancel'
              ) : step === 0 ? (
                <><ChevronLeft className="h-4 w-4" /> Change Mode</>
              ) : (
                <><ChevronLeft className="h-4 w-4" /> Back</>
              )}
            </Button>

            {/* Right: mode-specific next/submit */}
            {mode === null ? null : mode === 'INDIVIDUAL' ? (
              step < 2 ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()} className="gap-1.5">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <LoadingButton loading={createMut.isPending} onClick={handleIndividualSubmit}>
                  Create Exam
                </LoadingButton>
              )
            ) : (
              // BATCH
              step === 0 ? (
                <LoadingButton
                  loading={batchPrepareMut.isPending}
                  onClick={handleBatchProceed}
                  disabled={!canProceed()}
                  className="gap-1.5"
                >
                  {batchPrepareMut.isPending ? (
                    'Preparing schedule…'
                  ) : (
                    <>Generate Schedule <ChevronRight className="h-4 w-4" /></>
                  )}
                </LoadingButton>
              ) : step < 2 ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()} className="gap-1.5">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <LoadingButton loading={createMut.isPending} onClick={handleBatchSubmit}>
                  Create Batch Exam
                </LoadingButton>
              )
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
