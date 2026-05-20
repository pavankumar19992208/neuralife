import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle, RefreshCw, Sparkles, BookOpen, Calendar,
  Tablet, Share2,
} from 'lucide-react'
import {
  RadarChart, Radar, PolarAngleAxis, PolarGrid, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  LineChart, Line,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import PageHeader from '@/components/layout/PageHeader'
import { slideUp } from '@/lib/animations'
import { useStudentIntelligence, useRefreshStudentInsight, useCreateShareToken } from '@/hooks/useAnalytics'
import { cn } from '@/lib/utils'

function pct(n: number) { return `${n.toFixed(1)}%` }

const BAND_COLORS: Record<string, string> = {
  PLATINUM: 'bg-purple-100 text-purple-700 border-purple-200',
  GOLD:     'bg-yellow-100 text-yellow-700 border-yellow-200',
  SILVER:   'bg-slate-100 text-slate-700 border-slate-200',
  BRONZE:   'bg-orange-100 text-orange-700 border-orange-200',
}

const STATUS_COLORS: Record<string, string> = {
  AT_RISK:  'bg-red-100 text-red-700',
  ACTIVE:   'bg-green-100 text-green-700',
  INACTIVE: 'bg-slate-100 text-slate-500',
}

function AttendanceCalendar({ days }: { days: Array<{ date: string; status: string | null }> }) {
  if (days.length === 0) return <p className="text-sm text-slate-400">No attendance data</p>

  return (
    <div className="flex flex-wrap gap-1">
      {days.map((d) => (
        <div
          key={d.date}
          title={`${d.date}: ${d.status ?? 'No data'}`}
          className={cn(
            'w-5 h-5 rounded-sm',
            d.status === 'PRESENT' ? 'bg-success' :
            d.status === 'ABSENT'  ? 'bg-danger' :
            d.status === 'LATE'    ? 'bg-warning' :
            'bg-slate-100',
          )}
        />
      ))}
    </div>
  )
}

export default function StudentAnalyticsPage() {
  const { neuraId } = useParams<{ neuraId: string }>()
  const { data, isLoading, isError, refetch } = useStudentIntelligence(neuraId ?? '')
  const refresh = useRefreshStudentInsight()
  const createShare = useCreateShareToken()

  const [shareUrl, setShareUrl] = useState<string | null>(null)

  async function handleShare() {
    if (!neuraId) return
    const token = await createShare.mutateAsync(`/analytics/student/${neuraId}`)
    const url = `${window.location.origin}/shared/analytics/${token.token}`
    await navigator.clipboard.writeText(url).catch(() => {})
    setShareUrl(url)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-sm text-danger">
        <AlertTriangle className="h-4 w-4" />
        Failed to load student analytics.
        <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
      </div>
    )
  }

  const avgMastery = data.mastery.length > 0
    ? data.mastery.reduce((s, m) => s + m.mastery_pct, 0) / data.mastery.length
    : null

  // Radar data: student vs section vs class vs school
  const radarData = data.mastery.map((m) => ({
    subject: m.subject.length > 8 ? m.subject.slice(0, 8) + '…' : m.subject,
    student: m.mastery_pct,
    section: m.vs_class_avg != null && data.section_avg_mastery != null
      ? data.section_avg_mastery + m.vs_class_avg
      : data.section_avg_mastery ?? 0,
    school: data.school_avg_mastery ?? 0,
  }))

  return (
    <div>
      <PageHeader
        title={data.full_name}
        description={`${data.neura_id} · Class ${data.class_year}-${data.section} · ${data.medium}`}
        backHref={`/analytics/section/${data.class_year}/${data.section}`}
        bookmarkUrl={`/analytics/student/${data.neura_id}`}
        bookmarkTitle={`${data.full_name} — Analytics`}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={createShare.isPending}
              className="gap-1.5 text-xs"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refresh.mutate(data.neura_id)}
              disabled={refresh.isPending}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refresh.isPending && 'animate-spin')} />
              Refresh AI
            </Button>
          </div>
        }
      />

      {shareUrl && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg flex items-center gap-2 text-sm text-success">
          Share link copied: <code className="text-xs bg-white px-2 py-0.5 rounded">{shareUrl}</code>
        </div>
      )}

      <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-6">
        {/* Profile header */}
        <div className="flex flex-wrap gap-3 items-center">
          {data.band && (
            <span className={cn(
              'text-xs font-semibold px-3 py-1 rounded-full border',
              BAND_COLORS[data.band] ?? 'bg-slate-100 text-slate-600',
            )}>
              {data.band}
            </span>
          )}
          <span className={cn(
            'text-xs font-semibold px-3 py-1 rounded-full',
            STATUS_COLORS[data.status] ?? 'bg-slate-100 text-slate-600',
          )}>
            {data.status}
          </span>
          {data.is_rte_student && (
            <Badge variant="outline" className="text-xs">RTE</Badge>
          )}
          {data.smartpad_id && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Tablet className="h-3 w-3" />{data.smartpad_id}
            </span>
          )}
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Avg Mastery', value: avgMastery != null ? pct(avgMastery) : '—', color: avgMastery != null && avgMastery >= 70 ? 'text-success' : 'text-danger' },
            { label: '90d Attendance', value: pct(data.attendance_rate_90d), color: data.attendance_rate_90d >= 75 ? 'text-success' : 'text-danger' },
            { label: 'SmartPad Sessions', value: String(data.smartpad_sessions_90d), color: 'text-secondary' },
            { label: 'Avg Session', value: `${data.avg_session_minutes.toFixed(0)}min`, color: 'text-secondary' },
          ].map((k) => (
            <Card key={k.label}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-slate-500">{k.label}</p>
                <p className={cn('text-xl font-bold mt-1', k.color)}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI Insight */}
        {data.ai_insight && (
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />AI Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 leading-relaxed">{data.ai_insight}</p>
            </CardContent>
          </Card>
        )}

        {/* Radar: 5-way comparison */}
        {radarData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Subject Mastery vs Averages</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <Radar name="Student" dataKey="student" stroke="#1e40af" fill="#1e40af" fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="School Avg" dataKey="school" stroke="#94a3b8" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`]} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Subject mastery bars */}
        {data.mastery.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Mastery by Subject</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.mastery} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="subject" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Mastery']} />
                  <Bar dataKey="mastery_pct" radius={[0, 4, 4, 0]}>
                    {data.mastery.map((m, i) => (
                      <Cell key={i} fill={m.mastery_pct >= 70 ? '#10b981' : m.mastery_pct >= 50 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Mastery trajectory */}
        {data.mastery_trajectory.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Mastery Trajectory</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={data.mastery_trajectory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Avg Percentile']} />
                  <Line type="monotone" dataKey="avg_percentile" stroke="#1e40af" strokeWidth={2} dot={{ fill: '#1e40af', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* 90-day attendance calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              90-Day Attendance
              <span className="ml-auto text-xs font-normal text-slate-500">
                {pct(data.attendance_rate_90d)} present
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceCalendar days={data.attendance_90d} />
            <div className="flex gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-success" />Present</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-danger" />Absent</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-warning" />Late</span>
            </div>
          </CardContent>
        </Card>

        {/* Exam history */}
        {data.exam_history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />Exam History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="text-left py-2 font-medium">Exam</th>
                      <th className="text-left py-2 font-medium">Subject</th>
                      <th className="text-right py-2 font-medium">Marks</th>
                      <th className="text-right py-2 font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.exam_history.map((e, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 font-medium text-slate-900">{e.exam_name}</td>
                        <td className="py-2 text-slate-600">{e.subject}</td>
                        <td className="py-2 text-right text-slate-600">
                          {e.marks ?? '—'}/{e.max_marks}
                        </td>
                        <td className="py-2 text-right">
                          {e.percentage != null ? (
                            <span className={cn(
                              'font-semibold',
                              e.percentage >= 70 ? 'text-success' : e.percentage >= 50 ? 'text-warning' : 'text-danger',
                            )}>
                              {pct(e.percentage)}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error patterns */}
        {data.error_patterns.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Error Patterns</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.error_patterns.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className="text-slate-400 w-5">{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{e.pattern}</p>
                      <p className="text-slate-400">{e.subject}</p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {e.occurrences}×
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  )
}

