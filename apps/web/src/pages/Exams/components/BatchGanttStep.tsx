import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, BookOpen, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useChapters } from '@/hooks/useExams'
import type { BatchClassSection, BatchSubjectSlot, ExamType } from '@/types/common'
import { cn } from '@/lib/utils'

// ─── Subject colour palette ───────────────────────────────────────────────────

const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Mathematics':         { bg: 'bg-blue-100',    text: 'text-blue-800',    border: 'border-blue-300' },
  'Physical Science':    { bg: 'bg-green-100',   text: 'text-green-800',   border: 'border-green-300' },
  'Biological Science':  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  'English':             { bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-300' },
  'Telugu':              { bg: 'bg-purple-100',  text: 'text-purple-800',  border: 'border-purple-300' },
  'Hindi':               { bg: 'bg-pink-100',    text: 'text-pink-800',    border: 'border-pink-300' },
  'Social Studies':      { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-300' },
  'Environmental Science': { bg: 'bg-teal-100',  text: 'text-teal-800',   border: 'border-teal-300' },
  'Sanskrit':            { bg: 'bg-rose-100',    text: 'text-rose-800',    border: 'border-rose-300' },
  'Urdu':                { bg: 'bg-violet-100',  text: 'text-violet-800',  border: 'border-violet-300' },
  'Computer Science':    { bg: 'bg-cyan-100',    text: 'text-cyan-800',    border: 'border-cyan-300' },
}

const PALETTE = [
  { bg: 'bg-slate-100',   text: 'text-slate-700',   border: 'border-slate-300' },
  { bg: 'bg-indigo-100',  text: 'text-indigo-800',  border: 'border-indigo-300' },
  { bg: 'bg-yellow-100',  text: 'text-yellow-800',  border: 'border-yellow-300' },
]

function getSubjectColor(subject: string, allSubjects: string[]) {
  if (SUBJECT_COLORS[subject]) return SUBJECT_COLORS[subject]
  const idx = allSubjects.indexOf(subject) % PALETTE.length
  return PALETTE[idx]
}

function fmtDateHeader(d: string) {
  const dt = new Date(d + 'T00:00:00')
  return {
    day: dt.toLocaleDateString('en-IN', { day: 'numeric' }),
    month: dt.toLocaleDateString('en-IN', { month: 'short' }),
    dow: dt.toLocaleDateString('en-IN', { weekday: 'short' }),
  }
}

// ─── Chapter panel (shown on block click) ────────────────────────────────────

interface ChapterPanelProps {
  slot: BatchSubjectSlot
  rowIdx: number
  subIdx: number
  board: string
  grade: number
  onChange: (rowIdx: number, subIdx: number, updates: Partial<BatchSubjectSlot>) => void
  onRemove: (rowIdx: number, subIdx: number) => void
  onClose: () => void
}

function ChapterPanel({ slot, rowIdx, subIdx, board, grade, onChange, onRemove, onClose }: ChapterPanelProps) {
  const { data: chapters, isLoading } = useChapters(board, grade, slot.subject)

  const toggleChapter = (id: string) => {
    const next = slot.chapter_ids.includes(id)
      ? slot.chapter_ids.filter((c) => c !== id)
      : [...slot.chapter_ids, id]
    onChange(rowIdx, subIdx, { chapter_ids: next })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="absolute right-0 top-0 z-20 w-72 rounded-xl border border-border bg-white shadow-lg overflow-hidden"
      style={{ minHeight: 200 }}
    >
      <div className="flex items-center justify-between border-b border-border bg-surface-raised px-3 py-2">
        <span className="text-xs font-semibold text-slate-700 truncate">{slot.subject}</span>
        <button onClick={onClose} className="ml-2 rounded p-0.5 hover:bg-slate-200">
          <X className="h-3.5 w-3.5 text-slate-500" />
        </button>
      </div>
      <div className="p-3 space-y-3">
        <div className="flex gap-3">
          <div className="space-y-1 flex-1">
            <Label className="text-xs text-text-secondary">Max</Label>
            <Input
              type="number" className="h-7 text-xs" min={0}
              value={slot.max_marks}
              onChange={(e) => onChange(rowIdx, subIdx, { max_marks: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1 flex-1">
            <Label className="text-xs text-text-secondary">Pass</Label>
            <Input
              type="number" className="h-7 text-xs" min={0}
              value={slot.pass_marks}
              onChange={(e) => onChange(rowIdx, subIdx, { pass_marks: Number(e.target.value) })}
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            Chapters ({slot.chapter_ids.length} selected)
          </p>
          {isLoading ? (
            <p className="text-xs text-text-secondary">Loading…</p>
          ) : !chapters?.length ? (
            <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">No chapters in Content Studio yet.</p>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {chapters.map((ch) => {
                const checked = slot.chapter_ids.includes(ch.id)
                return (
                  <label
                    key={ch.id}
                    className={cn(
                      'flex items-start gap-2 rounded p-1.5 cursor-pointer text-xs transition-colors',
                      checked ? 'bg-blue-50' : 'hover:bg-slate-50',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleChapter(ch.id)}
                      className="mt-0.5 h-3 w-3 accent-primary shrink-0"
                    />
                    <span className="text-slate-700">Ch {ch.chapter_number}. {ch.title_en}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => onRemove(rowIdx, subIdx)}
          className="w-full text-xs text-danger hover:bg-red-50 rounded py-1 transition-colors"
        >
          Remove this subject from schedule
        </button>
      </div>
    </motion.div>
  )
}

// ─── Subject block (draggable pill) ──────────────────────────────────────────

interface SubjectBlockProps {
  slot: BatchSubjectSlot
  rowIdx: number
  subIdx: number
  allSubjects: string[]
  isSelected: boolean
  onSelect: () => void
  onDragStart: (rowIdx: number, subIdx: number) => void
}

function SubjectBlock({ slot, rowIdx, subIdx, allSubjects, isSelected, onSelect, onDragStart }: SubjectBlockProps) {
  const color = getSubjectColor(slot.subject, allSubjects)
  return (
    <div
      draggable
      onDragStart={() => onDragStart(rowIdx, subIdx)}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium cursor-grab active:cursor-grabbing select-none transition-all',
        color.bg, color.text, color.border,
        isSelected && 'ring-2 ring-primary ring-offset-1',
      )}
      title={`${slot.subject} — drag to move date`}
    >
      <span className="truncate max-w-[80px]">{slot.subject.split(' ')[0]}</span>
      {slot.chapter_ids.length > 0 && (
        <span className="rounded bg-white/60 px-1 text-[9px] font-bold">{slot.chapter_ids.length}ch</span>
      )}
    </div>
  )
}

// ─── Main Gantt component ─────────────────────────────────────────────────────

interface Props {
  sections: BatchClassSection[]
  workingDays: string[]
  board: string
  examType: ExamType
  onChange: (sections: BatchClassSection[]) => void
}

export default function BatchGanttStep({ sections, workingDays, board, examType: _examType, onChange }: Props) {
  const [selected, setSelected] = useState<{ rowIdx: number; subIdx: number } | null>(null)
  const [dragSrc, setDragSrc] = useState<{ rowIdx: number; subIdx: number } | null>(null)
  const [collapsedGrades, setCollapsedGrades] = useState<Set<number>>(new Set())

  const allSubjects = [...new Set(sections.flatMap((s) => s.subjects.map((sub) => sub.subject)))].sort()

  const updateSlot = (rowIdx: number, subIdx: number, updates: Partial<BatchSubjectSlot>) => {
    onChange(sections.map((row, ri) =>
      ri !== rowIdx ? row : {
        ...row,
        subjects: row.subjects.map((sub, si) => si !== subIdx ? sub : { ...sub, ...updates }),
      },
    ))
  }

  const removeSlot = (rowIdx: number, subIdx: number) => {
    onChange(sections.map((row, ri) =>
      ri !== rowIdx ? row : { ...row, subjects: row.subjects.filter((_, si) => si !== subIdx) },
    ))
    setSelected(null)
  }

  const handleDrop = (rowIdx: number, date: string) => {
    if (!dragSrc) return
    onChange(sections.map((row, ri) =>
      ri !== rowIdx ? row : {
        ...row,
        subjects: row.subjects.map((sub, si) =>
          si !== dragSrc.subIdx ? sub : { ...sub, exam_date: date },
        ),
      },
    ))
    setDragSrc(null)
  }

  const toggleGrade = (grade: number) => {
    setCollapsedGrades((prev) => {
      const next = new Set(prev)
      next.has(grade) ? next.delete(grade) : next.add(grade)
      return next
    })
  }

  const totalSubjectCount = sections.reduce((acc, s) => acc + s.subjects.length, 0)

  // Group sections by grade for collapse headers
  const gradeGroups = sections.reduce<Record<number, typeof sections>>((acc, sec) => {
    ;(acc[sec.class_year] ??= []).push(sec)
    return acc
  }, {})

  return (
    <div className="space-y-3" onClick={() => setSelected(null)}>
      {/* Legend */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">
          {sections.length} class sections · {totalSubjectCount} exams · drag blocks to change date
        </p>
        <div className="flex flex-wrap gap-1.5">
          {allSubjects.slice(0, 6).map((s) => {
            const c = getSubjectColor(s, allSubjects)
            return (
              <span key={s} className={cn('rounded px-2 py-0.5 text-[10px] font-medium border', c.bg, c.text, c.border)}>
                {s.split(' ')[0]}
              </span>
            )
          })}
          {allSubjects.length > 6 && (
            <span className="rounded px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600">
              +{allSubjects.length - 6} more
            </span>
          )}
        </div>
      </div>

      {/* Gantt table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs border-collapse" style={{ minWidth: workingDays.length * 110 + 80 }}>
          {/* Header row */}
          <thead>
            <tr className="bg-surface-raised">
              <th className="sticky left-0 z-10 bg-surface-raised border-b border-r border-border px-3 py-2 text-left text-text-secondary font-medium w-20">
                Class
              </th>
              {workingDays.map((d) => {
                const { day, month, dow } = fmtDateHeader(d)
                return (
                  <th key={d} className="border-b border-r border-border px-2 py-1.5 text-center min-w-[110px]">
                    <div className="font-semibold text-slate-700">{day} {month}</div>
                    <div className="text-[10px] text-text-secondary">{dow}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {Object.entries(gradeGroups).map(([gradeStr, gradeSections]) => {
              const grade = Number(gradeStr)
              const collapsed = collapsedGrades.has(grade)
              const gradeStart = sections.findIndex((s) => s.class_year === grade)
              return (
                <>
                  {/* Grade collapse header */}
                  <tr key={`grade-${grade}`} className="bg-slate-50 cursor-pointer hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); toggleGrade(grade) }}>
                    <td
                      colSpan={workingDays.length + 1}
                      className="sticky left-0 border-b border-border px-3 py-1.5"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                        Class {grade} — {gradeSections.length} section{gradeSections.length !== 1 ? 's' : ''}
                      </div>
                    </td>
                  </tr>

                  {/* Section rows */}
                  {!collapsed && gradeSections.map((sec) => {
                    const rowIdx = gradeStart + gradeSections.indexOf(sec)
                    return (
                      <tr key={`${sec.class_year}-${sec.section}`} className="border-b border-border hover:bg-blue-50/20">
                        <td className="sticky left-0 z-10 bg-white border-r border-border px-3 py-2 font-medium text-slate-700">
                          {sec.class_year}-{sec.section}
                        </td>
                        {workingDays.map((date) => {
                          const slotsOnDate = sec.subjects
                            .map((sub, si) => ({ sub, si }))
                            .filter(({ sub }) => sub.exam_date === date)
                          const isDragOver = dragSrc !== null

                          return (
                            <td
                              key={date}
                              className={cn(
                                'border-r border-border px-1.5 py-1.5 align-top',
                                isDragOver && 'bg-blue-50/40',
                              )}
                              onDragOver={(e) => { e.preventDefault() }}
                              onDrop={() => handleDrop(rowIdx, date)}
                            >
                              <div className="flex flex-wrap gap-1 min-h-[28px]">
                                {slotsOnDate.map(({ sub, si }) => {
                                  const isSelected = selected?.rowIdx === rowIdx && selected?.subIdx === si
                                  return (
                                    <div key={si} className="relative">
                                      <SubjectBlock
                                        slot={sub}
                                        rowIdx={rowIdx}
                                        subIdx={si}
                                        allSubjects={allSubjects}
                                        isSelected={isSelected}
                                        onSelect={() => setSelected({ rowIdx, subIdx: si })}
                                        onDragStart={(ri, si2) => setDragSrc({ rowIdx: ri, subIdx: si2 })}
                                      />
                                      {isSelected && (
                                        <ChapterPanel
                                          slot={sub}
                                          rowIdx={rowIdx}
                                          subIdx={si}
                                          board={board}
                                          grade={sec.class_year}
                                          onChange={updateSlot}
                                          onRemove={removeSlot}
                                          onClose={() => setSelected(null)}
                                        />
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Warning for subjects with no date (exceeded date range) */}
      {sections.some((s) => s.subjects.some((sub) => !workingDays.includes(sub.exam_date))) && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800">
            Some subjects have dates outside the selected range. Drag them into the visible columns.
          </p>
        </div>
      )}
    </div>
  )
}
