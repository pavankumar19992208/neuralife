import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, Users, TrendingUp, TrendingDown } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import PageHeader from '@/components/layout/PageHeader'
import { slideUp } from '@/lib/animations'
import { useClassAnalytics } from '@/hooks/useAnalytics'
import type { AnalyticsPeriod } from '@/types/common'

function pct(n: number) { return `${n.toFixed(1)}%` }

export default function ClassAnalyticsPage() {
  const { classYear } = useParams<{ classYear: string }>()
  const year = parseInt(classYear ?? '10', 10)
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')

  const { data, isLoading, isError, refetch } = useClassAnalytics(year, period)

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
        title={`Class ${year} Analytics`}
        description={`Section comparison and student insights for Class ${year}`}
        backHref="/analytics"
        bookmarkUrl={`/analytics/class/${year}`}
        action={periodAction}
      />

      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          Failed to load class analytics.
          <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {data && (
        <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-8">
          {/* Section comparison chart */}
          {data.sections.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Section Comparison</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.sections} margin={{ bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="section" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v, name) => [`${Number(v).toFixed(1)}%`, String(name)]} />
                    <Bar dataKey="mastery_avg" name="Mastery" fill="#1e40af" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="attendance_avg" name="Attendance" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="fee_collection_pct" name="Fee Collection" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Section cards */}
          {data.sections.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.sections.map((s) => (
                <Link key={s.section} to={`/analytics/section/${year}/${s.section}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-slate-900">
                          Section {s.section}
                        </h3>
                        <Badge variant={s.at_risk_count > 0 ? 'destructive' : 'outline'} className="text-xs">
                          {s.at_risk_count} at-risk
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-slate-500">Mastery</p>
                          <p className="font-semibold text-slate-900">{pct(s.mastery_avg)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Attendance</p>
                          <p className="font-semibold text-slate-900">{pct(s.attendance_avg)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">SmartPad Usage</p>
                          <p className="font-semibold text-slate-900">{pct(s.smartpad_usage_avg)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Fee Collection</p>
                          <p className="font-semibold text-slate-900">{pct(s.fee_collection_pct)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Top students */}
          {data.top_students.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.top_students.slice(0, 5).map((s, i) => (
                    <Link key={s.neura_id} to={`/analytics/student/${s.neura_id}`}>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                        <span className="w-6 text-xs font-bold text-slate-400">{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{s.full_name}</p>
                          <p className="text-xs text-slate-500">Section {s.section}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-success">
                            {s.mastery.length > 0
                              ? pct(s.mastery.reduce((a, m) => a + m.mastery_pct, 0) / s.mastery.length)
                              : '—'}
                          </p>
                          <p className="text-xs text-slate-400">avg mastery</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bottom students */}
          {data.bottom_students.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-danger" />
                  Needs Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.bottom_students.slice(0, 5).map((s, i) => (
                    <Link key={s.neura_id} to={`/analytics/student/${s.neura_id}`}>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                        <span className="w-6 text-xs font-bold text-slate-400">{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{s.full_name}</p>
                          <p className="text-xs text-slate-500">Section {s.section}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {s.status === 'AT_RISK' && (
                            <Badge variant="destructive" className="text-xs">AT_RISK</Badge>
                          )}
                          <div className="text-right">
                            <p className="text-sm font-bold text-danger">
                              {s.mastery.length > 0
                                ? pct(s.mastery.reduce((a, m) => a + m.mastery_pct, 0) / s.mastery.length)
                                : '—'}
                            </p>
                            <p className="text-xs text-slate-400">avg mastery</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!data.sections.length && !data.top_students.length && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Users className="h-12 w-12 text-slate-200" />
              <p className="text-slate-500">No data available for Class {year}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
