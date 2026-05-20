import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap, CalendarCheck, IndianRupee, Tablet, TrendingUp,
  RefreshCw, AlertTriangle, Sparkles, ArrowUp, ArrowDown, Minus,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, ScatterChart, Scatter, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import PageHeader from '@/components/layout/PageHeader'
import { staggerChildren } from '@/lib/animations'
import {
  useNarrative, useRefreshNarrative, useAcademicAnalytics,
  useAttendanceDeepAnalytics, useFinancialAnalytics, useDigitalAnalytics,
  useYoYComparison, useBenchmarks,
} from '@/hooks/useAnalytics'
import type { AnalyticsPeriod } from '@/types/common'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { id: 'academic',    label: 'Academic',        icon: GraduationCap },
  { id: 'attendance',  label: 'Attendance',       icon: CalendarCheck },
  { id: 'financial',   label: 'Financial',        icon: IndianRupee },
  { id: 'digital',     label: 'Digital',          icon: Tablet },
  { id: 'yoy',         label: 'YoY & Benchmarks', icon: TrendingUp },
]

function fmt(n: number) { return n.toLocaleString('en-IN') }
function pct(n: number) { return `${n.toFixed(1)}%` }

function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-success">
      <ArrowUp className="h-3 w-3" />{Math.abs(delta).toFixed(1)}%
    </span>
  )
  if (delta < 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-danger">
      <ArrowDown className="h-3 w-3" />{Math.abs(delta).toFixed(1)}%
    </span>
  )
  return <span className="inline-flex items-center gap-0.5 text-xs text-slate-400"><Minus className="h-3 w-3" />0%</span>
}

