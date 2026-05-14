import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCorrectAttendance } from '@/hooks/useAttendance'
import type { AttendanceStatus, AttendanceRecord } from '@/types/common'

interface StudentRowProps {
  student: { neura_id: string; full_name: string }
  status: AttendanceStatus
  reason?: string
  onStatusChange: (status: AttendanceStatus, reason?: string) => void
  readOnly?: boolean
  existingRecord?: AttendanceRecord
}

const REASONS = ['No reason', 'Medical', 'Family', 'Other'] as const

function statusLabel(s: AttendanceStatus) {
  if (s === 'PRESENT') return 'Present'
  if (s === 'ABSENT') return 'Absent'
  if (s === 'LATE') return 'Late'
  return 'Leave'
}

function statusBadgeClass(s: AttendanceStatus) {
  if (s === 'PRESENT') return 'bg-success/10 text-success border-success/30'
  if (s === 'ABSENT') return 'bg-danger/10 text-danger border-danger/30'
  if (s === 'LATE') return 'bg-warning/10 text-warning border-warning/30'
  return 'bg-blue-50 text-blue-600 border-blue-200'
}

function CorrectionForm({
  record,
  onDone,
}: {
  record: AttendanceRecord
  onDone: () => void
}) {
  const [corrected_status, setCorrectedStatus] = useState<AttendanceStatus>(record.status)
  const [reason, setReason] = useState('')
  const mutation = useCorrectAttendance()

  const handleSubmit = () => {
    mutation.mutate(
      { attendanceId: record.id, corrected_status, reason: reason || undefined },
      { onSuccess: onDone },
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      className="overflow-hidden"
    >
      <div className="mx-4 mb-3 p-3 rounded-lg bg-surface-raised border border-border space-y-2">
        <p className="text-xs font-medium text-text-secondary">Correct attendance</p>
        <div className="flex gap-2">
          {(['PRESENT', 'ABSENT', 'LATE', 'APPROVED_LEAVE'] as AttendanceStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setCorrectedStatus(s)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                corrected_status === s
                  ? statusBadgeClass(s) + ' border-current'
                  : 'bg-white border-border text-text-secondary hover:bg-surface-raised'
              }`}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full text-xs border border-border rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={handleSubmit}
            disabled={mutation.isPending}
          >
            Save correction
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onDone}
          >
            Cancel
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

export function AttendanceStudentRow({
  student,
  status,
  reason,
  onStatusChange,
  readOnly = false,
  existingRecord,
}: StudentRowProps) {
  const [showReason, setShowReason] = useState(false)
  const [selectedReason, setSelectedReason] = useState<string>(reason ?? 'No reason')
  const [showCorrection, setShowCorrection] = useState(false)

  const initials = student.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleStatusClick = (next: AttendanceStatus) => {
    if (next === 'PRESENT') {
      setShowReason(false)
      onStatusChange('PRESENT')
    } else if (next === 'ABSENT') {
      setShowReason(true)
      onStatusChange('ABSENT', selectedReason)
    } else if (next === 'LATE') {
      setShowReason(false)
      onStatusChange('LATE')
    }
  }

  const handleReasonSelect = (r: string) => {
    setSelectedReason(r)
    onStatusChange(status, r)
  }

  const displayStatus = existingRecord?.correction?.corrected_status ?? status

  return (
    <div className="border-b border-border last:border-0">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Avatar + name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary">{initials}</span>
          </div>
          <p className="text-sm font-medium text-text-primary truncate">{student.full_name}</p>
        </div>

        {/* Controls */}
        {readOnly ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={`text-xs ${statusBadgeClass(displayStatus)}`}>
              {statusLabel(displayStatus)}
            </Badge>
            {existingRecord?.correction && (
              <span className="text-xs text-text-muted">(corrected)</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-primary gap-1"
              onClick={() => setShowCorrection((v) => !v)}
              aria-label={`Correct attendance for ${student.full_name}`}
            >
              Correct
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-shrink-0" role="group" aria-label={`Attendance for ${student.full_name}`}>
            <button
              type="button"
              onClick={() => handleStatusClick('PRESENT')}
              aria-pressed={status === 'PRESENT'}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                status === 'PRESENT'
                  ? 'bg-success/10 text-success border-success/40'
                  : 'bg-white border-border text-text-muted hover:bg-surface-raised'
              }`}
            >
              P
            </button>
            <button
              type="button"
              onClick={() => handleStatusClick('ABSENT')}
              aria-pressed={status === 'ABSENT'}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                status === 'ABSENT'
                  ? 'bg-danger/10 text-danger border-danger/40'
                  : 'bg-white border-border text-text-muted hover:bg-surface-raised'
              }`}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => handleStatusClick('LATE')}
              aria-pressed={status === 'LATE'}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                status === 'LATE'
                  ? 'bg-warning/10 text-warning border-warning/40'
                  : 'bg-white border-border text-text-muted hover:bg-surface-raised'
              }`}
            >
              L
            </button>
          </div>
        )}
      </div>

      {/* Reason dropdown for ABSENT/LATE — mark mode */}
      <AnimatePresence>
        {!readOnly && showReason && (
          <motion.div
            key="reason"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 px-4 pb-3">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleReasonSelect(r)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    selectedReason === r
                      ? 'bg-danger/10 text-danger border-danger/30'
                      : 'bg-white border-border text-text-muted hover:bg-surface-raised'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Correction form — read-only mode */}
      <AnimatePresence>
        {readOnly && showCorrection && existingRecord && (
          <CorrectionForm
            key="correction"
            record={existingRecord}
            onDone={() => setShowCorrection(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
