import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { useFleetOverview } from '@/hooks/useFleet'
import type { FleetDevice } from '@/types/common'

function SyncDistBar({ devices }: { devices: FleetDevice[] }) {
  const counts = { RECENT: 0, WATCH: 0, OFFLINE: 0, CRITICAL: 0, LOST: 0 }
  for (const d of devices) {
    if (d.status === 'LOST') counts.LOST++
    else counts[d.sync_status]++
  }
  const data = [
    { name: 'Synced <48h', value: counts.RECENT,   color: '#10b981' },
    { name: 'Watch 2-5d',  value: counts.WATCH,    color: '#f59e0b' },
    { name: 'Offline 5-9d',value: counts.OFFLINE,  color: '#f97316' },
    { name: 'Critical 9d+',value: counts.CRITICAL, color: '#ef4444' },
    { name: 'Lost',        value: counts.LOST,     color: '#6b7280' },
  ]

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
        <Tooltip formatter={(v) => [v, 'Devices']} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function BatteryHistogram({ devices }: { devices: FleetDevice[] }) {
  const buckets = [
    { label: '0–20%',  min: 0,  max: 20,  count: 0, color: '#ef4444' },
    { label: '21–40%', min: 20, max: 40,  count: 0, color: '#f97316' },
    { label: '41–60%', min: 40, max: 60,  count: 0, color: '#f59e0b' },
    { label: '61–80%', min: 60, max: 80,  count: 0, color: '#84cc16' },
    { label: '81–100%',min: 80, max: 101, count: 0, color: '#10b981' },
  ]
  for (const d of devices) {
    if (d.battery_level !== null) {
      const b = buckets.find(bk => d.battery_level! >= bk.min && d.battery_level! < bk.max)
      if (b) b.count++
    }
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={buckets} margin={{ left: 0, right: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip formatter={(v) => [v, 'Devices']} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {buckets.map((b, i) => <Cell key={i} fill={b.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function EfficiencyGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
  const label = score >= 80 ? 'Healthy' : score >= 60 ? 'Moderate' : 'Needs Attention'

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div
        className="relative flex h-28 w-28 items-center justify-center rounded-full border-8 transition-all"
        style={{ borderColor: color }}
      >
        <div className="text-center">
          <p className="text-3xl font-bold" style={{ color }}>{score}</p>
          <p className="text-xs text-slate-500">/ 100</p>
        </div>
      </div>
      <p className="mt-3 font-semibold text-slate-700">{label}</p>
    </div>
  )
}

export default function FleetAnalytics() {
  const { data, isLoading } = useFleetOverview()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    )
  }

  if (!data) return null

  const { devices, efficiency, kpis } = data

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Sync Rate"         value={`${kpis.sync_rate_pct}%`}    color="text-green-600" />
        <KPICard label="Avg Battery"       value={`${kpis.avg_battery_pct}%`}  color="text-blue-600" />
        <KPICard label="Avg Usage"         value={`${kpis.avg_usage_hours}h`}  color="text-purple-600" />
        <KPICard label="Outdated FW"       value={String(kpis.firmware_outdated_count)} color="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sync status distribution */}
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Sync Status Distribution</p>
          <SyncDistBar devices={devices} />
        </div>

        {/* Battery histogram */}
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Battery Level Distribution</p>
          <BatteryHistogram devices={devices} />
        </div>

        {/* Fleet efficiency score */}
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-semibold text-slate-700 mb-1">Fleet Efficiency Score</p>
          <EfficiencyGauge score={efficiency.overall} />
          <div className="mt-2 space-y-1.5">
            <ScoreRow label="Sync"      value={efficiency.sync_score} />
            <ScoreRow label="Usage"     value={efficiency.usage_score} />
            <ScoreRow label="Health"    value={efficiency.device_health_score} />
            <ScoreRow label="Firmware"  value={efficiency.firmware_score} />
          </div>
        </div>

        {/* Top devices by usage */}
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Top Devices by Usage</p>
          <div className="space-y-2">
            {[...devices]
              .sort((a, b) => b.total_sessions - a.total_sessions)
              .slice(0, 6)
              .map(d => (
                <div key={d.device_id} className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-slate-700 w-16 flex-shrink-0">{d.device_id}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.min(100, (d.total_sessions / 250) * 100)}%` }}
                    />
                  </div>
                  <span className="text-slate-500 w-16 text-right">{d.total_sessions} sessions</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}

function KPICard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-16">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-700 w-8 text-right">{value}</span>
    </div>
  )
}
