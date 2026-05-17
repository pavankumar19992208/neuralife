import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Clock, Eye, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Step1Subjects from './Step1Subjects'
import Step2Hours from './Step2Hours'
import Step3Preview from './Step3Preview'
import { useSaveTimetableConfig, useGenerateTimetable, useConfirmTimetable } from '@/hooks/useTimetable'
import type {
  TimetableConfig, TimetableRequirement, PeriodConfigRow,
  AssemblyConfig, GeneratedTimetable, TimetableSlotEntry, TeacherSubjectAssignment,
} from '@/types/common'
import { SCERT_AP_DEFAULTS, DAYS_SHORT } from '@/types/common'

const STEPS = [
  { id: 1, label: 'Subjects & Activities', icon: BookOpen },
  { id: 2, label: 'School Hours',          icon: Clock },
  { id: 3, label: 'Preview & Confirm',     icon: Eye },
]

function buildDefaultRequirements(classYears: number[]): TimetableRequirement[] {
  const COLORS: Record<string, string> = {
    MATHEMATICS: '#1e40af', PHYSICAL_SCIENCE: '#d97706', BIOLOGICAL_SCIENCE: '#0d9488',
    SOCIAL_STUDIES: '#ea580c', ENGLISH: '#059669', TELUGU: '#dc2626', HINDI: '#7c3aed',
  }
  const reqs: TimetableRequirement[] = []
  for (const cy of classYears) {
    for (const [subject, grades] of Object.entries(SCERT_AP_DEFAULTS)) {
      reqs.push({
        class_year: cy,
        subject,
        subject_type: 'ACADEMIC',
        periods_per_week: grades[cy] ?? 4,
        needs_double_period: subject === 'MATHEMATICS',
        double_period_count: subject === 'MATHEMATICS' ? 1 : 0,
        preferred_position: 'ANY',
        color_hex: COLORS[subject] ?? '#64748b',
      })
    }
  }
  return reqs
}

function buildDefaultPeriodConfig(): PeriodConfigRow[] {
  return DAYS_SHORT.slice(0, 6).map((day, i) => ({
    day_of_week: day,
    is_working_day: i < 5,
    school_start_time: '09:00',
    school_end_time: '16:30',
    period_duration_minutes: 45,
    short_break_after_periods: [2, 5],
    short_break_duration_min: 10,
    lunch_after_period: 4,
    lunch_duration_minutes: 40,
  }))
}

const DEFAULT_ASSEMBLY: AssemblyConfig = {
  include_in_schedule: true,
  day_of_week: 'MON',
  duration_minutes: 20,
  position: 'BEFORE_FIRST',
}

interface SetupWizardProps {
  existingConfig: TimetableConfig | null
  classYears: number[]
  teacherAssignments: TeacherSubjectAssignment[]
  onComplete: () => void
}

