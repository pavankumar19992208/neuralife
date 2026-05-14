import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  ArrowLeft, Users, UserCheck, UserX, BarChart2,
  AlertCircle, Calendar, TrendingUp, Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import PageLayout from '@/components/layout/PageLayout'
import { slideUp } from '@/lib/animations'
import { useAttendanceAnalytics } from '@/hooks/useAttendance'
import type { AnalyticsRange, ClassAttendanceSummary, AttendanceStudentSummary } from '@/types/common'

// ─── Helpers ──────────────────────────────────────────────────────────────

function todayIST(): string {
  const now = new Date()
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0]
}

function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function pctBadgeClass(pct: number): string {
  if (pct >= 90) return 'bg-success/10 text-success border-success/30'
  if (pct >= 75) return 'bg-warning/10 text-warning border-warning/30'
  return 'bg-danger/10 text-danger border-danger/30'
}

function heatmapCell(pct: number, hasData: boolean): string {
  if (!hasData) return 'bg-surface-raised'
  if (pct >= 90) return 'bg-success/80'
  if (pct >= 75) return 'bg-warning/70'
  if (pct > 0) return 'bg-danger/70'
  return 'bg-slate-200'
}

// ─── KPI Card ─────────────────────────────────────────────────────────────

function KPICard({
  label, value, sub, icon, highlight,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  highlight?: 'success' | 'danger' | 'warning' | 'default'
}) {
  const valueColor =
    highlight === 'success' ? 'text-success' :
    highlight === 'danger' ? 'text-danger' :
    highlight === 'warning' ? 'text-warning' :
    'text-text-primary'

  return (
    <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-muted font-medium">{label}</p>
        <p className={`text-2xl font-bold tracking-tight ${valueColor}`}>{value}</p>
        {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Heatmap Calendar ─────────────────────────────────────────────────────

function HeatmapView({
  trend,
  range,
}: {
  trend: Array<{ date: string; present_pct: number; total: number }>
  range: AnalyticsRange
}) {
  const trendMap = new Map(trend.map((t) => [t.date, t]))

  if (trend.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-text-muted text-sm">
        No data available for this period
      </div>
    )
  }

  // For day range heatmap makes no sense — show a single large bar
  if (range === 'day') {
    const t = trend[0]
    if (!t) return null
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="text-xs text-text-muted">{fmtDate(t.date)}</div>
        <div className="flex items-end gap-1 h-24">
          <div className="w-12 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md bg-success/70 transition-all"
              style={{ height: `${t.present_pct}%` }}
            />
            <span className="text-xs text-text-muted">Present</span>
          </div>
        </div>
        <div className="text-lg font-bold text-success">{t.present_pct}%</div>
      </div>
    )
  }

  // Build a calendar grid for week/month/quarter
  // Find earliest and latest dates
  const dates = trend.map((t) => t.date).sort()
  const start = new Date(dates[0] + 'T00:00:00')
  const end = new Date(dates[dates.length - 1] + 'T00:00:00')

  // Pad start to Monday
  const startDay = start.getDay()
  const padBefore = startDay === 0 ? 6 : startDay - 1
  const cells: Array<{ date: string | null; pct: number; hasData: boolean }> = []

  for (let i = 0; i < padBefore; i++) cells.push({ date: null, pct: 0, hasData: false })

  const cur = new Date(start)
  while (cur <= end) {
    const d = cur.toISOString().split('T')[0]
    const dayOfWeek = cur.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const t = trendMap.get(d)
      cells.push({ date: d, pct: t?.present_pct ?? 0, hasData: !!t })
    } else {
      cells.push({ date: d, pct: 0, hasData: false })
    }
    cur.setDate(cur.getDate() + 1)
  }

  const weeks: typeof cells[] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <div className="space-y-2 overflow-x-auto">
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="text-center text-xs text-text-muted font-medium">{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1">
          {week.map((cell, ci) => (
            <div
              key={ci}
              title={cell.date ? `${fmtDate(cell.date)}: ${cell.pct}%` : ''}
              className={`h-9 rounded-md transition-opacity ${
                cell.date === null
                  ? 'opacity-0'
                  : cell.hasData
                    ? `${heatmapCell(cell.pct, true)} cursor-default`
                    : 'bg-surface-raised'
              }`}
            >
              {cell.date && (
                <div className="h-full flex flex-col items-center justify-center">
                  <span className="text-[10px] text-white font-medium leading-none">
                    {cell.hasData ? `${cell.pct}%` : ''}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 justify-end">
        {[
          { label: '≥90%', cls: 'bg-success/80' },
          { label: '75–89%', cls: 'bg-warning/70' },
          { label: '<75%', cls: 'bg-danger/70' },
          { label: 'No data', cls: 'bg-surface-raised border border-border' },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded-sm ${cls}`} />
            <span className="text-xs text-text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Chart View ──────────────────────────────────────────────────────────

function ChartView({
  trend,
  classes,
  range,
}: {
  trend: Array<{ date: string; present: number; absent: number; late: number; present_pct: number }>
  classes: ClassAttendanceSummary[]
  range: AnalyticsRange
}) {
  if (range === 'day') {
    // For day view: class-wise bar chart
    const chartData = classes.map((c) => ({
      name: `${c.class_year}-${c.section}`,
      Present: c.present,
      Absent: c.absent,
      Late: c.late,
      pct: c.present_pct,
    }))

    return (
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={(value, name) => name === 'pct' ? [`${value}%`, 'Present %'] : [value, name]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="left" dataKey="Present" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
          <Bar yAxisId="left" dataKey="Late" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
          <Bar yAxisId="left" dataKey="Absent" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="pct" stroke="#1e40af" strokeWidth={2} dot={{ r: 3, fill: '#1e40af' }} name="Present %" />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  // Multi-day: trend chart
  const chartData = trend.map((t) => ({
    name: fmtDate(t.date),
    Present: t.present,
    Absent: t.absent,
    Late: t.late,
    pct: t.present_pct,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" />
        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          formatter={(value, name) => name === 'pct' ? [`${value}%`, 'Present %'] : [value, String(name)]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="left" dataKey="Present" stackId="a" fill="#10b981" />
        <Bar yAxisId="left" dataKey="Late" stackId="a" fill="#f59e0b" />
        <Bar yAxisId="left" dataKey="Absent" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="pct" stroke="#1e40af" strokeWidth={2} dot={false} name="Present %" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ─── Class Breakdown ──────────────────────────────────────────────────────

function ClassBreakdown({
  classes,
  range,
  activeFilter,
  onFilter,
}: {
  classes: ClassAttendanceSummary[]
  range: AnalyticsRange
  activeFilter: { classKey: string; type: 'absent' | 'present' } | null
  onFilter: (f: { classKey: string; type: 'absent' | 'present' } | null) => void
}) {
  const handleClick = (classKey: string, type: 'absent' | 'present') => {
    if (activeFilter?.classKey === classKey && activeFilter?.type === type) {
      onFilter(null)
    } else {
      onFilter({ classKey, type })
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-xs font-semibold text-text-secondary">Class</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-text-secondary">Total</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-success">Present</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-danger">Absent</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-warning">Late</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-text-secondary">Rate</th>
            {range === 'day' && (
              <th className="text-left py-2 px-3 text-xs font-semibold text-text-secondary">Teacher</th>
            )}
          </tr>
        </thead>
        <tbody>
          {classes.map((c) => {
            const classKey = `${c.class_year}-${c.section}`
            const isAbsentActive = activeFilter?.classKey === classKey && activeFilter?.type === 'absent'
            const isPresentActive = activeFilter?.classKey === classKey && activeFilter?.type === 'present'

            return (
              <tr
                key={classKey}
                className="border-b border-border last:border-0 hover:bg-surface-raised/50 transition-colors"
              >
                <td className="py-2.5 px-3">
                  <span className="font-semibold text-text-primary">Class {c.class_year}</span>
                  <span className="text-text-muted ml-1">·</span>
                  <span className="text-text-secondary ml-1">Section {c.section}</span>
                </td>
                <td className="py-2.5 px-3 text-right font-medium text-text-primary">{c.total}</td>
                <td className="py-2.5 px-3 text-right">
                  {range === 'day' ? (
                    <button
                      type="button"
                      onClick={() => handleClick(classKey, 'present')}
                      className={`font-semibold transition-colors rounded px-1 ${
                        isPresentActive ? 'bg-success/20 text-success' : 'text-success hover:bg-success/10'
                      }`}
                    >
                      {c.present}
                    </button>
                  ) : (
                    <span className="font-semibold text-success">{c.present}</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right">
                  {range === 'day' ? (
                    <button
                      type="button"
                      onClick={() => handleClick(classKey, 'absent')}
                      className={`font-semibold transition-colors rounded px-1 ${
                        isAbsentActive ? 'bg-danger/20 text-danger' : 'text-danger hover:bg-danger/10'
                      }`}
                    >
                      {c.absent}
                    </button>
                  ) : (
                    <span className="font-semibold text-danger">{c.absent}</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right font-semibold text-warning">{c.late}</td>
                <td className="py-2.5 px-3 text-right">
                  <Badge className={`text-xs font-semibold ${pctBadgeClass(c.present_pct)}`}>
                    {c.present_pct}%
                  </Badge>
                </td>
                {range === 'day' && (
                  <td className="py-2.5 px-3">
                    {c.marked_by_name ? (
                      <div>
                        <p className="text-xs font-medium text-text-primary">{c.marked_by_name}</p>
                        {c.marked_at && (
                          <p className="text-[10px] text-text-muted">{fmtTime(c.marked_at)}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted italic">Not marked</span>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Student List Panel ────────────────────────────────────────────────────

function StudentListPanel({
  tab,
  onTabChange,
  absentStudents,
  presentStudents,
  classFilter,
  onClearFilter,
}: {
  tab: 'absent' | 'present'
  onTabChange: (t: 'absent' | 'present') => void
  absentStudents: AttendanceStudentSummary[]
  presentStudents: AttendanceStudentSummary[]
  classFilter: string | null
  onClearFilter: () => void
}) {
  const [search, setSearch] = useState('')

  const students = tab === 'absent' ? absentStudents : presentStudents

  const filtered = useMemo(() => {
    let list = students
    if (classFilter) {
      list = list.filter((s) => `${s.class_year}-${s.section}` === classFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((s) => s.full_name.toLowerCase().includes(q))
    }
    return list
  }, [students, classFilter, search])

  // Group by class
  const grouped = useMemo(() => {
    const groups = new Map<string, AttendanceStudentSummary[]>()
    for (const s of filtered) {
      const key = `Class ${s.class_year} · Section ${s.section}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(s)
    }
    return [...groups.entries()]
  }, [filtered])

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface-raised rounded-lg w-fit">
        {(['absent', 'present'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTabChange(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t === 'absent' ? `Absent (${absentStudents.length})` : `Present (${presentStudents.length})`}
          </button>
        ))}
      </div>

      {/* Filter banner + search */}
      <div className="flex items-center gap-2 flex-wrap">
        {classFilter && (
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-1.5 text-xs">
            <span className="text-primary font-medium">Filtered: {classFilter}</span>
            <button
              type="button"
              onClick={onClearFilter}
              className="text-primary hover:text-primary/70"
              aria-label="Clear filter"
            >
              ✕
            </button>
          </div>
        )}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 bg-white"
          />
        </div>
      </div>

      {/* Student groups */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">
            {search ? 'No students match your search.' : `No ${tab} students${classFilter ? ' in this class' : ''}.`}
          </div>
        ) : (
          grouped.map(([groupLabel, groupStudents]) => (
            <div key={groupLabel}>
              <p className="text-xs font-semibold text-text-secondary mb-1.5 px-1">{groupLabel}</p>
              <div className="space-y-1">
                {groupStudents.map((s) => (
                  <div
                    key={s.neura_id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-raised/50 hover:bg-surface-raised transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-semibold text-white ${
                        tab === 'absent' ? 'bg-danger/70' : 'bg-success/70'
                      }`}>
                        {s.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <p className="text-sm font-medium text-text-primary truncate">{s.full_name}</p>
                    </div>
                    {tab === 'absent' && s.reason && s.reason !== 'No reason' && (
                      <span className="text-xs text-text-muted italic flex-shrink-0 ml-2">{s.reason}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
]

export default function AttendanceAnalyticsPage() {
  const navigate = useNavigate()
  const [range, setRange] = useState<AnalyticsRange>('day')
  const [date, setDate] = useState(todayIST())
  const [chartView, setChartView] = useState<'bar' | 'heatmap'>('bar')
  const [activeFilter, setActiveFilter] = useState<{ classKey: string; type: 'absent' | 'present' } | null>(null)
  const [studentTab, setStudentTab] = useState<'absent' | 'present'>('absent')

  const { data, isLoading, isError, refetch } = useAttendanceAnalytics(range, date)

  const trendForHeatmap = useMemo(
    () => (data?.trend ?? []).map((t) => ({ date: t.date, present_pct: t.present_pct, total: t.total })),
    [data],
  )

  const handleFilter = (f: { classKey: string; type: 'absent' | 'present' } | null) => {
    setActiveFilter(f)
    if (f) setStudentTab(f.type)
  }

  const presentPct = data?.overall.present_pct ?? 0

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/attendance')}
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:bg-surface-raised transition-colors"
            aria-label="Back to Attendance"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Attendance Analytics</h1>
            <p className="text-xs text-text-muted">School-wide attendance insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            max={todayIST()}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          />
        </div>
      </div>

      <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-4">

        {/* Range selector */}
        <div className="flex items-center gap-1 p-1 bg-white border border-border rounded-xl shadow-sm w-fit">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => { setRange(r.value); setActiveFilter(null) }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                range === r.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && <AnalyticsSkeleton />}

        {/* Error */}
        {isError && !isLoading && (
          <div className="bg-white rounded-xl border border-border p-8 text-center shadow-sm">
            <AlertCircle className="h-8 w-8 text-danger mx-auto mb-3" />
            <p className="font-medium text-text-primary">Could not load analytics</p>
            <p className="text-sm text-text-muted mt-1">Check your connection and try again.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}

        {/* Data */}
        {!isLoading && !isError && data && (
          <>
            {/* KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard
                label="Present Rate"
                value={`${presentPct}%`}
                sub={`${data.overall.classes_marked}/${data.overall.total_classes} classes marked`}
                icon={<TrendingUp className="h-4 w-4 text-primary" />}
                highlight={presentPct >= 90 ? 'success' : presentPct >= 75 ? 'warning' : 'danger'}
              />
              <KPICard
                label="Total Students"
                value={data.overall.total_students}
                sub="enrolled & active"
                icon={<Users className="h-4 w-4 text-primary" />}
              />
              <KPICard
                label="Present"
                value={data.overall.present}
                sub={range !== 'day' ? 'cumulative' : undefined}
                icon={<UserCheck className="h-4 w-4 text-success" />}
                highlight="success"
              />
              <KPICard
                label="Absent"
                value={data.overall.absent}
                sub={range !== 'day' ? 'cumulative' : undefined}
                icon={<UserX className="h-4 w-4 text-danger" />}
                highlight={data.overall.absent > 0 ? 'danger' : 'default'}
              />
            </div>

            {/* Chart section */}
            <div className="bg-white rounded-xl border border-border shadow-sm">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-text-primary">
                  {range === 'day' ? 'Class-wise Breakdown' : 'Attendance Trend'}
                </h2>
                <div className="flex items-center gap-1 p-0.5 bg-surface-raised rounded-lg">
                  <button
                    type="button"
                    onClick={() => setChartView('bar')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      chartView === 'bar' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
                    }`}
                  >
                    <BarChart2 className="h-3.5 w-3.5" />
                    Bar + Line
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('heatmap')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      chartView === 'heatmap' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Heatmap
                  </button>
                </div>
              </div>
              <div className="p-5">
                <AnimatePresence mode="wait">
                  {chartView === 'bar' ? (
                    <motion.div
                      key="bar"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ChartView
                        trend={data.trend}
                        classes={data.classes}
                        range={range}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="heatmap"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <HeatmapView trend={trendForHeatmap} range={range} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Class Breakdown Table */}
            {data.classes.length > 0 && (
              <div className="bg-white rounded-xl border border-border shadow-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold text-text-primary">Class Breakdown</h2>
                  {range === 'day' && (
                    <p className="text-xs text-text-muted mt-0.5">
                      Click present/absent counts to filter student list below
                    </p>
                  )}
                </div>
                <div className="p-2">
                  <ClassBreakdown
                    classes={data.classes}
                    range={range}
                    activeFilter={activeFilter}
                    onFilter={handleFilter}
                  />
                </div>
              </div>
            )}

            {/* Student Lists — day range only */}
            {range === 'day' && (data.absent_students || data.present_students) && (
              <div className="bg-white rounded-xl border border-border shadow-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold text-text-primary">Students</h2>
                </div>
                <div className="p-5">
                  <StudentListPanel
                    tab={studentTab}
                    onTabChange={setStudentTab}
                    absentStudents={data.absent_students ?? []}
                    presentStudents={data.present_students ?? []}
                    classFilter={activeFilter?.type === studentTab ? activeFilter.classKey : null}
                    onClearFilter={() => setActiveFilter(null)}
                  />
                </div>
              </div>
            )}

            {/* Multi-day note */}
            {range !== 'day' && (
              <div className="bg-surface-raised rounded-xl px-5 py-3 border border-border text-center">
                <p className="text-xs text-text-muted">
                  Switch to <strong>Day</strong> view to see individual absent and present student lists.
                </p>
              </div>
            )}
          </>
        )}
      </motion.div>
    </PageLayout>
  )
}
