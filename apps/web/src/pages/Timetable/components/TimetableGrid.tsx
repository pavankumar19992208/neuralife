import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Edit2, Layers, GripVertical, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimetableSlotEntry, TimetableConflict } from '@/types/common'

const DAYS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const DAYS_FULL: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday',
  THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday',
}

const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  MATHEMATICS:        { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200' },
  ENGLISH:            { bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200' },
  TELUGU:             { bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200' },
  HINDI:              { bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200' },
  PHYSICAL_SCIENCE:   { bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200' },
  BIOLOGICAL_SCIENCE: { bg: 'bg-teal-50',    text: 'text-teal-700',   border: 'border-teal-200' },
  SOCIAL_STUDIES:     { bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200' },
  PT:                 { bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200' },
  COMPUTER_LAB:       { bg: 'bg-sky-50',     text: 'text-sky-700',    border: 'border-sky-200' },
  LIBRARY:            { bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-200' },
  DRAWING:            { bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200' },
  MUSIC:              { bg: 'bg-pink-50',    text: 'text-pink-700',   border: 'border-pink-200' },
  YOGA:               { bg: 'bg-lime-50',    text: 'text-lime-700',   border: 'border-lime-200' },
  MORAL_EDUCATION:    { bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200' },
}

function getSubjectColors(subject: string) {
  const key = subject.replace(/_PART2$/, '').toUpperCase()
  return SUBJECT_COLORS[key] ?? { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

interface TimetableGridProps {
  entries: TimetableSlotEntry[]
  conflicts?: TimetableConflict[]
  editable?: boolean
  onCellClick?: (entry: TimetableSlotEntry) => void
  highlightConflicts?: boolean
  onSwapDays?: (dayA: string, dayB: string) => void
}

export default function TimetableGrid({
  entries,
  conflicts = [],
  editable = false,
  onCellClick,
  highlightConflicts = true,
  onSwapDays,
}: TimetableGridProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)
  const [dragDay, setDragDay] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const workingDays = DAYS_SHORT.filter(d => entries.some(e => e.day_of_week === d))
  const allPeriods = Array.from(new Set(entries.map(e => e.period_number))).sort((a, b) => a - b)

  const getEntry = (day: string, period: number) =>
    entries.find(e => e.day_of_week === day && e.period_number === period)

  const hasConflict = (day: string, period: number) =>
    conflicts.some(c => c.day === day && c.period === period && c.severity === 'ERROR')

  const hasWarning = (day: string, period: number) =>
    conflicts.some(c => c.day === day && c.period === period && c.severity === 'WARNING')

  const getHeaderEntry = (period: number) =>
    entries.find(e => e.period_number === period && !['BREAK', 'LUNCH'].includes(e.subject_type))

  return (
    <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
      <table className="w-full border-collapse min-w-[900px]">
        <thead>
          <tr>
            {/* Day header cell */}
            <th className="w-20 bg-slate-800 text-white text-xs font-semibold px-3 py-3 text-left rounded-tl-xl border-r border-slate-700">
              Day
            </th>
            {allPeriods.map((p) => {
              const hEntry = getHeaderEntry(p)
              const isBreak = hEntry && ['BREAK', 'LUNCH', 'ASSEMBLY'].includes(hEntry.subject_type)
              return (
                <th
                  key={p}
                  className={cn(
                    'text-center px-1 py-2 text-xs font-semibold border-r border-slate-700 last:border-r-0',
                    isBreak ? 'bg-slate-600 text-slate-300 w-16' : 'bg-slate-800 text-white',
                  )}
                >
                  {isBreak ? (
                    <span className="text-slate-400 italic text-[10px]">{hEntry?.subject}</span>
                  ) : (
                    <>
                      <div className="text-white">P{p}</div>
                      {hEntry && (
                        <div className="text-slate-400 font-normal text-[10px] mt-0.5">
                          {formatTime(hEntry.start_time)}
                        </div>
                      )}
                    </>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {workingDays.map((day, di) => {
            const isDragging = dragDay === day
            const isDropTarget = dropTarget === day && dragDay !== null && dragDay !== day
            return (
            <tr
              key={day}
              className={cn(
                di % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                isDragging && 'opacity-40',
                isDropTarget && 'outline outline-2 outline-primary/60 outline-offset-[-2px] bg-primary/5',
              )}
              onDragOver={(e) => {
                e.preventDefault()
                if (dragDay && dragDay !== day) setDropTarget(day)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragDay && dragDay !== day) {
                  onSwapDays?.(dragDay, day)
                }
                setDragDay(null)
                setDropTarget(null)
              }}
            >
              {/* Day label with drag handle */}
              <td
                className={cn(
                  'border-r border-b border-border px-2 py-2 bg-slate-50 select-none',
                  onSwapDays && 'cursor-grab active:cursor-grabbing',
                  isDropTarget && 'bg-primary/10',
                )}
                draggable={!!onSwapDays}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', day)
                  setDragDay(day)
                }}
                onDragEnd={() => {
                  setDragDay(null)
                  setDropTarget(null)
                }}
              >
                <div className="flex items-center gap-1">
                  {onSwapDays && (
                    <GripVertical className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-xs text-slate-800">{DAYS_FULL[day]?.slice(0,3)}</div>
                    <div className="text-[10px] text-slate-400">{DAYS_FULL[day]?.slice(3)}</div>
                  </div>
                </div>
                {isDropTarget && (
                  <div className="flex items-center gap-0.5 mt-1">
                    <ArrowLeftRight className="h-3 w-3 text-primary" />
                    <span className="text-[9px] text-primary font-semibold">swap</span>
                  </div>
                )}
              </td>

              {allPeriods.map((period) => {
                const entry = getEntry(day, period)
                const cellKey = `${day}-${period}`
                const isHovered = hoveredCell === cellKey
                const isBreak = entry && ['BREAK', 'LUNCH', 'ASSEMBLY'].includes(entry.subject_type)
                const isPart2 = entry?.subject?.endsWith('_PART2')
                const conflict = hasConflict(day, period)
                const warning = hasWarning(day, period)
                const isUnassigned = entry?.subject === 'UNASSIGNED' || !entry?.subject

                if (isPart2) {
                  return (
                    <td key={period} className="border-r border-b border-border p-0">
                      <div className="h-full min-h-[64px] bg-slate-100/50 flex items-center justify-center">
                        <span className="text-[9px] text-slate-400 italic rotate-90 whitespace-nowrap">↑ double</span>
                      </div>
                    </td>
                  )
                }

                if (isBreak) {
                  return (
                    <td key={period} className="border-r border-b border-border p-0 w-16">
                      <div className="h-full min-h-[64px] bg-slate-100 flex flex-col items-center justify-center gap-0.5">
                        <span className="text-[9px] text-slate-500 font-medium">{entry?.subject}</span>
                        <span className="text-[9px] text-slate-400">
                          {entry?.start_time ? formatTime(entry.start_time) : ''}
                        </span>
                      </div>
                    </td>
                  )
                }

                const colors = entry ? getSubjectColors(entry.subject) : { bg: 'bg-white', text: 'text-slate-400', border: 'border-dashed border-slate-200' }

                return (
                  <td
                    key={period}
                    className="border-r border-b border-border p-0 relative"
                    onMouseEnter={() => setHoveredCell(cellKey)}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    <motion.div
                      className={cn(
                        'h-full min-h-[64px] p-1.5 flex flex-col justify-between transition-all duration-150',
                        colors.bg,
                        `border ${colors.border}`,
                        'm-0.5 rounded-md',
                        editable && !isBreak && 'cursor-pointer',
                        conflict && highlightConflicts && 'ring-2 ring-red-400 ring-inset',
                        warning && !conflict && highlightConflicts && 'ring-1 ring-amber-400 ring-inset',
                        isHovered && editable && 'brightness-95',
                      )}
                      onClick={() => {
                        if (!editable || isBreak) return
                        if (entry) {
                          onCellClick?.(entry)
                          return
                        }
                        // Empty slot — build a synthetic entry so the edit panel can open
                        const hdr = getHeaderEntry(period)
                        const firstEntry = entries.find(e => e.class_year)
                        onCellClick?.({
                          school_id: firstEntry?.school_id ?? '',
                          academic_year_id: firstEntry?.academic_year_id ?? '',
                          class_year: firstEntry?.class_year ?? 0,
                          section: firstEntry?.section ?? '',
                          day_of_week: day,
                          period_number: period,
                          start_time: hdr?.start_time ?? '',
                          end_time: hdr?.end_time ?? '',
                          subject: '',
                          subject_type: 'ACADEMIC',
                          teacher_id: null,
                          is_double_period: false,
                          period_type: 'REGULAR',
                        })
                      }}
                    >
                      {entry && !isUnassigned ? (
                        <>
                          <div className="flex items-start justify-between gap-1">
                            <span className={cn('text-[10px] font-bold leading-tight', colors.text)}>
                              {entry.subject.replace(/_/g, ' ')}
                            </span>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              {entry.is_double_period && (
                                <Layers className="h-3 w-3 text-slate-400" />
                              )}
                              {(conflict || warning) && highlightConflicts && (
                                <AlertTriangle className={cn('h-3 w-3', conflict ? 'text-red-500' : 'text-amber-500')} />
                              )}
                              {isHovered && editable && (
                                <Edit2 className="h-3 w-3 text-slate-400" />
                              )}
                            </div>
                          </div>
                          <div className={cn('text-[9px] leading-tight mt-auto', colors.text, 'opacity-70')}>
                            {entry.teacher_name ?? '—'}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-[10px] text-slate-300 italic">
                          {editable ? 'click to assign' : '—'}
                        </div>
                      )}
                    </motion.div>
                  </td>
                )
              })}
            </tr>
          )})}
        </tbody>
      </table>
    </div>
  )
}
