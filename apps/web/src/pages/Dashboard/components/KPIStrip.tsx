import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { useCountUp } from '@/lib/useCountUp'
import type { SchoolHealthKPIs } from '@/types/common'

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

interface KPICardProps {
  label: string
  value: number
  href: string
  format?: 'integer' | 'percentage' | 'ordinal'
  danger?: boolean
  valueColorClass?: string
  isLoading: boolean
}

function KPICard({ label, value, href, format = 'integer', danger, valueColorClass, isLoading }: KPICardProps) {
  const navigate = useNavigate()
  const displayValue = useCountUp(value, 600, !isLoading)

  const formattedValue =
    format === 'percentage'
      ? `${displayValue}%`
      : format === 'ordinal'
        ? ordinal(displayValue)
        : String(displayValue)

  return (
    <div
      className={`rounded-xl p-5 cursor-pointer transition-shadow hover:shadow-md border ${
        danger && value > 0
          ? 'bg-danger/5 border-danger/20'
          : 'bg-white border-slate-200'
      }`}
      onClick={() => navigate(href)}
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${formattedValue}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(href)
      }}
    >
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p
        className={`text-3xl font-bold mt-2 ${
          valueColorClass ?? (danger && value > 0 ? 'text-danger' : 'text-slate-900')
        }`}
      >
        {formattedValue}
      </p>
      <p className="text-xs text-slate-400 mt-1">—</p>
    </div>
  )
}

interface Props {
  kpis: SchoolHealthKPIs
  isLoading: boolean
}

const defaultKPIs: SchoolHealthKPIs = {
  total_students: 0,
  present_today: 0,
  present_today_pct: 0,
  active_smartpads: 0,
  total_smartpads: 0,
  mastery_avg: 0,
  at_risk_count: 0,
  fee_collection_pct: 0,
}

export default function KPIStrip({ kpis = defaultKPIs, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  const presentColorClass =
    kpis.present_today_pct > 85
      ? 'text-success'
      : kpis.present_today_pct < 75
        ? 'text-warning'
        : 'text-slate-900'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <KPICard
        label="Total Students"
        value={kpis.total_students}
        href="/students"
        isLoading={isLoading}
      />
      <KPICard
        label="Present Today"
        value={kpis.present_today}
        href="/attendance"
        valueColorClass={presentColorClass}
        isLoading={isLoading}
      />
      <KPICard
        label="Active SmartPads"
        value={kpis.active_smartpads}
        href="/fleet"
        isLoading={isLoading}
      />
      <KPICard
        label="Mastery Average"
        value={kpis.mastery_avg}
        href="/analytics"
        format="ordinal"
        isLoading={isLoading}
      />
      <KPICard
        label="AT_RISK Students"
        value={kpis.at_risk_count}
        href="/students?filter=at_risk"
        danger
        isLoading={isLoading}
      />
      <KPICard
        label="Fee Collection"
        value={kpis.fee_collection_pct}
        href="/fees"
        format="percentage"
        isLoading={isLoading}
      />
    </div>
  )
}
