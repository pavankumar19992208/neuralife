import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, BookOpen, Zap, Calendar, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { TimetableRequirement, AssemblyConfig } from '@/types/common'
import { ECA_PRESETS } from '@/types/common'

interface Step1SubjectsProps {
  classYears: number[]
  requirements: TimetableRequirement[]
  assemblyConfig: AssemblyConfig
  onRequirementsChange: (reqs: TimetableRequirement[]) => void
  onAssemblyChange: (cfg: AssemblyConfig) => void
  isLoading?: boolean
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const DAYS_FULL: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday',
}

export default function Step1Subjects({
  classYears, requirements, assemblyConfig,
  onRequirementsChange, onAssemblyChange, isLoading,
}: Step1SubjectsProps) {
  const [selectedClass, setSelectedClass] = useState(classYears[0] ?? 6)
  const [expandedECA, setExpandedECA] = useState(true)

  const classReqs = requirements.filter(r => r.class_year === selectedClass)
  const academicReqs = classReqs.filter(r => r.subject_type === 'ACADEMIC')
  const ecaReqs = classReqs.filter(r => r.subject_type === 'ECA')

  const totalPeriodsWeek = classReqs.reduce((s, r) => s + r.periods_per_week, 0)

  function updateReqBySubject(subject: string, patch: Partial<TimetableRequirement>) {
    const updated = requirements.map(r =>
      r.class_year === selectedClass && r.subject === subject ? { ...r, ...patch } : r
    )
    onRequirementsChange(updated)
  }

  function addECA(key: string) {
    const preset = ECA_PRESETS.find(p => p.key === key)
    if (!preset) return
    const exists = requirements.some(r => r.class_year === selectedClass && r.subject === key)
    if (exists) return
    const newReq: TimetableRequirement = {
      class_year: selectedClass,
      subject: key,
      subject_type: 'ECA',
      eca_category: key,
      periods_per_week: preset.periodsDefault,
      needs_double_period: preset.needsDouble,
      double_period_count: preset.needsDouble ? 1 : 0,
      preferred_position: preset.position as TimetableRequirement['preferred_position'],
      color_hex: preset.color,
      display_name: preset.label,
    }
    onRequirementsChange([...requirements, newReq])
  }

  function removeReq(subject: string) {
    onRequirementsChange(requirements.filter(r => !(r.class_year === selectedClass && r.subject === subject)))
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
      </div>
    )
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Left: class selector + subject table */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Class year tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {classYears.map(cy => (
            <button
              key={cy}
              onClick={() => setSelectedClass(cy)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                selectedClass === cy
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              Class {cy}
            </button>
          ))}
        </div>

        {/* Academic subjects */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm text-slate-800">Academic Subjects</h3>
            <Badge variant="secondary" className="text-xs">{academicReqs.length} subjects</Badge>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-border">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Subject</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide w-28">Periods/Week</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide w-28">Double Period</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide w-24">Count</th>
                </tr>
              </thead>
              <tbody>
                {academicReqs.map((req, i) => (
                  <motion.tr
                    key={req.subject}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border last:border-b-0 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: req.color_hex }}
                        />
                        <span className="font-medium text-slate-800 text-sm">
                          {req.subject.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => updateReqBySubject(req.subject, { periods_per_week: Math.max(1, req.periods_per_week - 1) })}
                          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center transition-colors"
                        >−</button>
                        <span className="w-8 text-center font-semibold text-slate-800">{req.periods_per_week}</span>
                        <button
                          onClick={() => updateReqBySubject(req.subject, { periods_per_week: Math.min(12, req.periods_per_week + 1) })}
                          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center transition-colors"
                        >+</button>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Switch
                        checked={req.needs_double_period}
                        onCheckedChange={v => updateReqBySubject(req.subject, {
                          needs_double_period: v,
                          double_period_count: v ? 1 : 0,
                        })}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      {req.needs_double_period ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateReqBySubject(req.subject, { double_period_count: Math.max(1, req.double_period_count - 1) })}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center transition-colors"
                          >−</button>
                          <span className="w-6 text-center font-semibold text-slate-800">{req.double_period_count}</span>
                          <button
                            onClick={() => updateReqBySubject(req.subject, { double_period_count: Math.min(3, req.double_period_count + 1) })}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center transition-colors"
                          >+</button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm text-center block">—</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ECA section */}
        <div>
          <button
            className="flex items-center gap-2 mb-3 w-full"
            onClick={() => setExpandedECA(v => !v)}
          >
            <Zap className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold text-sm text-slate-800">ECA / Co-Curricular</h3>
            <Badge variant="secondary" className="text-xs ml-1">{ecaReqs.length} added</Badge>
            {expandedECA ? <ChevronUp className="h-4 w-4 text-slate-400 ml-auto" /> : <ChevronDown className="h-4 w-4 text-slate-400 ml-auto" />}
          </button>

          {expandedECA && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
              {/* Add ECA buttons */}
              <div className="flex flex-wrap gap-2">
                {ECA_PRESETS.map(preset => {
                  const added = ecaReqs.some(r => r.subject === preset.key)
                  return (
                    <button
                      key={preset.key}
                      onClick={() => added ? removeReq(preset.key) : addECA(preset.key)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                        added
                          ? 'text-white border-transparent'
                          : 'bg-white border-border text-slate-600 hover:border-slate-300',
                      )}
                      style={added ? { backgroundColor: preset.color, borderColor: preset.color } : {}}
                    >
                      {added ? <Trash2 className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      {preset.label}
                    </button>
                  )
                })}
              </div>

              {/* ECA period config */}
              {ecaReqs.length > 0 && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-amber-50 border-b border-border">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-amber-800 uppercase tracking-wide">Activity</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-amber-800 uppercase tracking-wide w-28">Periods/Week</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-amber-800 uppercase tracking-wide w-28">Double</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-amber-800 uppercase tracking-wide w-16">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ecaReqs.map(req => (
                        <tr key={req.subject} className="border-b border-border last:border-b-0 hover:bg-amber-50/30 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: req.color_hex }} />
                              <span className="font-medium text-slate-800">{req.display_name ?? req.subject}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => updateReqBySubject(req.subject, { periods_per_week: Math.max(1, req.periods_per_week - 1) })}
                                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center">−</button>
                              <span className="w-8 text-center font-semibold">{req.periods_per_week}</span>
                              <button onClick={() => updateReqBySubject(req.subject, { periods_per_week: Math.min(6, req.periods_per_week + 1) })}
                                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center">+</button>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <Switch
                              checked={req.needs_double_period}
                              onCheckedChange={v => updateReqBySubject(req.subject, {
                                needs_double_period: v,
                                double_period_count: v ? 1 : 0,
                              })}
                            />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button onClick={() => removeReq(req.subject)}
                              className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Assembly config */}
        <div className="border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-secondary" />
              <h3 className="font-semibold text-sm text-slate-800">Morning Assembly</h3>
            </div>
            <Switch
              checked={assemblyConfig.include_in_schedule}
              onCheckedChange={v => onAssemblyChange({ ...assemblyConfig, include_in_schedule: v })}
            />
          </div>

          {assemblyConfig.include_in_schedule && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-600 mb-1 block">Day</Label>
                <select
                  value={assemblyConfig.day_of_week}
                  onChange={e => onAssemblyChange({ ...assemblyConfig, day_of_week: e.target.value })}
                  className="w-full text-sm border border-border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {DAYS.map(d => <option key={d} value={d}>{DAYS_FULL[d]}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1 block">Duration (min)</Label>
                <Input
                  type="number"
                  value={assemblyConfig.duration_minutes}
                  onChange={e => onAssemblyChange({ ...assemblyConfig, duration_minutes: Number(e.target.value) })}
                  min={10} max={60}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1 block">Position</Label>
                <select
                  value={assemblyConfig.position}
                  onChange={e => onAssemblyChange({ ...assemblyConfig, position: e.target.value as AssemblyConfig['position'] })}
                  className="w-full text-sm border border-border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="BEFORE_FIRST">Before Period 1</option>
                  <option value="FIRST_PERIOD">As Period 1</option>
                </select>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Right: summary box */}
      <div className="w-56 flex-shrink-0">
        <div className="sticky top-0 space-y-4">
          <div className="bg-gradient-to-br from-primary to-blue-700 rounded-xl p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-3">Class {selectedClass} Summary</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="opacity-80">Total periods/week</span>
                <span className="font-bold">{totalPeriodsWeek}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-80">Academic</span>
                <span className="font-semibold">{academicReqs.reduce((s, r) => s + r.periods_per_week, 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-80">ECA</span>
                <span className="font-semibold">{ecaReqs.reduce((s, r) => s + r.periods_per_week, 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-80">Double periods</span>
                <span className="font-semibold">{classReqs.filter(r => r.needs_double_period).reduce((s, r) => s + r.double_period_count, 0)}</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                SCERT AP recommends 35–40 periods/week for middle school, 38–42 for high school.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">All classes</p>
            {classYears.map(cy => {
              const cyTotal = requirements.filter(r => r.class_year === cy).reduce((s, r) => s + r.periods_per_week, 0)
              return (
                <div key={cy} className="flex justify-between items-center">
                  <span className="text-sm text-slate-700">Class {cy}</span>
                  <Badge variant={cyTotal > 0 ? 'secondary' : 'outline'} className="text-xs">
                    {cyTotal} periods
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
