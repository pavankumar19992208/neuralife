import { Tablet } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  total: number
  synced48h: number
  offline9d: number
  isLoading: boolean
}

interface BarSegment {
  label: string
  count: number
  color: string
  dotColor: string
}

export default function SmartPadStatus({ total, synced48h, offline9d, isLoading }: Props) {
  if (isLoading) {
    return <Skeleton className="h-full min-h-[200px] w-full rounded-xl" />
  }

  if (total === 0) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-card border border-slate-200 flex items-center justify-center h-full min-h-[200px]">
        <p className="text-sm text-slate-400 italic">No SmartPads assigned yet</p>
      </div>
    )
  }

  const atRisk = Math.max(0, total - synced48h - offline9d)

  const segments: BarSegment[] = [
    { label: 'Synced (< 48h)',   count: synced48h, color: '#10B981', dotColor: 'bg-success' },
    { label: 'Needs sync (48h–9d)', count: atRisk,  color: '#F59E0B', dotColor: 'bg-warning' },
    { label: 'Offline (9d+)',    count: offline9d, color: '#EF4444', dotColor: 'bg-danger' },
  ]

  return (
    <div className="bg-white rounded-xl p-5 shadow-card border border-slate-200 h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Tablet className="h-5 w-5 text-slate-500" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-slate-900">SmartPad Fleet</h3>
        <span className="ml-auto text-xs text-slate-400">{total} devices</span>
      </div>

      {/* Bar */}
      <div className="flex rounded-full overflow-hidden h-3 bg-slate-100" role="img" aria-label="SmartPad fleet status bar">
        {segments.map((seg) => {
          const pct = (seg.count / total) * 100
          if (pct <= 0) return null
          return (
            <div
              key={seg.label}
              style={{ width: `${pct}%`, backgroundColor: seg.color }}
              title={`${seg.label}: ${seg.count}`}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="space-y-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${seg.dotColor}`} aria-hidden="true" />
              <span className={seg.count > 0 && seg.label.includes('Offline') ? 'text-danger font-medium' : 'text-slate-600'}>
                {seg.label}
              </span>
            </div>
            <span className={`font-semibold ${seg.count > 0 && seg.label.includes('Offline') ? 'text-danger' : 'text-slate-700'}`}>
              {seg.count}
            </span>
          </div>
        ))}
      </div>

      {/* Alert strip */}
      {offline9d > 0 && (
        <div className="rounded-lg bg-warning/10 border border-warning/20 px-3 py-2">
          <p className="text-xs text-warning font-medium">
            ⚠ {offline9d} device{offline9d === 1 ? '' : 's'} offline 9+ days — learning data gap
          </p>
        </div>
      )}
    </div>
  )
}