// ── Narrative ──────────────────────────────────────────────────────────────────
function NarrativeSection({ period }: { period: AnalyticsPeriod }) {
  const { data, isLoading } = useNarrative(period)
  const refresh = useRefreshNarrative()

  if (isLoading) return <Skeleton className="h-36 w-full rounded-xl" />

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold text-primary">AI School Narrative</CardTitle>
            {data && (
              <span className="text-xs text-slate-400">
                {new Date(data.generated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refresh.mutate(period)}
            disabled={refresh.isPending}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refresh.isPending && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {data ? (
          <>
            <p className="text-sm text-slate-700 leading-relaxed">{data.narrative_text}</p>
            {data.key_insights.length > 0 && (
              <ul className="space-y-1">
                {data.key_insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400">No narrative generated yet. Click Refresh to generate.</p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Academic ───────────────────────────────────────────────────────────────────
function AcademicSection({ period }: { period: AnalyticsPeriod }) {
  const { data, isLoading, isError, refetch } = useAcademicAnalytics(period)

  if (isLoading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
    </div>
  )
  if (isError) return (
    <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-sm text-danger">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      Failed to load academic analytics.
      <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
    </div>
  )
  if (!data) return null

  const funnel = data.at_risk_funnel
  const funnelStages = [
    { label: 'All Students', value: funnel.stage_1_total, color: '#1e40af' },
    { label: 'Declining',    value: funnel.stage_2_declining, color: '#f59e0b' },
    { label: 'At-Risk',      value: funnel.stage_3_at_risk, color: '#f97316' },
    { label: 'No Intervention', value: funnel.stage_4_unintervened, color: '#ef4444' },
    { label: 'Critical',    value: funnel.stage_5_critical, color: '#b91c1c' },
  ]

  return (
    <div className="space-y-6">
      {/* Subject Mastery */}
      {data.subject_mastery.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Subject Mastery</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.subject_mastery} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="subject" width={90} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Mastery']} />
                <Bar dataKey="avg_score" radius={[0, 4, 4, 0]}>
                  {data.subject_mastery.map((_, i) => (
                    <Cell key={i} fill={_.avg_score >= 70 ? '#10b981' : _.avg_score >= 50 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* At-Risk Funnel */}
      <Card>
        <CardHeader><CardTitle className="text-sm">At-Risk Funnel</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            {funnelStages.map((s, i) => (
              <div key={i} className="flex-1 text-center">
                <div
                  className="rounded-t-md mx-auto"
                  style={{
                    background: s.color,
                    height: `${Math.max(20, (s.value / funnel.stage_1_total) * 120)}px`,
                    width: '100%',
                    opacity: 0.85,
                  }}
                />
                <p className="text-xs font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-slate-500 leading-tight mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Teacher Performance */}
      {data.teacher_performance.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Teacher Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="text-left py-2 font-medium">Teacher</th>
                    <th className="text-left py-2 font-medium">Subject</th>
                    <th className="text-right py-2 font-medium">Students</th>
                    <th className="text-right py-2 font-medium">Mastery</th>
                    <th className="text-right py-2 font-medium">vs Avg</th>
                    <th className="text-right py-2 font-medium">At-Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {data.teacher_performance.map((t) => (
                    <tr key={t.teacher_id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-2 font-medium text-slate-900">{t.teacher_name}</td>
                      <td className="py-2 text-slate-600">{t.subject}</td>
                      <td className="py-2 text-right">{t.student_count}</td>
                      <td className="py-2 text-right">
                        {t.avg_mastery_score != null ? pct(t.avg_mastery_score) : '—'}
                      </td>
                      <td className="py-2 text-right">
                        {t.vs_school_avg != null ? <DeltaBadge delta={t.vs_school_avg} /> : '—'}
                      </td>
                      <td className="py-2 text-right">
                        {t.at_risk_count > 0 ? (
                          <Badge variant="destructive" className="text-xs">{t.at_risk_count}</Badge>
                        ) : (
                          <span className="text-success font-medium">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Curriculum Gaps */}
      {data.curriculum_gaps.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Curriculum Gaps (Mastery &lt; 60%)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.curriculum_gaps.slice(0, 10).map((g, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-slate-500 flex-shrink-0 truncate">{g.subject}</div>
                  <div className="flex-1 text-xs text-slate-700 truncate">{g.chapter_title}</div>
                  <div className="w-12 text-right">
                    <span className={cn(
                      'text-xs font-semibold',
                      g.mastery_pct < 40 ? 'text-danger' : 'text-warning',
                    )}>
                      {pct(g.mastery_pct)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* RTE Comparison */}
      {data.rte_comparison && (
        <Card>
          <CardHeader><CardTitle className="text-sm">RTE vs Non-RTE Students</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Mastery Avg', rte: data.rte_comparison.rte_mastery_avg, nonRte: data.rte_comparison.non_rte_mastery_avg },
                { label: 'Attendance Avg', rte: data.rte_comparison.rte_attendance_avg, nonRte: data.rte_comparison.non_rte_attendance_avg },
              ].map((m) => (
                <div key={m.label} className="space-y-1">
                  <p className="text-xs font-medium text-slate-600">{m.label}</p>
                  <div className="flex gap-4">
                    <div>
                      <p className="text-lg font-bold text-primary">{pct(m.rte)}</p>
                      <p className="text-xs text-slate-400">RTE ({data.rte_comparison!.rte_students})</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-secondary">{pct(m.nonRte)}</p>
                      <p className="text-xs text-slate-400">Non-RTE ({data.rte_comparison!.non_rte_students})</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Attendance ─────────────────────────────────────────────────────────────────
function AttendanceSection({ period }: { period: AnalyticsPeriod }) {
  const { data, isLoading, isError, refetch } = useAttendanceDeepAnalytics(period)

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />
  if (isError) return (
    <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-sm text-danger">
      <AlertTriangle className="h-4 w-4" />
      Failed to load attendance analytics.
      <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
    </div>
  )
  if (!data) return null

  return (
    <div className="space-y-6">
      {/* 30-day trend */}
      {data.trend_30d.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">30-Day Attendance Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.trend_30d}>
                <defs>
                  <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e40af" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 10 }} interval={4} />
                <YAxis domain={[60, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Rate']} labelFormatter={l => `Date: ${l}`} />
                <Area type="monotone" dataKey="rate" stroke="#1e40af" strokeWidth={2} fill="url(#attGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Day of week */}
      {data.day_of_week.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Attendance by Day of Week</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={data.day_of_week}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis domain={[60, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Avg Rate']} />
                <Bar dataKey="avg_rate" radius={[4, 4, 0, 0]}>
                  {data.day_of_week.map((d, i) => (
                    <Cell key={i} fill={d.below_school_avg ? '#ef4444' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Chronic Absentees */}
      {data.chronic_absentees.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Chronic Absentees (&gt;15 days)</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="text-left py-2 font-medium">Student</th>
                    <th className="text-left py-2 font-medium">Class</th>
                    <th className="text-right py-2 font-medium">Absent Days</th>
                    <th className="text-right py-2 font-medium">Rate</th>
                    <th className="text-right py-2 font-medium">Fee Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.chronic_absentees.map((a) => (
                    <tr key={a.neura_id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-2 font-medium text-slate-900">{a.name}</td>
                      <td className="py-2 text-slate-600">{a.class_year}-{a.section}</td>
                      <td className="py-2 text-right text-danger font-semibold">{a.absent_days}</td>
                      <td className="py-2 text-right">{pct(a.rate)}</td>
                      <td className="py-2 text-right">
                        <Badge
                          className="text-xs"
                          variant={a.fee_status === 'PAID' ? 'outline' : 'destructive'}
                        >
                          {a.fee_status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Financial ──────────────────────────────────────────────────────────────────
function FinancialSection({ period }: { period: AnalyticsPeriod }) {
  const { data, isLoading, isError, refetch } = useFinancialAnalytics(period)

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />
  if (isError) return (
    <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-sm text-danger">
      <AlertTriangle className="h-4 w-4" />
      Failed to load financial analytics.
      <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
    </div>
  )
  if (!data) return null

  const summary = data.financial_summary
  const ratio = data.salary_revenue_ratio

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Fee Revenue', value: fmt(summary.revenue), unit: '₹' },
          { label: 'Salary Expense', value: fmt(summary.salary), unit: '₹' },
          { label: 'Surplus', value: fmt(summary.surplus), unit: '₹' },
          { label: 'Annual Projection', value: fmt(summary.annual_projection), unit: '₹' },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{k.unit}{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Collection trend */}
      {data.collection_trend.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Monthly Fee Collection</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.collection_trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`₹${fmt(Number(v))}`, '']} />
                <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="total_due" name="Total Due" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Salary vs Revenue ratio */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Salary–Revenue Ratio</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Salary Expense: <strong>₹{fmt(ratio.salary_expense)}</strong></span>
              <span className="text-slate-600">Fee Revenue: <strong>₹{fmt(ratio.fee_revenue)}</strong></span>
            </div>
            <div className="h-4 rounded-full overflow-hidden bg-slate-100">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  ratio.ratio > 0.7 ? 'bg-danger' : ratio.ratio > 0.5 ? 'bg-warning' : 'bg-success',
                )}
                style={{ width: `${Math.min(100, ratio.ratio * 100).toFixed(1)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 text-center">
              {pct(ratio.ratio * 100)} of revenue goes to salaries
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Digital ────────────────────────────────────────────────────────────────────
function DigitalSection({ period }: { period: AnalyticsPeriod }) {
  const { data, isLoading, isError, refetch } = useDigitalAnalytics(period)

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />
  if (isError) return (
    <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-sm text-danger">
      <AlertTriangle className="h-4 w-4" />
      Failed to load digital analytics.
      <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
    </div>
  )
  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Utilization trend */}
      {data.utilization_trend.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">SmartPad Utilization Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={data.utilization_trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 10 }} interval={6} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Utilization']} />
                <Line type="monotone" dataKey="utilization_pct" stroke="#0d9488" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Usage vs Mastery scatter */}
      {data.usage_mastery_scatter.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Usage vs Mastery Correlation</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <ScatterChart margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="avg_daily_hours" name="Avg Daily Hours" tick={{ fontSize: 11 }} label={{ value: 'Hours/day', position: 'insideBottom', offset: -4, fontSize: 11 }} />
                <YAxis dataKey="mastery_pct" name="Mastery %" tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v, name) => [name === 'mastery_pct' ? `${Number(v).toFixed(1)}%` : `${Number(v).toFixed(1)}h`, name === 'mastery_pct' ? 'Mastery' : 'Hours'] as [string, string]} />
                <Scatter data={data.usage_mastery_scatter}>
                  {data.usage_mastery_scatter.map((d, i) => (
                    <Cell key={i} fill={d.is_at_risk ? '#ef4444' : '#0d9488'} opacity={0.7} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top content */}
      {data.top_content.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Top Content by Sessions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.top_content.slice(0, 8).map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-slate-400">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 truncate">{c.chapter_title}</p>
                    <p className="text-xs text-slate-400">{c.subject}</p>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">{c.session_count} sessions</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── YoY & Benchmarks ───────────────────────────────────────────────────────────
function YoYSection() {
  const { data: yoy, isLoading: yoyLoading } = useYoYComparison()
  const { data: benchmarks, isLoading: bmLoading } = useBenchmarks()

  return (
    <div className="space-y-6">
      {/* YoY Comparison */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Year-over-Year Comparison</CardTitle></CardHeader>
        <CardContent>
          {yoyLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="text-left py-2 font-medium">Metric</th>
                    <th className="text-right py-2 font-medium">This Year</th>
                    <th className="text-right py-2 font-medium">Last Year</th>
                    <th className="text-right py-2 font-medium">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {(yoy ?? []).map((row) => (
                    <tr key={row.metric} className="border-b last:border-0">
                      <td className="py-2 font-medium text-slate-900">{row.metric}</td>
                      <td className="py-2 text-right">{row.this_year.toFixed(1)}</td>
                      <td className="py-2 text-right text-slate-500">{row.last_year.toFixed(1)}</td>
                      <td className="py-2 text-right"><DeltaBadge delta={row.delta} /></td>
                    </tr>
                  ))}
                  {!yoy?.length && (
                    <tr><td colSpan={4} className="py-4 text-center text-slate-400">No comparison data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Benchmarks */}
      <Card>
        <CardHeader><CardTitle className="text-sm">District Benchmarks</CardTitle></CardHeader>
        <CardContent>
          {bmLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-4">
              {(benchmarks ?? []).map((b) => (
                <div key={b.metric} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-900">{b.metric}</span>
                    <Badge
                      className="text-xs"
                      variant={b.percentile_label === 'TOP_25' ? 'default' : b.percentile_label === 'BOTTOM_25' ? 'destructive' : 'outline'}
                    >
                      {b.percentile_label.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                    {/* P25/P50/P75 markers */}
                    <div className="absolute top-0 h-full w-0.5 bg-slate-300" style={{ left: '25%' }} />
                    <div className="absolute top-0 h-full w-0.5 bg-slate-300" style={{ left: '50%' }} />
                    <div className="absolute top-0 h-full w-0.5 bg-slate-300" style={{ left: '75%' }} />
                    {/* School position */}
                    <div
                      className="absolute top-1 w-2 h-2 rounded-full bg-primary -translate-x-1/2"
                      style={{ left: `${Math.min(95, Math.max(5, ((b.school_value - b.p25) / (b.p75 - b.p25 || 1)) * 50 + 25))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>P25: {b.p25.toFixed(1)}</span>
                    <span className="font-semibold text-primary">You: {b.school_value.toFixed(1)}</span>
                    <span>P75: {b.p75.toFixed(1)}</span>
                  </div>
                </div>
              ))}
              {!benchmarks?.length && (
                <p className="text-sm text-slate-400 text-center py-4">No benchmark data available</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const [activeSection, setActiveSection] = useState('academic')

  const periodAction = (
    <Select value={period} onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}>
      <SelectTrigger className="w-32 h-8 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="month">This Month</SelectItem>
        <SelectItem value="term">This Term</SelectItem>
        <SelectItem value="year">This Year</SelectItem>
      </SelectContent>
    </Select>
  )

  return (
    <div>
      <PageHeader
        title="Analytics Intelligence"
        description="School-wide performance insights and AI-driven analysis"
        bookmarkUrl="/analytics"
        action={periodAction}
      />

      {/* Mobile section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 lg:hidden">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={() => setActiveSection(s.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              activeSection === s.id
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            <s.icon className="h-3.5 w-3.5" />
            {s.label}
          </a>
        ))}
      </div>

      <div className="flex gap-8">
        {/* Sticky left nav */}
        <aside className="hidden lg:block w-44 flex-shrink-0">
          <div className="sticky top-6 space-y-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  activeSection === s.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                <s.icon className="h-4 w-4 flex-shrink-0" />
                {s.label}
              </a>
            ))}
          </div>
        </aside>

        {/* Sections */}
        <motion.div
          variants={staggerChildren}
          initial="initial"
          animate="animate"
          className="flex-1 min-w-0 space-y-12"
        >
          <NarrativeSection period={period} />

          <section id="academic">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />Academic Intelligence
            </h2>
            <AcademicSection period={period} />
          </section>

          <section id="attendance">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />Attendance Deep-Dive
            </h2>
            <AttendanceSection period={period} />
          </section>

          <section id="financial">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-primary" />Financial Health
            </h2>
            <FinancialSection period={period} />
          </section>

          <section id="digital">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Tablet className="h-4 w-4 text-primary" />Digital Engagement
            </h2>
            <DigitalSection period={period} />
          </section>

          <section id="yoy">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />Year-over-Year & Benchmarks
            </h2>
            <YoYSection />
          </section>
        </motion.div>
      </div>
    </div>
  )
}
