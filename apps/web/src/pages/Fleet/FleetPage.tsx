import { useState, useMemo, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tablet, Wifi, WifiOff, AlertTriangle, Bell, BellOff,
  Search, Zap, BarChart3, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import PageLayout from '@/components/layout/PageLayout'
import PageHeader from '@/components/layout/PageHeader'
import { slideUp, staggerChildren, listItem } from '@/lib/animations'
import { useFleetOverview, useAcknowledgeAlert } from '@/hooks/useFleet'
import { LATEST_FIRMWARE } from '@/types/common'
import type { FleetDevice, FleetAlert, SyncStatus, DeviceStatus } from '@/types/common'
import OTAManagement from './components/OTAManagement'
import FleetAnalytics from './components/FleetAnalytics'

const FleetMap = lazy(() => import('./components/FleetMap'))
const DeviceDetailPanel = lazy(() => import('./components/DeviceDetailPanel'))

type Tab = 'overview' | 'ota' | 'analytics'

const SYNC_BADGE: Record<SyncStatus, string> = {
  RECENT:   'bg-green-100 text-green-700',
  WATCH:    'bg-amber-100 text-amber-700',
  OFFLINE:  'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never'
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3600000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function FleetPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [search, setSearch] = useState('')
  const [filterSync, setFilterSync] = useState<SyncStatus | 'ALL' | 'LOST'>('ALL')
  const [filterStatus, setFilterStatus] = useState<DeviceStatus | 'ALL'>('ALL')
  const [filterClass, setFilterClass] = useState<string>('ALL')
  const [selectedDevice, setSelectedDevice] = useState<FleetDevice | null>(null)

  const { data, isLoading, isError, refetch } = useFleetOverview()
  const acknowledgeAlert = useAcknowledgeAlert()

  const devices = data?.devices ?? []
  const alerts = data?.alerts ?? []
  const kpis = data?.kpis

  const uniqueClasses = [...new Set(
    devices.map(d => d.student_class).filter(Boolean) as string[]
  )].sort((a, b) => {
    const [ay, as_] = a.split('-')
    const [by, bs] = b.split('-')
    return Number(ay) !== Number(by) ? Number(ay) - Number(by) : as_.localeCompare(bs)
  })

  const filterKey = `${search}|${filterSync}|${filterStatus}|${filterClass}`

  const filtered = useMemo(() => devices.filter(d => {
    const matchSearch = !search || d.device_id.toLowerCase().includes(search.toLowerCase()) ||
      (d.student_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (d.assigned_neura_id ?? '').toLowerCase().includes(search.toLowerCase())
    const matchSync = filterSync === 'ALL' ||
      (filterSync === 'LOST' ? d.status === 'LOST' : d.sync_status === filterSync)
    const matchStatus = filterStatus === 'ALL' || d.status === filterStatus
    const matchClass = filterClass === 'ALL' || d.student_class === filterClass
    return matchSearch && matchSync && matchStatus && matchClass
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [filterKey, devices])

  return (
    <PageLayout>
      <PageHeader
        title="SmartPad Fleet"
        description="Monitor, manage, and update your NeuraLife SmartPads"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} aria-label="Refresh fleet data">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        }
      />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6">
        {([
          { key: 'overview',  label: 'Overview',    icon: Tablet,   badge: undefined as number | undefined },
          { key: 'ota',       label: 'OTA Update',  icon: Zap,      badge: kpis?.firmware_outdated_count },
          { key: 'analytics', label: 'Analytics',   icon: BarChart3, badge: undefined as number | undefined },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="h-4 w-4" aria-hidden="true" />
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 font-semibold">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-6">
          {/* KPI strip */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : kpis ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <KPICard icon={<Tablet className="h-4 w-4" />} label="Total Devices" value={kpis.total_devices} />
              <KPICard icon={<Wifi className="h-4 w-4 text-green-600" />} label="Synced <48h" value={kpis.active_devices} color="text-green-600" />
              <KPICard icon={<WifiOff className="h-4 w-4 text-orange-500" />} label="Offline / Critical" value={kpis.offline_devices + kpis.critical_devices} color="text-orange-500" />
              <KPICard icon={<AlertTriangle className="h-4 w-4 text-red-600" />} label="Lost" value={kpis.lost_devices} color="text-red-600" />
              <KPICard icon={<Bell className="h-4 w-4 text-amber-600" />} label="Active Alerts" value={kpis.active_alerts} color="text-amber-600" />
            </div>
          ) : null}

          {/* Map + Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Map */}
            <div className="lg:col-span-2 rounded-xl border border-border overflow-hidden" style={{ height: 360 }}>
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <Suspense fallback={<Skeleton className="h-full w-full" />}>
                  <FleetMap devices={filtered} filterKey={filterKey} onSelect={setSelectedDevice} />
                </Suspense>
              )}
            </div>

            {/* Active alerts panel */}
            <div className="rounded-xl border border-border p-4 space-y-3 overflow-y-auto max-h-[360px]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Bell className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  Active Alerts
                </p>
                {alerts.length > 0 && (
                  <Badge variant="outline" className="text-xs">{alerts.length}</Badge>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <BellOff className="h-8 w-8 text-green-400 mb-2" aria-hidden="true" />
                  <p className="text-sm text-slate-500">No active alerts</p>
                </div>
              ) : (
                <motion.div variants={staggerChildren} initial="initial" animate="animate" className="space-y-2">
                  {alerts.map(a => (
                    <motion.div key={a.id} variants={listItem}>
                      <AlertCard
                        alert={a}
                        onAcknowledge={() => acknowledgeAlert.mutate(a.id)}
                        onSelect={() => {
                          const d = devices.find(dev => dev.device_id === a.device_id)
                          if (d) setSelectedDevice(d)
                        }}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          {/* Device list */}
          <div className="space-y-3">
            {/* Row 1: search + dropdowns */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                <Input
                  className="pl-9"
                  placeholder="Search device ID, student name, NeuraID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Search devices"
                />
              </div>

              {/* Status filter */}
              <Select value={filterStatus} onValueChange={v => setFilterStatus(v as DeviceStatus | 'ALL')}>
                <SelectTrigger className="w-[150px]" aria-label="Filter by device status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="LOCKED">Locked</SelectItem>
                  <SelectItem value="LOST">Lost</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                </SelectContent>
              </Select>

              {/* Class filter */}
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-[140px]" aria-label="Filter by class">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes</SelectItem>
                  {uniqueClasses.map(cls => (
                    <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: sync status pills */}
            <div className="flex gap-1.5 flex-wrap">
              {(['ALL', 'RECENT', 'WATCH', 'OFFLINE', 'CRITICAL', 'LOST'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterSync(f)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filterSync === f
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f === 'ALL' ? 'All Sync' : f.charAt(0) + f.slice(1).toLowerCase()}
                  {f !== 'ALL' && (
                    <span className="ml-1 opacity-70">
                      {f === 'LOST'
                        ? devices.filter(d => d.status === 'LOST').length
                        : devices.filter(d => d.sync_status === f && d.status !== 'LOST').length}
                    </span>
                  )}
                </button>
              ))}
              {(filterStatus !== 'ALL' || filterClass !== 'ALL') && (
                <button
                  onClick={() => { setFilterStatus('ALL'); setFilterClass('ALL') }}
                  className="rounded-full px-3 py-1 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>

            {isError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                <p className="text-red-700 font-medium">Could not load fleet data</p>
                <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-3">Try again</Button>
              </div>
            ) : isLoading ? (
              <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-border p-12 text-center">
                <Tablet className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No devices match your filter</p>
              </div>
            ) : (
              <motion.div variants={staggerChildren} initial="initial" animate="animate" className="space-y-2">
                {filtered.map(d => (
                  <motion.div key={d.device_id} variants={listItem}>
                    <DeviceRow device={d} onClick={() => setSelectedDevice(d)} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {tab === 'ota' && (
        <motion.div variants={slideUp} initial="initial" animate="animate">
          <OTAManagement />
        </motion.div>
      )}

      {tab === 'analytics' && (
        <motion.div variants={slideUp} initial="initial" animate="animate">
          <FleetAnalytics />
        </motion.div>
      )}

      {/* Device detail panel */}
      <AnimatePresence>
        {selectedDevice && (
          <Suspense fallback={null}>
            <DeviceDetailPanel device={selectedDevice} onClose={() => setSelectedDevice(null)} />
          </Suspense>
        )}
      </AnimatePresence>
    </PageLayout>
  )
}

function KPICard({
  icon, label, value, color = 'text-slate-900',
}: { icon: React.ReactNode; label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 space-y-1 shadow-sm">
      <div className="flex items-center gap-1.5 text-slate-500 text-xs">{icon}{label}</div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function DeviceRow({ device, onClick }: { device: FleetDevice; onClick: () => void }) {
  const isLost = device.status === 'LOST'
  return (
    <button
      onClick={onClick}
      aria-label={`View details for ${device.device_id}`}
      className={`w-full rounded-xl border p-4 flex items-center gap-4 text-left transition-colors hover:border-primary/50 hover:shadow-sm ${
        isLost ? 'border-red-200 bg-red-50' : 'border-border bg-white'
      }`}
    >
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
        isLost ? 'bg-red-100' : 'bg-primary/10'
      }`}>
        <Tablet className={`h-5 w-5 ${isLost ? 'text-red-600' : 'text-primary'}`} aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-900">{device.device_id}</span>
          {isLost && <Badge variant="destructive" className="text-xs">LOST</Badge>}
          {device.is_at_risk_student && <Badge variant="destructive" className="text-xs">AT_RISK</Badge>}
          {device.active_alert_count > 0 && (
            <span className="text-xs text-amber-600 flex items-center gap-0.5">
              <AlertTriangle className="h-3 w-3" />{device.active_alert_count}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate">
          {device.student_name ?? 'Unassigned'}
          {device.student_class && ` · ${device.student_class}`}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-3 flex-shrink-0 text-xs text-slate-500">
        <span>{device.battery_level !== null ? `${device.battery_level}%` : '—'}</span>
        <span>{timeAgo(device.last_sync_at)}</span>
        <span
          className={`rounded-full px-2 py-0.5 font-medium ${SYNC_BADGE[device.sync_status]}`}
        >
          {device.sync_status}
        </span>
        {device.firmware_version !== LATEST_FIRMWARE && (
          <span className="rounded-full px-2 py-0.5 font-medium bg-amber-100 text-amber-700">
            FW outdated
          </span>
        )}
      </div>
    </button>
  )
}

function AlertCard({
  alert, onAcknowledge, onSelect,
}: { alert: FleetAlert; onAcknowledge: () => void; onSelect: () => void }) {
  const isCritical = alert.severity === 'CRITICAL'
  return (
    <div className={`rounded-lg border p-3 space-y-1.5 ${
      isCritical ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <button onClick={onSelect} className="text-xs font-semibold text-slate-800 text-left hover:underline flex-1">
          {alert.device_id}
        </button>
        {!alert.acknowledged_at && (
          <button
            onClick={onAcknowledge}
            className="text-[10px] text-slate-500 hover:text-slate-700 whitespace-nowrap"
            aria-label="Acknowledge alert"
          >
            ACK
          </button>
        )}
      </div>
      <p className="text-xs text-slate-700 line-clamp-2">{alert.message}</p>
      <p className="text-[10px] text-slate-400">{timeAgo(alert.triggered_at)}</p>
    </div>
  )
}
