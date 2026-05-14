import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  ArrowLeft, IndianRupee, TrendingUp, AlertCircle,
  Search, CreditCard, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import PageLayout from '@/components/layout/PageLayout'
import { slideUp, staggerChildren, listItem } from '@/lib/animations'
import { useFeeAnalytics, useUnpaidStudents } from '@/hooks/useFees'
import type { UnpaidStudentItem } from '@/types/common'

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

// ─── Trend Chart ──────────────────────────────────────────────────────────

function TrendChart({ trend }: { trend: Array<{ month_label: string; due: number; collected: number; rate: number }> }) {
  const chartData = trend.map((t) => ({
    name: t.month_label,
    Due: Math.round(t.due),
    Collected: Math.round(t.collected),
    Rate: t.rate,
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        No monthly trend data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          formatter={(value, name) => {
            const v = value as number
            return name === 'Rate' ? [`${v}%`, 'Collection Rate'] : [`₹${v.toLocaleString('en-IN')}`, String(name)]
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="left" dataKey="Due" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="left" dataKey="Collected" fill="#1e40af" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="Rate" stroke="#0d9488" strokeWidth={2} dot={{ r: 3, fill: '#0d9488' }} name="Rate" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ─── Fee Head Breakdown ────────────────────────────────────────────────────

function FeeHeadTable({ data }: { data: Array<{ fee_head: string; due: number; collected: number; rate: number }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-xs font-semibold text-text-secondary">Fee Head</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-text-secondary">Due</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-text-secondary">Collected</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-text-secondary">Rate</th>
          </tr>
        </thead>
        <tbody>
          {data.map((h) => (
            <tr key={h.fee_head} className="border-b border-border last:border-0 hover:bg-surface-raised/50 transition-colors">
              <td className="py-2.5 px-3 font-medium text-text-primary">
                {h.fee_head.replace(/_/g, ' ')}
              </td>
              <td className="py-2.5 px-3 text-right text-text-secondary">
                ₹{h.due.toLocaleString('en-IN')}
              </td>
              <td className="py-2.5 px-3 text-right text-primary font-semibold">
                ₹{h.collected.toLocaleString('en-IN')}
              </td>
              <td className="py-2.5 px-3 text-right">
                <Badge
                  className={`text-xs font-semibold ${
                    h.rate >= 90 ? 'bg-success/10 text-success border-success/30' :
                    h.rate >= 75 ? 'bg-warning/10 text-warning border-warning/30' :
                    'bg-danger/10 text-danger border-danger/30'
                  }`}
                >
                  {h.rate}%
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Class Breakdown Table ────────────────────────────────────────────────

function ClassBreakdownTable({ data }: {
  data: Array<{ class_year: number; section: string; total_students: number; paid_count: number; overdue_count: number; due: number; collected: number; rate: number }>
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-xs font-semibold text-text-secondary">Class</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-text-secondary">Students</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-success">Paid</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-danger">Overdue</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-text-secondary">Due</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-text-secondary">Collected</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-text-secondary">Rate</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c) => (
            <tr
              key={`${c.class_year}-${c.section}`}
              className="border-b border-border last:border-0 hover:bg-surface-raised/50 transition-colors"
            >
              <td className="py-2.5 px-3">
                <span className="font-semibold text-text-primary">Class {c.class_year}</span>
                <span className="text-text-muted ml-1">· {c.section}</span>
              </td>
              <td className="py-2.5 px-3 text-right font-medium text-text-primary">{c.total_students}</td>
              <td className="py-2.5 px-3 text-right font-semibold text-success">{c.paid_count}</td>
              <td className="py-2.5 px-3 text-right font-semibold text-danger">{c.overdue_count}</td>
              <td className="py-2.5 px-3 text-right text-text-secondary">₹{c.due.toLocaleString('en-IN')}</td>
              <td className="py-2.5 px-3 text-right text-primary font-semibold">₹{c.collected.toLocaleString('en-IN')}</td>
              <td className="py-2.5 px-3 text-right">
                <Badge
                  className={`text-xs font-semibold ${
                    c.rate >= 90 ? 'bg-success/10 text-success border-success/30' :
                    c.rate >= 75 ? 'bg-warning/10 text-warning border-warning/30' :
                    'bg-danger/10 text-danger border-danger/30'
                  }`}
                >
                  {c.rate}%
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Unpaid Students Panel ────────────────────────────────────────────────

function UnpaidStudentsPanel({ onPayNow }: { onPayNow: (neuraId: string) => void }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState<number | null>(null)
  const limit = 20

  const { data: items, isLoading, isError } = useUnpaidStudents(page, limit)

  const filtered = useMemo(() => {
    if (!items) return []
    let list = items
    if (classFilter !== null) list = list.filter((s) => s.class_year === classFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (s) => s.full_name.toLowerCase().includes(q) || s.neura_id.toLowerCase().includes(q),
      )
    }
    return list
  }, [items, classFilter, search])

  const uniqueClasses = useMemo(() => {
    if (!items) return []
    return [...new Set(items.map((s) => s.class_year))].sort((a, b) => a - b)
  }, [items])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Failed to load unpaid students
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or Neura ID..."
            className="pl-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setClassFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              classFilter === null
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-text-secondary border-border hover:border-primary/40'
            }`}
          >
            All
          </button>
          {uniqueClasses.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setClassFilter(classFilter === c ? null : c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                classFilter === c
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-text-secondary border-border hover:border-primary/40'
              }`}
            >
              Class {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-text-muted text-sm">
          {search || classFilter !== null ? 'No students match the filter.' : 'All students are up to date!'}
        </div>
      ) : (
        <motion.div variants={staggerChildren} initial="initial" animate="animate" className="space-y-2">
          {filtered.map((s: UnpaidStudentItem) => (
            <motion.div
              key={s.neura_id}
              variants={listItem}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white px-4 py-3 hover:bg-surface-raised/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-text-primary text-sm truncate">{s.full_name}</p>
                  <span className="text-xs text-text-muted font-mono">{s.neura_id}</span>
                  <span className="text-xs text-text-muted">Class {s.class_year}-{s.section}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-danger font-medium">
                    {s.periods_overdue} period{s.periods_overdue !== 1 ? 's' : ''} unpaid
                  </span>
                  <span className="text-xs text-text-muted">
                    Oldest: {s.oldest_due_date}
                  </span>
                  {s.fee_heads_unpaid.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {s.fee_heads_unpaid.slice(0, 3).map((h) => (
                        <span key={h} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-text-secondary">
                          {h.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {s.fee_heads_unpaid.length > 3 && (
                        <span className="text-[10px] text-text-muted">+{s.fee_heads_unpaid.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <p className="text-base font-bold text-danger">
                  ₹{s.total_outstanding.toLocaleString('en-IN')}
                </p>
                <Button
                  size="sm"
                  onClick={() => onPayNow(s.neura_id)}
                  className="h-7 text-xs"
                >
                  Pay Now
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {(items?.length ?? 0) === limit && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-text-muted">Page {page}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
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
      <Skeleton className="h-72 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function FeeAnalyticsPage() {
  const navigate = useNavigate()


  const { data, isLoading, isError, refetch } = useFeeAnalytics()

  function handlePayNow(neuraId: string) {
    // Navigate to fees page with the neuraId as a query param so RecordPaymentModal auto-opens
    navigate(`/fees?pay=${neuraId}`)
  }

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/fees')}
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:bg-surface-raised transition-colors"
            aria-label="Back to Fees"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Fee Analytics</h1>
            <p className="text-xs text-text-muted">Year-wide collection insights and unpaid tracking</p>
          </div>
        </div>
      </div>

      <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-4">
        {isLoading && <AnalyticsSkeleton />}

        {isError && !isLoading && (
          <div className="bg-white rounded-xl border border-border p-8 text-center shadow-sm">
            <AlertCircle className="h-8 w-8 text-danger mx-auto mb-3" />
            <p className="font-medium text-text-primary">Could not load analytics</p>
            <p className="text-sm text-text-muted mt-1">Check your connection and try again.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !isError && data && (
          <>
            {/* KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard
                label="Total Due (Year)"
                value={`₹${Math.round(data.total_due_year / 1000)}k`}
                sub={data.year_label}
                icon={<IndianRupee className="h-4 w-4 text-primary" />}
              />
              <KPICard
                label="Total Collected"
                value={`₹${Math.round(data.total_collected_year / 1000)}k`}
                sub="this academic year"
                icon={<CreditCard className="h-4 w-4 text-success" />}
                highlight="success"
              />
              <KPICard
                label="Collection Rate"
                value={`${data.collection_rate_year}%`}
                sub="year-to-date"
                icon={<TrendingUp className="h-4 w-4 text-primary" />}
                highlight={
                  data.collection_rate_year >= 90 ? 'success' :
                  data.collection_rate_year >= 75 ? 'warning' : 'danger'
                }
              />
              <KPICard
                label="Outstanding"
                value={`₹${Math.round(data.overdue_amount / 1000)}k`}
                sub="overdue & partial"
                icon={<Users className="h-4 w-4 text-danger" />}
                highlight={data.overdue_amount > 0 ? 'danger' : 'success'}
              />
            </div>

            {/* Monthly Trend Chart */}
            {data.monthly_trend.length > 0 && (
              <div className="bg-white rounded-xl border border-border shadow-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold text-text-primary">Monthly Collection Trend</h2>
                  <p className="text-xs text-text-muted mt-0.5">Bar = amount (₹), Line = collection rate (%)</p>
                </div>
                <div className="p-5">
                  <TrendChart trend={data.monthly_trend} />
                </div>
              </div>
            )}

            {/* Fee Head + Class Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.by_fee_head.length > 0 && (
                <div className="bg-white rounded-xl border border-border shadow-sm">
                  <div className="px-5 py-3 border-b border-border">
                    <h2 className="text-sm font-semibold text-text-primary">By Fee Head</h2>
                  </div>
                  <div className="p-2">
                    <FeeHeadTable data={data.by_fee_head} />
                  </div>
                </div>
              )}

              {data.by_class.length > 0 && (
                <div className="bg-white rounded-xl border border-border shadow-sm">
                  <div className="px-5 py-3 border-b border-border">
                    <h2 className="text-sm font-semibold text-text-primary">By Class</h2>
                  </div>
                  <div className="p-2">
                    <ClassBreakdownTable data={data.by_class} />
                  </div>
                </div>
              )}
            </div>

            {/* Unpaid Students */}
            <div className="bg-white rounded-xl border border-border shadow-sm">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-text-primary">Unpaid Students</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Students with pending, partial, or overdue fees — sorted by outstanding amount
                </p>
              </div>
              <div className="p-5">
                <UnpaidStudentsPanel onPayNow={handlePayNow} />
              </div>
            </div>
          </>
        )}
      </motion.div>

    </PageLayout>
  )
}
