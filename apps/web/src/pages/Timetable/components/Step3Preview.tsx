import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, CheckCircle, RefreshCw, Users,
  Zap, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import TimetableGrid from './TimetableGrid'
import EditPeriodPanel from './EditPeriodPanel'
import type { GeneratedTimetable, TimetableSlotEntry, TimetableRequirement, TeacherSubjectAssignment } from '@/types/common'

interface Step3PreviewProps {
  generated: GeneratedTimetable | null
  requirements: TimetableRequirement[]
  teacherAssignments: TeacherSubjectAssignment[]
  isGenerating: boolean
  onGenerate: (seed?: number) => void
  onConfirm: () => void
  isConfirming: boolean
  onUpdateEntry?: (entry: TimetableSlotEntry, updates: { subject: string; teacher_id: string | null; teacher_name?: string; room_number?: string }) => Promise<void>
  onSwapDays?: (dayA: string, dayB: string) => void
}

export default function Step3Preview({
  generated, requirements, teacherAssignments, isGenerating,
  onGenerate, onConfirm, isConfirming, onUpdateEntry, onSwapDays,
}: Step3PreviewProps) {
  const [seed, setSeed] = useState(1)
  const [selectedClass, setSelectedClass] = useState<{ class_year: number; section: string } | null>(null)
  const [editingEntry, setEditingEntry] = useState<TimetableSlotEntry | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [showWorkload, setShowWorkload] = useState(false)
  const [showConflicts, setShowConflicts] = useState(true)

  useEffect(() => {
    if (generated && !selectedClass) {
      const classSections = Array.from(new Set(
        generated.entries.map(e => `${e.class_year}-${e.section}`)
      )).sort()
      if (classSections.length > 0) {
        const [cy, sec] = classSections[0].split('-')
        setSelectedClass({ class_year: Number(cy), section: sec })
      }
    }
  }, [generated])

  const classSections = generated
    ? Array.from(new Set(generated.entries.map(e => `${e.class_year}-${e.section}`))).sort()
    : []

  const currentEntries = generated && selectedClass
    ? generated.entries.filter(e => e.class_year === selectedClass.class_year && e.section === selectedClass.section)
    : []

  const currentConflicts = generated && selectedClass
    ? generated.conflicts.filter(c => c.class_year === selectedClass.class_year && c.section === selectedClass.section)
    : []

  const errorCount = generated?.conflicts.filter(c => c.severity === 'ERROR').length ?? 0
  const warningCount = generated?.conflicts.filter(c => c.severity === 'WARNING').length ?? 0
  const canConfirm = errorCount === 0

  async function handleEditSave(updates: { subject: string; teacher_id: string | null; teacher_name?: string; room_number?: string }) {
    if (!editingEntry || !onUpdateEntry) return
    setIsSavingEdit(true)
    setEditError(null)
    try {
      await onUpdateEntry(editingEntry, updates)
      setEditingEntry(null)
    } catch (err: unknown) {
      const e = err as { message?: string }
      setEditError(e?.message ?? 'Failed to save. Please try again.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-8">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h3 className="font-bold text-xl text-slate-800">Generating Timetable</h3>
          <p className="text-slate-500 text-sm max-w-xs">
            Running constraint satisfaction algorithm across all class sections...
          </p>
        </div>
        <div className="flex gap-2">
          {['Analyzing subjects', 'Assigning teachers', 'Resolving conflicts', 'Optimising slots'].map((step, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.4, repeat: Infinity, repeatType: 'reverse', duration: 0.8 }}
              className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium"
            >
              {step}
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  if (!generated) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Zap className="h-10 w-10 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="font-bold text-xl text-slate-800">Ready to Generate</h3>
          <p className="text-slate-500 text-sm max-w-sm">
            The AI will create an optimised timetable following SCERT AP guidelines and hard constraints.
          </p>
        </div>
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 px-8"
          onClick={() => onGenerate(seed)}
        >
          <Zap className="h-5 w-5 mr-2" />
          Generate Timetable
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Status bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold',
          canConfirm ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200',
        )}>
          {canConfirm
            ? <CheckCircle className="h-4 w-4" />
            : <AlertTriangle className="h-4 w-4" />}
          {canConfirm ? 'No hard conflicts' : `${errorCount} conflict${errorCount > 1 ? 's' : ''}`}
        </div>
        {warningCount > 0 && (
          <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">
            {warningCount} warning{warningCount > 1 ? 's' : ''}
          </Badge>
        )}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-2">
          <span>{generated.slot_utilization.filled_slots}</span>
          <span>/</span>
          <span>{generated.slot_utilization.total_slots} slots filled</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSeed(s => s + 1); onGenerate(seed + 1) }}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Different
          </Button>
          <Button
            size="sm"
            className={cn('gap-1.5', canConfirm ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-400 cursor-not-allowed')}
            onClick={canConfirm ? onConfirm : undefined}
            disabled={!canConfirm || isConfirming}
          >
            {isConfirming ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <CheckCircle className="h-3.5 w-3.5" />
            )}
            Confirm Timetable
          </Button>
        </div>
      </div>

      {/* Conflicts panel */}
      {generated.conflicts.length > 0 && (
        <div className="border border-red-200 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center gap-2 px-4 py-3 bg-red-50 text-sm font-semibold text-red-700"
            onClick={() => setShowConflicts(v => !v)}
          >
            <AlertTriangle className="h-4 w-4" />
            {generated.conflicts.length} Conflict{generated.conflicts.length > 1 ? 's' : ''} Detected
            {showConflicts ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </button>
          {showConflicts && (
            <div className="divide-y divide-red-100 max-h-40 overflow-y-auto">
              {generated.conflicts.map((c, i) => (
                <div key={i} className="px-4 py-2.5 flex items-start gap-2 text-xs">
                  <span className={cn(
                    'mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0',
                    c.severity === 'ERROR' ? 'bg-red-500' : 'bg-amber-500',
                  )} />
                  <div>
                    <span className="font-semibold text-slate-800">Class {c.class_year}-{c.section} · {c.day} P{c.period}</span>
                    <span className="text-slate-600 ml-2">{c.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Teacher workload */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center gap-2 px-4 py-3 bg-slate-50 text-sm font-semibold text-slate-700"
          onClick={() => setShowWorkload(v => !v)}
        >
          <Users className="h-4 w-4 text-primary" />
          Teacher Workload
          {showWorkload ? <ChevronUp className="h-4 w-4 ml-auto text-slate-400" /> : <ChevronDown className="h-4 w-4 ml-auto text-slate-400" />}
        </button>
        {showWorkload && (
          <div className="grid grid-cols-2 gap-0 divide-y divide-border max-h-48 overflow-y-auto">
            {generated.teacher_workload.map((tw, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center justify-between px-4 py-2.5 text-xs',
                  tw.is_overloaded ? 'bg-red-50' : 'bg-white',
                )}
              >
                <span className="font-medium text-slate-800 truncate">{tw.teacher_name}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  <span className="text-slate-500">{tw.periods_per_week} periods</span>
                  {tw.is_overloaded && <AlertTriangle className="h-3 w-3 text-red-500" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Class tabs + grid */}
      <div>
        <div className="flex gap-1.5 flex-wrap mb-4">
          {classSections.map(cs => {
            const [cy, sec] = cs.split('-')
            const isSelected = selectedClass?.class_year === Number(cy) && selectedClass?.section === sec
            const hasError = generated.conflicts.some(c =>
              c.class_year === Number(cy) && c.section === sec && c.severity === 'ERROR'
            )
            return (
              <button
                key={cs}
                onClick={() => setSelectedClass({ class_year: Number(cy), section: sec })}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all',
                  isSelected
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-border hover:bg-slate-50',
                )}
              >
                {cy}-{sec}
                {hasError && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
              </button>
            )
          })}
        </div>

        {selectedClass && (
          <motion.div
            key={`${selectedClass.class_year}-${selectedClass.section}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <TimetableGrid
              entries={currentEntries}
              conflicts={currentConflicts}
              editable
              onCellClick={setEditingEntry}
              highlightConflicts
              onSwapDays={onSwapDays}
            />
          </motion.div>
        )}
      </div>

      <EditPeriodPanel
        entry={editingEntry}
        requirements={requirements.filter(r => r.class_year === selectedClass?.class_year)}
        teacherAssignments={teacherAssignments.filter(t => t.class_year === selectedClass?.class_year)}
        allEntries={generated?.entries ?? []}
        onSave={handleEditSave}
        onClose={() => { setEditingEntry(null); setEditError(null) }}
        isSaving={isSavingEdit}
        error={editError}
      />
    </div>
  )
}
