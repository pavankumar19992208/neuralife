import { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarRange, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { slideUp } from '@/lib/animations'
import { useTimetableStatus, useTimetableConfig } from '@/hooks/useTimetable'
import SetupWizard from './components/SetupWizard'
import TimetableView from './components/TimetableView'

type Mode = 'view' | 'setup'

const CLASS_YEARS = [6, 7, 8, 9, 10]

export default function TimetablePage() {
  const statusQuery = useTimetableStatus()
  const configQuery = useTimetableConfig()
  const [mode, setMode] = useState<Mode | null>(null)

  const status = statusQuery.data
  const config = configQuery.data ?? null

  const effectiveMode: Mode =
    mode ??
    (status?.has_confirmed_timetable ? 'view' : 'setup')

  const classSections = status?.class_sections?.length
    ? status.class_sections
    : CLASS_YEARS.map(cy => [
        { class_year: cy, section: 'A' },
        { class_year: cy, section: 'B' },
      ]).flat()

  const requirements = config?.requirements ?? []
  const teacherAssignments = config?.teacher_assignments ?? []

  if (statusQuery.isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <motion.div
      variants={slideUp}
      initial="initial"
      animate="animate"
      className="flex flex-col h-[calc(100vh-64px)]"
    >
      {/* Page header */}
      <div className="px-6 py-5 border-b border-border bg-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarRange className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Timetable Builder</h1>
              <p className="text-sm text-slate-500">
                {effectiveMode === 'view'
                  ? `${classSections.length} class sections · Last updated ${status?.last_generated_at ? new Date(status.last_generated_at).toLocaleDateString('en-IN') : 'recently'}`
                  : 'Setup school timetable following SCERT AP guidelines'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {effectiveMode === 'view' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setMode('setup')}
              >
                <Settings2 className="h-4 w-4" />
                Reconfigure
              </Button>
            )}
            {effectiveMode === 'setup' && status?.has_confirmed_timetable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMode('view')}
              >
                ← Back to Timetable
              </Button>
            )}
          </div>
        </div>

        {/* Mode tabs */}
        {status?.has_confirmed_timetable && (
          <div className="flex gap-1 mt-4">
            {(['view', 'setup'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  effectiveMode === m
                    ? 'bg-primary text-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {m === 'view' ? 'View Timetable' : 'Rebuild / Reconfigure'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {effectiveMode === 'setup' ? (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 min-h-full">
            <SetupWizard
              existingConfig={config}
              classYears={CLASS_YEARS}
              teacherAssignments={teacherAssignments}
              onComplete={() => {
                setMode('view')
                statusQuery.refetch()
                configQuery.refetch()
              }}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
            <TimetableView
              classSections={classSections}
              requirements={requirements}
              teacherAssignments={teacherAssignments}
              onSetupClick={() => setMode('setup')}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}
