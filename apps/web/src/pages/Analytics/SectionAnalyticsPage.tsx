import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import PageHeader from '@/components/layout/PageHeader'
import { slideUp } from '@/lib/animations'
import { useSectionAnalytics } from '@/hooks/useAnalytics'
import type { AnalyticsPeriod } from '@/types/common'
import { cn } from '@/lib/utils'

function pct(n: number) { return `${n.toFixed(1)}%` }

const BAND_COLORS: Record<string, string> = {
  PLATINUM: 'bg-purple-100 text-purple-700',
  GOLD:     'bg-yellow-100 text-yellow-700',
  SILVER:   'bg-slate-100 text-slate-700',
  BRONZE:   'bg-orange-100 text-orange-700',
}

export default function SectionAnalyticsPage() {
  const { classYear, section } = useParams<{ classYear: string; section: string }>()
  const year = parseInt(classYear ?? '10', 10)
  const sec = section ?? 'A'

  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'mastery' | 'attendance'>('mastery')

  const { data, isLoading, isError, refetch } = useSectionAnalytics(year, sec, period)

  const students = (data?.students ?? [])
    .filter((s) => s.full_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.full_name.localeCompare(b.full_name)
      if (sortBy === 'attendance') return b.attendance_rate_90d - a.attendance_rate_90d
      const aM = a.mastery.length > 0
        ? a.mastery.reduce((sum, m) => sum + m.mastery_pct, 0) / a.mastery.length
        : 0
      const bM = b.mastery.length > 0
        ? b.mastery.reduce((sum, m) => sum + m.mastery_pct, 0) / b.mastery.length
        : 0
      return bM - aM
    })

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
        title={`Class ${year}-${sec} Analytics`}
        description={`Student roster and section performance for ${year}-${sec}`}
        backHref={`/analytics/class/${year}`}
        bookmarkUrl={`/analytics/section/${year}/${sec}`}
        action={periodAction}
      />

      {/* Section summary KPIs */}
      {data?.section_summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Mastery Avg', value: pct(data.section_summary.mastery_avg), color: 'text-primary' },
            { label: 'Attendance', value: pct(data.section_summary.attendance_avg), color: 'text-secondary' },
            { label: 'At-Risk', value: String(data.section_summary.at_risk_count), color: 'text-danger' },
            { label: 'SmartPad Usage', value: pct(data.section_summary.smartpad_usage_avg), color: 'text-accent' },
            { label: 'Fee Collection', value: pct(data.section_summary.fee_collection_pct), color: 'text-success' },
          ].map((k) => (
            <Card key={k.label}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-slate-500">{k.label}</p>
                <p className={cn('text-xl font-bold mt-1', k.color)}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mastery">Sort: Mastery</SelectItem>
            <SelectItem value="attendance">Sort: Attendance</SelectItem>
            <SelectItem value="name">Sort: Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          Failed to load section analytics.
          <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {data && students.length > 0 && (
        <motion.div variants={slideUp} initial="initial" animate="animate">
          <Card>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-slate-500 text-xs">
                      <th className="text-left py-3 font-medium">Student</th>
                      <th className="text-left py-3 font-medium">Band</th>
                      <th className="text-right py-3 font-medium">Avg Mastery</th>
                      <th className="text-right py-3 font-medium">Attendance</th>
                      <th className="text-right py-3 font-medium">Sessions</th>
                      <th className="text-right py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const avgMastery = s.mastery.length > 0
                        ? s.mastery.reduce((sum, m) => sum + m.mastery_pct, 0) / s.mastery.length
                        : null
                      return (
                        <tr key={s.neura_id} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="py-3">
                            <Link
                              to={`/analytics/student/${s.neura_id}`}
                              className="font-medium text-slate-900 hover:text-primary transition-colors"
                            >
                              {s.full_name}
                            </Link>
                            <p className="text-xs text-slate-400">{s.neura_id}</p>
                          </td>
                          <td className="py-3">
                            {s.band ? (
                              <span className={cn(
                                'text-xs font-semibold px-2 py-0.5 rounded-full',
                                BAND_COLORS[s.band] ?? 'bg-slate-100 text-slate-600',
                              )}>
                                {s.band}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            {avgMastery != null ? (
                              <span className={cn(
                                'font-semibold',
                                avgMastery >= 70 ? 'text-success' : avgMastery >= 50 ? 'text-warning' : 'text-danger',
                              )}>
                                {pct(avgMastery)}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="py-3 text-right">
                            <span className={cn(
                              s.attendance_rate_90d < 75 ? 'text-danger font-semibold' : 'text-slate-900',
                            )}>
                              {pct(s.attendance_rate_90d)}
                            </span>
                          </td>
                          <td className="py-3 text-right text-slate-600">
                            {s.smartpad_sessions_90d}
                          </td>
                          <td className="py-3 text-right">
                            {s.status === 'AT_RISK' ? (
                              <Badge variant="destructive" className="text-xs">AT_RISK</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">ACTIVE</Badge>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {data && students.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Users className="h-12 w-12 text-slate-200" />
          <p className="text-slate-500">No students found</p>
        </div>
      )}
    </div>
  )
}
