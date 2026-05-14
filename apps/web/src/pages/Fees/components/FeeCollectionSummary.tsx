import { TrendingUp, Users, CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { FeeCollectionSummary as Summary } from '@/types/common'

function KPICard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`rounded-lg p-2 ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

interface Props {
  data: Summary
}

export function FeeCollectionSummary({ data }: Props) {
  const monthLabel = data.current_month_label
    ? new Date(`${data.current_month_label}-01`).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    : ''

  const formatINR = (n: number) =>
    '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          label="Collection Rate"
          value={`${data.collection_rate}%`}
          sub={monthLabel}
          icon={<TrendingUp className="h-4 w-4 text-teal-600" />}
          color="bg-teal-50"
        />
        <KPICard
          label="Total Collected"
          value={formatINR(data.total_collected_month)}
          sub={`of ${formatINR(data.total_due_month)} due`}
          icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
          color="bg-green-50"
        />
        <KPICard
          label="Overdue Students"
          value={data.overdue_count}
          sub="need follow-up"
          icon={<AlertCircle className="h-4 w-4 text-red-600" />}
          color="bg-red-50"
        />
        <KPICard
          label="Fully Paid"
          value={data.paid_count}
          sub={`of ${data.total_students} students`}
          icon={<Users className="h-4 w-4 text-blue-600" />}
          color="bg-blue-50"
        />
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Monthly Collection Progress</span>
            <span className="font-semibold text-slate-900">{data.collection_rate}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-teal-500 transition-all duration-700"
              style={{ width: `${Math.min(data.collection_rate, 100)}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Paid: {data.paid_count}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-500" />
              Partial: {data.partial_count}
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              Overdue: {data.overdue_count}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-slate-400" />
              Pending: {data.pending_count}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Recent payments */}
      {data.recent_payments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {data.recent_payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.student_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.receipt_number} · {p.payment_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {p.payment_mode}
                    </Badge>
                    <span className="text-sm font-semibold text-slate-900">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </span>
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

export function FeeCollectionSummarySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-8 w-16" />
              <Skeleton className="mt-1 h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  )
}
