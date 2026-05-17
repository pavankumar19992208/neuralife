import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, LayoutGrid, User, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import TimetableGrid from './TimetableGrid'
import EditPeriodPanel from './EditPeriodPanel'
import { useTimetable, useTeacherTimetable, useUpdateTimetableEntry } from '@/hooks/useTimetable'
import { downloadAllClassesPDF } from '@/lib/generateTimetablePDF'
import { useAuthStore } from '@/store/authStore'
import { Skeleton } from '@/components/ui/skeleton'
import EmptyState from '@/components/feedback/EmptyState'
import { AlertCircle } from 'lucide-react'
import type { TimetableSlotEntry, TimetableRequirement, TeacherSubjectAssignment } from '@/types/common'

interface TimetableViewProps {
  classSections: Array<{ class_year: number; section: string }>
  requirements: TimetableRequirement[]
  teacherAssignments: TeacherSubjectAssignment[]
  onSetupClick: () => void
}

type ViewMode = 'CLASS' | 'TEACHER'

export default function TimetableView({ classSections, requirements, teacherAssignments, onSetupClick }: TimetableViewProps) {
  const { teacher_id, school_name } = useAuthStore()
  const [viewMode, setViewMode] = useState<ViewMode>('CLASS')
  const [selectedClass, setSelectedClass] = useState(classSections[0])
  const [editingEntry, setEditingEntry] = useState<TimetableSlotEntry | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const classQuery = useTimetable(
    selectedClass?.class_year ?? 0,
    selectedClass?.section ?? '',
    viewMode === 'CLASS' && !!selectedClass,
  )
  const teacherQuery = useTeacherTimetable(teacher_id ?? '', viewMode === 'TEACHER' && !!teacher_id)
  const updateEntry = useUpdateTimetableEntry()

  const entries = viewMode === 'CLASS' ? classQuery.data ?? [] : teacherQuery.data ?? []
  const isLoading = viewMode === 'CLASS' ? classQuery.isLoading : teacherQuery.isLoading
  const isError = viewMode === 'CLASS' ? classQuery.isError : teacherQuery.isError

  async function handleEditSave(updates: { subject: string; teacher_id: string | null; teacher_name?: string; room_number?: string }) {
    if (!editingEntry) return
    try {
      await updateEntry.mutateAsync({
        class_year: editingEntry.class_year,
        section: editingEntry.section,
        day_of_week: editingEntry.day_of_week,
        period_number: editingEntry.period_number,
        ...updates,
      })
      toast.success('Period updated')
      setEditingEntry(null)
    } catch (err: unknown) {
      const e = err as { message?: string }
      setEditError(e?.message ?? 'Failed to update')
    }
  }

  async function handleDownload() {
    if (viewMode === 'CLASS' && selectedClass) {
      await downloadAllClassesPDF(
        [selectedClass],
        { [`${selectedClass.class_year}-${selectedClass.section}`]: entries },
        school_name ?? 'NeuraLife School',
      )
    } else if (viewMode === 'CLASS') {
      const allEntries: Record<string, TimetableSlotEntry[]> = {
        [`${selectedClass?.class_year}-${selectedClass?.section}`]: entries,
      }
      await downloadAllClassesPDF(classSections.slice(0, 1), allEntries, school_name ?? undefined)
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View mode toggle */}
        <div className="flex items-center gap-0 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setViewMode('CLASS')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              viewMode === 'CLASS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Class View
          </button>
          <button
            onClick={() => setViewMode('TEACHER')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              viewMode === 'TEACHER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <User className="h-4 w-4" />
            My Schedule
          </button>
        </div>

        {/* Class selector */}
        {viewMode === 'CLASS' && (
          <div className="flex gap-1.5 flex-wrap">
            {classSections.map(cs => {
              const isSelected = selectedClass?.class_year === cs.class_year && selectedClass?.section === cs.section
              return (
                <button
                  key={`${cs.class_year}-${cs.section}`}
                  onClick={() => setSelectedClass(cs)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all',
                    isSelected
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-border hover:bg-slate-50',
                  )}
                >
                  {cs.class_year}-{cs.section}
                </button>
              )
            })}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onSetupClick}>
            <RefreshCw className="h-3.5 w-3.5" />
            Rebuild
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState
          icon={<AlertCircle className="h-8 w-8 text-danger" />}
          title="Could not load timetable"
          description="Check your connection and try again."
          action={
            <Button onClick={() => viewMode === 'CLASS' ? classQuery.refetch() : teacherQuery.refetch()}>
              Try again
            </Button>
          }
        />
      )}

      {!isLoading && !isError && entries.length === 0 && (
        <EmptyState
          icon={<AlertCircle className="h-8 w-8 text-slate-400" />}
          title="No timetable entries"
          description="No confirmed timetable for this selection."
        />
      )}

      {!isLoading && !isError && entries.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode === 'CLASS' ? `${selectedClass?.class_year}-${selectedClass?.section}` : 'teacher'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <TimetableGrid
              entries={entries}
              editable
              onCellClick={setEditingEntry}
              highlightConflicts={false}
            />
          </motion.div>
        </AnimatePresence>
      )}

      <EditPeriodPanel
        entry={editingEntry}
        requirements={requirements.filter(r => r.class_year === selectedClass?.class_year)}
        teacherAssignments={teacherAssignments.filter(t => t.class_year === (selectedClass?.class_year ?? 0))}
        allEntries={entries}
        onSave={handleEditSave}
        onClose={() => { setEditingEntry(null); setEditError(null) }}
        isSaving={updateEntry.isPending}
        error={editError}
      />
    </div>
  )
}
