import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, AlertTriangle, User, BookOpen, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { TimetableSlotEntry, TimetableRequirement, TeacherSubjectAssignment } from '@/types/common'

interface EditPeriodPanelProps {
  entry: TimetableSlotEntry | null
  requirements: TimetableRequirement[]
  teacherAssignments: TeacherSubjectAssignment[]
  allEntries?: TimetableSlotEntry[]
  onSave: (updates: {
    subject: string
    teacher_id: string | null
    teacher_name?: string
    room_number?: string
  }) => Promise<void>
  onClose: () => void
  isSaving?: boolean
  error?: string | null
}

const DAYS_FULL: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday',
  THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday',
}

function formatTime(t: string) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function EditPeriodPanel({
  entry, requirements, teacherAssignments, allEntries = [],
  onSave, onClose, isSaving, error,
}: EditPeriodPanelProps) {
  const [subject, setSubject] = useState('')
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [teacherName, setTeacherName] = useState('')
  const [room, setRoom] = useState('')

  useEffect(() => {
    if (entry) {
      setSubject(entry.subject ?? '')
      setTeacherId(entry.teacher_id ?? null)
      setTeacherName(entry.teacher_name ?? '')
      setRoom(entry.room_number ?? '')
    }
  }, [entry])

  // Teachers enrolled for the selected subject + grade
  const teacherOptions = useMemo(() => {
    if (!entry || !subject) return []
    const fromAssignments = teacherAssignments.filter(
      t => t.subject === subject && t.class_year === entry.class_year,
    )
    // Fallback: use teacher_id from the requirement itself (e.g. ECA)
    if (fromAssignments.length === 0) {
      const req = requirements.find(r => r.subject === subject && r.class_year === entry.class_year)
      if (req?.teacher_id && req.teacher_name) {
        return [{ teacher_id: req.teacher_id, teacher_name: req.teacher_name, subject: req.subject, class_year: req.class_year }]
      }
    }
    return fromAssignments
  }, [teacherAssignments, requirements, subject, entry])

  // Auto-select first available teacher when subject changes
  useEffect(() => {
    if (!subject || !entry) return
    const opts = teacherAssignments.filter(
      t => t.subject === subject && t.class_year === entry.class_year,
    )
    if (opts.length === 0) {
      const req = requirements.find(r => r.subject === subject && r.class_year === entry.class_year)
      if (req?.teacher_id && req.teacher_name) {
        setTeacherId(req.teacher_id)
        setTeacherName(req.teacher_name)
      } else {
        setTeacherId(null)
        setTeacherName('')
      }
      return
    }
    // Find first available teacher (not busy at this slot in another class)
    const firstAvailable = opts.find(t => {
      const clash = allEntries.find(e =>
        e.teacher_id === t.teacher_id &&
        e.day_of_week === entry.day_of_week &&
        e.period_number === entry.period_number &&
        !(e.class_year === entry.class_year && e.section === entry.section),
      )
      return !clash
    }) ?? opts[0]
    setTeacherId(firstAvailable.teacher_id)
    setTeacherName(firstAvailable.teacher_name)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject])

  // Availability status per teacher
  const teacherAvailability = useMemo(() => {
    if (!entry) return new Map<string, { status: 'available' | 'assigned_here' | 'busy'; clashClass?: string }>()
    const map = new Map<string, { status: 'available' | 'assigned_here' | 'busy'; clashClass?: string }>()
    for (const t of teacherOptions) {
      const clash = allEntries.find(e =>
        e.teacher_id === t.teacher_id &&
        e.day_of_week === entry.day_of_week &&
        e.period_number === entry.period_number,
      )
      if (!clash) {
        map.set(t.teacher_id, { status: 'available' })
      } else if (clash.class_year === entry.class_year && clash.section === entry.section) {
        map.set(t.teacher_id, { status: 'assigned_here' })
      } else {
        map.set(t.teacher_id, { status: 'busy', clashClass: `${clash.class_year}-${clash.section}` })
      }
    }
    return map
  }, [teacherOptions, allEntries, entry])

  const selectedReq = requirements.find(r => r.subject === subject && r.class_year === entry?.class_year)
  const currentTeacherStatus = teacherId ? teacherAvailability.get(teacherId) : undefined

  async function handleSave() {
    await onSave({ subject, teacher_id: teacherId, teacher_name: teacherName || undefined, room_number: room || undefined })
  }

  return (
    <AnimatePresence>
      {entry && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />
          <motion.div
            key="panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed right-0 top-0 h-full w-88 bg-white shadow-2xl z-50 flex flex-col"
            style={{ width: '22rem' }}
          >
            {/* Header */}
            <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">
                  {DAYS_FULL[entry.day_of_week]} · Period {entry.period_number}
                </p>
                <p className="font-semibold text-sm">
                  {formatTime(entry.start_time)} — {formatTime(entry.end_time)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Class {entry.class_year}-{entry.section}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Subject selector */}
              <div>
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                  <BookOpen className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
                  Subject
                </Label>
                <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                  {requirements
                    .filter(r => r.class_year === entry.class_year)
                    .map(req => (
                      <button
                        key={req.subject}
                        onClick={() => setSubject(req.subject)}
                        className={cn(
                          'text-left px-2.5 py-2 rounded-lg border text-xs font-medium transition-all',
                          subject === req.subject
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:bg-slate-50 text-slate-700',
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: req.color_hex }}
                          />
                          {(req.display_name ?? req.subject).replace(/_/g, ' ')}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {req.periods_per_week} periods/week
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              {/* Teacher selection — shown after subject picked */}
              {subject && (
                <div>
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                    <User className="h-3.5 w-3.5 inline mr-1.5" />
                    Teacher
                    {selectedReq && (
                      <span className="ml-1 font-normal text-slate-400 normal-case">
                        — Grade {entry.class_year} {(selectedReq.display_name ?? selectedReq.subject).replace(/_/g, ' ')}
                      </span>
                    )}
                  </Label>

                  {teacherOptions.length > 0 ? (
                    <div className="space-y-1.5">
                      {teacherOptions.map(t => {
                        const avail = teacherAvailability.get(t.teacher_id)
                        const isSelected = teacherId === t.teacher_id
                        const isBusy = avail?.status === 'busy'

                        return (
                          <button
                            key={t.teacher_id}
                            onClick={() => {
                              if (isBusy) return
                              setTeacherId(t.teacher_id)
                              setTeacherName(t.teacher_name)
                            }}
                            disabled={isBusy}
                            className={cn(
                              'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs transition-all text-left',
                              isSelected && !isBusy
                                ? 'border-primary bg-primary/8 ring-1 ring-primary/30'
                                : isBusy
                                  ? 'border-amber-200 bg-amber-50/60 cursor-not-allowed opacity-70'
                                  : 'border-border bg-white hover:bg-slate-50 cursor-pointer',
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0',
                                isSelected && !isBusy ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600',
                              )}>
                                {initials(t.teacher_name)}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-800 text-[13px] leading-tight">{t.teacher_name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Grade {t.class_year} · {t.subject.replace(/_/g, ' ')}
                                </div>
                              </div>
                            </div>
                            <div className="flex-shrink-0 ml-2">
                              {isSelected && !isBusy ? (
                                <CheckCircle className="h-4 w-4 text-primary" />
                              ) : (
                                <span className={cn(
                                  'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                                  isBusy
                                    ? 'bg-amber-100 text-amber-700'
                                    : avail?.status === 'assigned_here'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-green-100 text-green-700',
                                )}>
                                  {isBusy
                                    ? `Busy: ${avail?.clashClass}`
                                    : avail?.status === 'assigned_here'
                                      ? 'Here'
                                      : 'Available'}
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    /* No enrollment data — manual entry */
                    <div className="space-y-2">
                      <div className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        No teacher enrolled for this subject in Grade {entry.class_year}. Assign one manually or enrol a teacher first.
                      </div>
                      <Input
                        value={teacherName}
                        onChange={e => setTeacherName(e.target.value)}
                        placeholder="Enter teacher name..."
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Conflict warning (cross-class) */}
              {currentTeacherStatus?.status === 'busy' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    {teacherName} is already assigned to Class {currentTeacherStatus.clashClass} at this slot.
                  </p>
                </div>
              )}

              {/* Room */}
              <div>
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                  Room / Lab <span className="font-normal text-slate-400 normal-case">(optional)</span>
                </Label>
                <Input
                  value={room}
                  onChange={e => setRoom(e.target.value)}
                  placeholder="e.g. Room 101, Science Lab"
                  className="text-sm"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-5 py-4 flex gap-3 flex-shrink-0">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={handleSave}
                disabled={!subject || isSaving}
              >
                {isSaving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Save className="h-4 w-4 mr-1.5" />
                )}
                Assign
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
