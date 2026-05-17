import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Coffee, UtensilsCrossed, Info, CheckCircle, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { PeriodConfigRow, TimetableRequirement } from '@/types/common'

const DAYS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const DAYS_FULL: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday',
  THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday',
}

interface Step2HoursProps {
  periodConfig: PeriodConfigRow[]
  requirements: TimetableRequirement[]
  onConfigChange: (cfg: PeriodConfigRow[]) => void
}

function computePeriods(cfg: PeriodConfigRow): Array<{
  type: 'ASSEMBLY' | 'PERIOD' | 'BREAK' | 'LUNCH'
  label: string
  start: string
  end: string
}> {
  const slots: ReturnType<typeof computePeriods> = []
  let [h, m] = cfg.school_start_time.split(':').map(Number)

  function addMins(mins: number) {
    m += mins
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60 }
  }
  function fmt() {
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  }

  let periodNum = 1
  const totalPeriods = cfg.lunch_after_period
    ? 8
    : 7

  while (slots.length < 20 && periodNum <= totalPeriods) {
    const start = fmt()
    addMins(cfg.period_duration_minutes)
    const end = fmt()
    slots.push({ type: 'PERIOD', label: `P${periodNum}`, start, end })

    if (cfg.short_break_after_periods.includes(periodNum)) {
      const bStart = fmt()
      addMins(cfg.short_break_duration_min)
      slots.push({ type: 'BREAK', label: 'Break', start: bStart, end: fmt() })
    }
    if (cfg.lunch_after_period === periodNum) {
      const lStart = fmt()
      addMins(cfg.lunch_duration_minutes)
      slots.push({ type: 'LUNCH', label: 'Lunch', start: lStart, end: fmt() })
    }

    const [eh, em] = cfg.school_end_time.split(':').map(Number)
    if (h > eh || (h === eh && m >= em)) break

    periodNum++
  }

  return slots
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`
}

export default function Step2Hours({ periodConfig, requirements, onConfigChange }: Step2HoursProps) {
  const [selectedDay, setSelectedDay] = useState('MON')

  const dayConfig = periodConfig.find(c => c.day_of_week === selectedDay)!

  function updateDay(day: string, patch: Partial<PeriodConfigRow>) {
    onConfigChange(periodConfig.map(c => c.day_of_week === day ? { ...c, ...patch } : c))
  }

  function applyToAll(patch: Partial<PeriodConfigRow>) {
    onConfigChange(periodConfig.map(c => c.is_working_day ? { ...c, ...patch } : c))
  }

  function toggleBreakAfterPeriod(p: number) {
    const current = dayConfig.short_break_after_periods
    const updated = current.includes(p) ? current.filter(x => x !== p) : [...current, p].sort((a, b) => a - b)
    updateDay(selectedDay, { short_break_after_periods: updated })
  }

  const slots = dayConfig?.is_working_day ? computePeriods(dayConfig) : []
  const periodCount = slots.filter(s => s.type === 'PERIOD').length

  const workingDays = periodConfig.filter(c => c.is_working_day).length
  const periodsPerDay = periodCount

  const classYears = [...new Set(requirements.map(r => r.class_year))]
  const maxPeriodsNeeded = Math.max(...classYears.map(cy => {
    return requirements.filter(r => r.class_year === cy).reduce((s, r) => s + r.periods_per_week, 0)
  }), 0)
  const totalAvailablePerWeek = workingDays * periodsPerDay
  const hasEnoughSlots = totalAvailablePerWeek >= maxPeriodsNeeded

  return (
    <div className="flex gap-6 h-full">
      {/* Left: config panel */}
      <div className="flex-1 space-y-5">
        {/* Working days row */}
        <div>
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 block">
            Working Days
          </Label>
          <div className="flex gap-2">
            {DAYS_SHORT.map(day => {
              const cfg = periodConfig.find(c => c.day_of_week === day)!
              return (
                <button
                  key={day}
                  onClick={() => updateDay(day, { is_working_day: !cfg.is_working_day })}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all',
                    cfg.is_working_day
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300',
                  )}
                >
                  {day.slice(0, 3)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Day selector */}
        <div>
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 block">
            Configure Day
          </Label>
          <div className="flex gap-1.5 flex-wrap">
            {periodConfig.filter(c => c.is_working_day).map(c => (
              <button
                key={c.day_of_week}
                onClick={() => setSelectedDay(c.day_of_week)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                  selectedDay === c.day_of_week
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {DAYS_FULL[c.day_of_week]?.slice(0,3)}
              </button>
            ))}
          </div>
        </div>

        {/* Day config */}
        {dayConfig?.is_working_day && (
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-border rounded-xl p-5 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">{DAYS_FULL[selectedDay]}</h3>
              <button
                onClick={() => applyToAll({
                  school_start_time: dayConfig.school_start_time,
                  school_end_time: dayConfig.school_end_time,
                  period_duration_minutes: dayConfig.period_duration_minutes,
                  short_break_after_periods: dayConfig.short_break_after_periods,
                  short_break_duration_min: dayConfig.short_break_duration_min,
                  lunch_after_period: dayConfig.lunch_after_period,
                  lunch_duration_minutes: dayConfig.lunch_duration_minutes,
                })}
                className="text-xs text-primary font-medium hover:underline"
              >
                Apply to all working days →
              </button>
            </div>

            {/* Times */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Start time
                </Label>
                <Input
                  type="time"
                  value={dayConfig.school_start_time}
                  onChange={e => updateDay(selectedDay, { school_start_time: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block flex items-center gap-1">
                  <Clock className="h-3 w-3" /> End time
                </Label>
                <Input
                  type="time"
                  value={dayConfig.school_end_time}
                  onChange={e => updateDay(selectedDay, { school_end_time: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Period duration (min)</Label>
                <Input
                  type="number"
                  value={dayConfig.period_duration_minutes}
                  onChange={e => updateDay(selectedDay, { period_duration_minutes: Number(e.target.value) })}
                  min={30} max={90}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Breaks */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label className="text-xs text-slate-600 mb-2 block flex items-center gap-1">
                  <Coffee className="h-3 w-3 text-amber-500" /> Break after period
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: Math.max(periodCount - 1, 5) }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => toggleBreakAfterPeriod(p)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-xs font-semibold border transition-all',
                        dayConfig.short_break_after_periods.includes(p)
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-slate-500 border-border hover:border-amber-300',
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <Label className="text-xs text-slate-500 mb-1 block">Break duration (min)</Label>
                  <Input
                    type="number"
                    value={dayConfig.short_break_duration_min}
                    onChange={e => updateDay(selectedDay, { short_break_duration_min: Number(e.target.value) })}
                    min={5} max={30}
                    className="text-sm w-24"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-600 mb-2 block flex items-center gap-1">
                  <UtensilsCrossed className="h-3 w-3 text-green-600" /> Lunch after period
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => updateDay(selectedDay, { lunch_after_period: null })}
                    className={cn(
                      'px-3 h-8 rounded-lg text-xs font-semibold border transition-all',
                      dayConfig.lunch_after_period === null
                        ? 'bg-slate-500 text-white border-slate-500'
                        : 'bg-white text-slate-500 border-border hover:border-slate-300',
                    )}
                  >
                    None
                  </button>
                  {Array.from({ length: Math.max(periodCount, 5) }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => updateDay(selectedDay, { lunch_after_period: p })}
                      className={cn(
                        'w-8 h-8 rounded-lg text-xs font-semibold border transition-all',
                        dayConfig.lunch_after_period === p
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-white text-slate-500 border-border hover:border-green-300',
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <Label className="text-xs text-slate-500 mb-1 block">Lunch duration (min)</Label>
                  <Input
                    type="number"
                    value={dayConfig.lunch_duration_minutes}
                    onChange={e => updateDay(selectedDay, { lunch_duration_minutes: Number(e.target.value) })}
                    min={15} max={60}
                    className="text-sm w-24"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Period timeline */}
        {dayConfig?.is_working_day && slots.length > 0 && (
          <div>
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 block">
              Day Timeline — {DAYS_FULL[selectedDay]}
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {slots.map((slot, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex flex-col items-center px-2.5 py-1.5 rounded-lg text-xs font-medium',
                    slot.type === 'PERIOD' && 'bg-primary/10 text-primary border border-primary/20',
                    slot.type === 'BREAK'  && 'bg-amber-50 text-amber-700 border border-amber-200',
                    slot.type === 'LUNCH'  && 'bg-green-50 text-green-700 border border-green-200',
                  )}
                >
                  <span className="font-semibold">{slot.label}</span>
                  <span className="text-[10px] opacity-70">{formatTime(slot.start)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: slot utilization summary */}
      <div className="w-52 flex-shrink-0">
        <div className="sticky top-0 space-y-4">
          <div className={cn(
            'rounded-xl p-4 border-2',
            hasEnoughSlots
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200',
          )}>
            <div className="flex items-center gap-2 mb-3">
              {hasEnoughSlots
                ? <CheckCircle className="h-5 w-5 text-green-600" />
                : <AlertCircle className="h-5 w-5 text-red-600" />}
              <p className="font-semibold text-sm text-slate-800">
                {hasEnoughSlots ? 'Enough slots' : 'Not enough slots'}
              </p>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Working days</span>
                <span className="font-semibold">{workingDays}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Periods/day</span>
                <span className="font-semibold">{periodsPerDay}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
                <span className="text-slate-600">Available/week</span>
                <span className="font-bold">{totalAvailablePerWeek}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Needed/week</span>
                <span className={cn('font-bold', hasEnoughSlots ? 'text-green-700' : 'text-red-700')}>
                  {maxPeriodsNeeded}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-border rounded-xl p-3">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Per day</p>
            {periodConfig.filter(c => c.is_working_day).map(c => {
              const s = computePeriods(c)
              const count = s.filter(x => x.type === 'PERIOD').length
              return (
                <div key={c.day_of_week} className="flex justify-between items-center py-1">
                  <span className="text-xs text-slate-600">{DAYS_FULL[c.day_of_week]?.slice(0,3)}</span>
                  <span className="text-xs font-semibold text-slate-800">{count} periods</span>
                </div>
              )
            })}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800 leading-relaxed">
                AP schools typically run 7–8 periods/day, 45–50 min each, with 1 break and lunch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