export default function SetupWizard({ existingConfig, classYears, teacherAssignments, onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1)
  const [requirements, setRequirements] = useState<TimetableRequirement[]>(() =>
    existingConfig?.requirements?.length
      ? existingConfig.requirements
      : buildDefaultRequirements(classYears)
  )
  const [periodConfig, setPeriodConfig] = useState<PeriodConfigRow[]>(() =>
    existingConfig?.period_config?.length
      ? existingConfig.period_config
      : buildDefaultPeriodConfig()
  )
  const [assemblyConfig, setAssemblyConfig] = useState<AssemblyConfig>(
    existingConfig?.assembly_config ?? DEFAULT_ASSEMBLY
  )
  const [generated, setGenerated] = useState<GeneratedTimetable | null>(null)

  const saveConfig = useSaveTimetableConfig()
  const generateMutation = useGenerateTimetable()
  const confirmMutation = useConfirmTimetable()

  async function handleNext() {
    if (step === 2) {
      await saveConfig.mutateAsync({
        period_config: periodConfig,
        assembly_config: assemblyConfig,
        requirements,
      })
    }
    setStep(s => Math.min(s + 1, 3))
  }

  async function handleGenerate(seed?: number) {
    try {
      const result = await generateMutation.mutateAsync({
        class_years: [...new Set(requirements.map(r => r.class_year))],
        seed,
      })
      setGenerated(result)
    } catch {
      toast.error('Generation failed. Please check your configuration.')
    }
  }

  async function handleConfirm() {
    if (!generated) return
    try {
      await confirmMutation.mutateAsync({
        entries: generated.entries,
        conflict_count: generated.conflicts.filter(c => c.severity === 'ERROR').length,
      })
      toast.success('Timetable confirmed and saved!')
      onComplete()
    } catch {
      toast.error('Failed to confirm timetable.')
    }
  }

  function handleSwapDays(dayA: string, dayB: string) {
    setGenerated(prev => {
      if (!prev) return prev
      return {
        ...prev,
        entries: prev.entries.map(e => {
          if (e.day_of_week === dayA) return { ...e, day_of_week: dayB }
          if (e.day_of_week === dayB) return { ...e, day_of_week: dayA }
          return e
        }),
      }
    })
  }

  async function handleUpdateEntry(entry: TimetableSlotEntry, updates: { subject: string; teacher_id: string | null; teacher_name?: string; room_number?: string }) {
    if (!generated) return
    setGenerated(prev => {
      if (!prev) return prev
      const exists = prev.entries.some(
        e => e.day_of_week === entry.day_of_week &&
             e.period_number === entry.period_number &&
             e.class_year === entry.class_year &&
             e.section === entry.section
      )
      if (exists) {
        return {
          ...prev,
          entries: prev.entries.map(e =>
            e.day_of_week === entry.day_of_week &&
            e.period_number === entry.period_number &&
            e.class_year === entry.class_year &&
            e.section === entry.section
              ? { ...e, ...updates }
              : e
          ),
        }
      }
      // New slot — add it
      return {
        ...prev,
        entries: [...prev.entries, { ...entry, ...updates }],
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8 px-1">
        {STEPS.map((s, i) => {
          const isComplete = step > s.id
          const isCurrent = step === s.id
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => step > s.id && setStep(s.id)}
                disabled={step <= s.id}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all',
                  isCurrent && 'bg-primary text-white shadow-md',
                  isComplete && 'text-primary cursor-pointer hover:bg-primary/10',
                  !isCurrent && !isComplete && 'text-slate-400',
                )}
              >
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                  isCurrent && 'bg-white/20',
                  isComplete && 'bg-primary text-white',
                  !isCurrent && !isComplete && 'bg-slate-200 text-slate-500',
                )}>
                  {isComplete ? <CheckCircle className="h-4 w-4" /> : s.id}
                </div>
                <span className="hidden sm:block">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  'flex-1 h-px mx-2 transition-colors',
                  step > s.id ? 'bg-primary' : 'bg-border',
                )} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {step === 1 && (
              <Step1Subjects
                classYears={classYears}
                requirements={requirements}
                assemblyConfig={assemblyConfig}
                onRequirementsChange={setRequirements}
                onAssemblyChange={setAssemblyConfig}
              />
            )}
            {step === 2 && (
              <Step2Hours
                periodConfig={periodConfig}
                requirements={requirements}
                onConfigChange={setPeriodConfig}
              />
            )}
            {step === 3 && (
              <Step3Preview
                generated={generated}
                requirements={requirements}
                teacherAssignments={teacherAssignments}
                isGenerating={generateMutation.isPending}
                onGenerate={handleGenerate}
                onConfirm={handleConfirm}
                isConfirming={confirmMutation.isPending}
                onUpdateEntry={handleUpdateEntry}
                onSwapDays={handleSwapDays}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      {step < 3 && (
        <div className="flex justify-between items-center pt-6 border-t border-border mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(s => Math.max(s - 1, 1))}
            disabled={step === 1}
          >
            ← Previous
          </Button>
          <div className="flex items-center gap-1.5">
            {STEPS.map(s => (
              <div
                key={s.id}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  step === s.id ? 'bg-primary w-6' : step > s.id ? 'bg-primary' : 'bg-slate-300',
                )}
              />
            ))}
          </div>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={handleNext}
            disabled={saveConfig.isPending}
          >
            {saveConfig.isPending
              ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white mr-2" />
              : null}
            {step === 2 ? 'Save & Continue →' : 'Next →'}
          </Button>
        </div>
      )}
    </div>
  )
}
