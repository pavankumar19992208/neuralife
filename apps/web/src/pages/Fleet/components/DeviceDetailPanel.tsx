import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Tablet, Wifi, WifiOff, BatteryLow, HardDrive,
  MapPin, Clock, User, AlertTriangle, Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useDeviceDetail, useUpdateDeviceStatus } from '@/hooks/useFleet'
import { LATEST_FIRMWARE } from '@/types/common'
import type { FleetDevice } from '@/types/common'
import AssignDeviceModal from './AssignDeviceModal'
import ReturnDeviceModal from './ReturnDeviceModal'
import MarkLostModal from './MarkLostModal'

interface Props {
  device: FleetDevice
  onClose: () => void
}

const SYNC_COLORS: Record<string, string> = {
  RECENT:   'bg-green-100 text-green-700',
  WATCH:    'bg-amber-100 text-amber-700',
  OFFLINE:  'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

const CONDITION_LABELS: Record<string, string> = {
  EXCELLENT: 'Excellent', GOOD: 'Good',
  MINOR_DAMAGE: 'Minor Damage', MAJOR_DAMAGE: 'Major Damage',
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never'
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3600000)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function DeviceDetailPanel({ device, onClose }: Props) {
  const [modal, setModal] = useState<'assign' | 'return' | 'lost' | null>(null)
  const { data: detail, isLoading } = useDeviceDetail(device.device_id)
  const updateStatus = useUpdateDeviceStatus()

  const storageGB = device.storage_used_mb ? (device.storage_used_mb / 1024).toFixed(1) : null

  return (
    <>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.25 }}
        className="fixed inset-y-0 right-0 z-40 w-[420px] bg-white shadow-xl border-l border-border overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <Tablet className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <p className="font-semibold text-slate-900">{device.device_id}</p>
              <p className="text-xs text-slate-500">{device.serial_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close device panel"
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={device.status === 'ACTIVE' ? 'default' : 'destructive'}>
              {device.status}
            </Badge>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${SYNC_COLORS[device.sync_status]}`}>
              {device.sync_status === 'RECENT' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {device.sync_status}
            </span>
            {device.firmware_version !== LATEST_FIRMWARE && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                FW {device.firmware_version}
              </Badge>
            )}
            {device.is_at_risk_student && (
              <Badge variant="destructive">AT_RISK Student</Badge>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<BatteryLow className="h-4 w-4" />}
              label="Battery"
              value={device.battery_level !== null ? `${device.battery_level}%` : '—'}
              warn={device.battery_level !== null && device.battery_level < 20}
            />
            <StatCard
              icon={<HardDrive className="h-4 w-4" />}
              label="Storage"
              value={storageGB ? `${storageGB} GB` : '—'}
              warn={device.storage_used_mb !== null && device.storage_used_mb > 25000}
            />
            <StatCard
              icon={<Clock className="h-4 w-4" />}
              label="Last Sync"
              value={timeAgo(device.last_sync_at)}
              warn={device.sync_status === 'CRITICAL' || device.sync_status === 'OFFLINE'}
            />
            <StatCard
              icon={<MapPin className="h-4 w-4" />}
              label="Location"
              value={device.location_lat ? `${device.location_lat.toFixed(4)}, ${device.location_lng?.toFixed(4)}` : 'No GPS'}
            />
          </div>

          {/* Assigned student */}
          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <User className="h-3 w-3" /> Assigned Student
            </p>
            {device.assigned_neura_id ? (
              <div>
                <p className="font-medium text-slate-900">{device.student_name ?? device.assigned_neura_id}</p>
                <p className="text-xs text-slate-500">{device.student_class} · {device.assigned_neura_id}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Not assigned</p>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            {!device.assigned_neura_id && device.status !== 'LOST' && (
              <Button size="sm" onClick={() => setModal('assign')} className="col-span-2">
                Assign to Student
              </Button>
            )}
            {device.assigned_neura_id && (
              <Button size="sm" variant="outline" onClick={() => setModal('return')}>
                Return Device
              </Button>
            )}
            {device.status !== 'LOST' && (
              <Button
                size="sm" variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setModal('lost')}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                Mark Lost
              </Button>
            )}
            {device.status !== 'LOST' && device.status !== 'ACTIVE' && (
              <Button
                size="sm" variant="outline"
                onClick={() => updateStatus.mutate({ deviceId: device.device_id, status: 'ACTIVE' })}
                disabled={updateStatus.isPending}
              >
                <Shield className="h-3.5 w-3.5 mr-1" />
                Reactivate
              </Button>
            )}
            {device.status === 'ACTIVE' && (
              <Button
                size="sm" variant="outline"
                onClick={() => updateStatus.mutate({ deviceId: device.device_id, status: 'LOCKED' })}
                disabled={updateStatus.isPending}
              >
                Lock Device
              </Button>
            )}
          </div>

          {/* Detail sections */}
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          ) : detail ? (
            <>
              {/* Battery trend */}
              {detail.health_snapshots.length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">14-Day Battery Trend</p>
                  <div className="flex items-end gap-0.5 h-12">
                    {detail.health_snapshots.slice(0, 14).reverse().map((s, i) => {
                      const pct = s.battery_level ?? 0
                      const h = Math.max(4, (pct / 100) * 48)
                      const color = pct < 20 ? '#ef4444' : pct < 40 ? '#f59e0b' : '#10b981'
                      return (
                        <div key={i} className="flex-1 flex flex-col justify-end" title={`${pct}%`}>
                          <div style={{ height: h, backgroundColor: color, borderRadius: 2 }} />
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Active alerts */}
              {detail.active_alerts.length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Active Alerts</p>
                  <div className="space-y-2">
                    {detail.active_alerts.map(a => (
                      <div key={a.id} className={`rounded-lg p-3 text-xs ${
                        a.severity === 'CRITICAL' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
                      }`}>
                        <p className="font-medium text-slate-800">{a.message}</p>
                        <p className="text-slate-500 mt-0.5">{timeAgo(a.triggered_at)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Assignment history */}
              {detail.assignment_history.length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Assignment History ({detail.assignment_history.length})
                  </p>
                  <div className="space-y-2">
                    {detail.assignment_history.map(h => (
                      <div key={h.id} className="rounded-lg border border-border p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-900">{h.student_name}</p>
                          {h.condition_at_return && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              h.condition_at_return === 'MAJOR_DAMAGE' ? 'bg-red-100 text-red-700' :
                              h.condition_at_return === 'MINOR_DAMAGE' ? 'bg-amber-100 text-amber-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {CONDITION_LABELS[h.condition_at_return] ?? h.condition_at_return}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500">
                          {new Date(h.assigned_at).toLocaleDateString()} →{' '}
                          {h.returned_at ? new Date(h.returned_at).toLocaleDateString() : 'Present'}
                        </p>
                        {h.notes && <p className="text-slate-600 italic">{h.notes}</p>}
                        {h.repair_required && h.repair_cost_estimate !== null && (
                          <p className="text-red-600">Repair: ₹{h.repair_cost_estimate.toLocaleString()}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Usage stats */}
              <section className="rounded-lg bg-slate-50 p-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Total Sessions</p>
                  <p className="font-bold text-slate-900">{detail.total_sessions.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Usage</p>
                  <p className="font-bold text-slate-900">{detail.total_usage_hours}h</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Firmware</p>
                  <p className="font-bold text-slate-900">{detail.firmware_version}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Repair Cost</p>
                  <p className="font-bold text-slate-900">
                    {detail.total_repair_cost > 0 ? `₹${detail.total_repair_cost.toLocaleString()}` : '—'}
                  </p>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </motion.div>

      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-30 bg-black/20"
        onClick={onClose}
      />

      {/* Sub-modals */}
      <AnimatePresence>
        {modal === 'assign' && <AssignDeviceModal device={device} onClose={() => setModal(null)} />}
        {modal === 'return' && <ReturnDeviceModal device={device} onClose={() => setModal(null)} />}
        {modal === 'lost'   && <MarkLostModal   device={device} onClose={() => setModal(null)} />}
      </AnimatePresence>
    </>
  )
}

function StatCard({
  icon, label, value, warn = false,
}: {
  icon: React.ReactNode; label: string; value: string; warn?: boolean
}) {
  return (
    <div className={`rounded-lg border p-3 space-y-0.5 ${warn ? 'border-red-200 bg-red-50' : 'border-border'}`}>
      <div className={`flex items-center gap-1 text-xs ${warn ? 'text-red-500' : 'text-slate-500'}`}>
        {icon}
        {label}
      </div>
      <p className={`font-semibold text-sm ${warn ? 'text-red-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}
