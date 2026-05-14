import { RadialBarChart, RadialBar } from 'recharts'
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useCountUp } from '@/lib/useCountUp'
import type { HealthBand, SchoolHealthDrivers } from '@/types/common'

const BAND_CONFIG: Record<HealthBand, { color: string; bg: string; label: string }> = {
  EXCELLENT:       { color: '#10B981', bg: '#D1FAE5', label: 'Excellent' },
  GOOD:            { color: '#1E40AF', bg: '#DBEAFE', label: 'Good' },
  NEEDS_ATTENTION: { color: '#F59E0B', bg: '#FEF3C7', label: 'Needs Attention' },
  CRITICAL:        { color: '#EF4444', bg: '#FEE2E2', label: 'Critical' },
}

interface Props {
  score: number
  band: HealthBand
  vsLastWeek: number
  drivers: SchoolHealthDrivers
  isLoading: boolean
}

export default function SchoolHealthScoreCard({ score, band, vsLastWeek, drivers, isLoading }: Props) {
  const displayScore = useCountUp(score, 800, !isLoading)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  const bandConfig = BAND_CONFIG[band]
  // Pre-compute endAngle so the bar fills exactly score/100 of the circle
  const computedEndAngle = 90 - (displayScore / 100) * 360

  return (
    <div className="bg-white rounded-2xl p-6 shadow-card h-full flex flex-col gap-5">

      {/* Top: ring + summary */}
      <div className="flex items-center gap-8">

        {/* Radial ring */}
        <div className="relative flex-shrink-0" style={{ width: 160, height: 160 }}>
          {/* Background track — full grey circle */}
          <RadialBarChart
            width={160}
            height={160}
            innerRadius="75%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            data={[{ value: 1 }]}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            <RadialBar dataKey="value" fill="#F1F5F9" cornerRadius={0} />
          </RadialBarChart>

          {/* Score fill — pre-calculated arc */}
          {displayScore > 0 && (
            <div className="absolute inset-0">
              <RadialBarChart
                width={160}
                height={160}
                innerRadius="75%"
                outerRadius="100%"
                startAngle={90}
                endAngle={computedEndAngle}
                data={[{ value: 1 }]}
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <RadialBar dataKey="value" fill={bandConfig.color} cornerRadius={8} />
              </RadialBarChart>
            </div>
          )}

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-4xl font-bold text-slate-900">{displayScore}</span>
            <span className="text-sm text-slate-500">/ 100</span>
          </div>
        </div>

        {/* Score summary */}
        <div className="flex-1">
          <span
            className="text-sm font-semibold px-3 py-1 rounded-full inline-block"
            style={{ backgroundColor: bandConfig.bg, color: bandConfig.color }}
          >
            {bandConfig.label}
          </span>

          <h2 className="text-lg font-semibold text-slate-900 mt-2">School Health Score</h2>

          {vsLastWeek > 0 && (
            <p className="text-sm text-success mt-1">↑ +{vsLastWeek} from last week</p>
          )}
          {vsLastWeek < 0 && (
            <p className="text-sm text-danger mt-1">↓ {vsLastWeek} from last week</p>
          )}
          {vsLastWeek === 0 && (
            <p className="text-sm text-slate-500 mt-1">No change from last week</p>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* Drivers */}
      <div className="space-y-3 flex-1">
        {drivers.positive.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-success uppercase tracking-wide mb-2">
              What's going well
            </h3>
            {drivers.positive.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-700 mb-1">
                <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}

        {drivers.warnings.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-warning uppercase tracking-wide mb-2">
              Watch
            </h3>
            {drivers.warnings.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-700 mb-1">
                <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}

        {drivers.critical.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-danger uppercase tracking-wide mb-2">
              Needs action
            </h3>
            {drivers.critical.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-700 mb-1">
                <AlertCircle className="h-4 w-4 text-danger flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}

        {drivers.positive.length === 0 && drivers.warnings.length === 0 && drivers.critical.length === 0 && (
          <p className="text-sm text-slate-400 italic">No driver data yet for this period.</p>
        )}
      </div>
    </div>
  )
}
