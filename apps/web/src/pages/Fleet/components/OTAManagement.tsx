import { useState } from 'react'
import { Zap, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useFleetDevices, useOTACampaigns, useLaunchOTA } from '@/hooks/useFleet'
import { LATEST_FIRMWARE } from '@/types/common'
import type { FleetDevice } from '@/types/common'

export default function OTAManagement() {
  const { data: devices = [], isLoading: devLoading } = useFleetDevices()
  const { data: campaigns = [], isLoading: campLoading } = useOTACampaigns()
  const launchOTA = useLaunchOTA()

  const outdatedDevices = devices.filter(
    d => d.firmware_version !== LATEST_FIRMWARE && d.status !== 'DECOMMISSIONED',
  )
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggleAll = () => {
    if (selected.size === outdatedDevices.length) setSelected(new Set())
    else setSelected(new Set(outdatedDevices.map(d => d.device_id)))
  }

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const handleLaunch = async () => {
    if (selected.size === 0) return
    await launchOTA.mutateAsync({ targetFirmware: LATEST_FIRMWARE, deviceIds: Array.from(selected) })
    setSelected(new Set())
  }

  if (devLoading || campLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-amber-600 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold text-slate-900">
              {outdatedDevices.length} device{outdatedDevices.length !== 1 ? 's' : ''} need firmware update
            </p>
            <p className="text-sm text-slate-600">Latest version: {LATEST_FIRMWARE}</p>
          </div>
        </div>
        {outdatedDevices.length > 0 && (
          <Button
            onClick={handleLaunch}
            disabled={selected.size === 0 || launchOTA.isPending}
            className="flex-shrink-0"
          >
            {launchOTA.isPending ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Launching…</>
            ) : (
              <><Zap className="h-4 w-4 mr-1.5" />Push OTA ({selected.size})</>
            )}
          </Button>
        )}
      </div>

      {/* Outdated device list */}
      {outdatedDevices.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Select devices to update</p>
            <button onClick={toggleAll} className="text-xs text-primary hover:underline">
              {selected.size === outdatedDevices.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          {outdatedDevices.map(d => (
            <DeviceOTARow key={d.device_id} device={d} selected={selected.has(d.device_id)} onToggle={toggle} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" aria-hidden="true" />
          <p className="font-medium text-slate-900">All devices are up to date</p>
          <p className="text-sm text-slate-500 mt-1">Every active device is running firmware {LATEST_FIRMWARE}</p>
        </div>
      )}

      {/* Campaign history */}
      {campaigns.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700 border-t border-border pt-4">Campaign History</p>
          {campaigns.map(c => (
            <div key={c.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 text-sm">→ {c.target_firmware}</p>
                <p className="text-xs text-slate-500">
                  {c.target_device_ids.length} devices · {new Date(c.launched_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {c.updated_count > 0 && (
                  <span className="text-xs text-green-600 flex items-center gap-0.5">
                    <CheckCircle2 className="h-3 w-3" />{c.updated_count} OK
                  </span>
                )}
                {c.failed_count > 0 && (
                  <span className="text-xs text-red-600 flex items-center gap-0.5">
                    <AlertCircle className="h-3 w-3" />{c.failed_count} failed
                  </span>
                )}
                <Badge
                  variant={c.status === 'COMPLETED' ? 'default' : c.status === 'FAILED' ? 'destructive' : 'outline'}
                  className="text-xs"
                >
                  {c.status === 'IN_PROGRESS' && <Clock className="h-3 w-3 mr-0.5" />}
                  {c.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DeviceOTARow({
  device, selected, onToggle,
}: { device: FleetDevice; selected: boolean; onToggle: (id: string) => void }) {
  return (
    <button
      onClick={() => onToggle(device.device_id)}
      className={`w-full rounded-lg border p-3 flex items-center gap-3 text-left transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        readOnly
        className="h-4 w-4 accent-primary"
        aria-label={`Select ${device.device_id}`}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 text-sm">{device.device_id}</p>
        <p className="text-xs text-slate-500 truncate">
          {device.student_name ?? 'Unassigned'} · v{device.firmware_version} → v{LATEST_FIRMWARE}
        </p>
      </div>
      <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs flex-shrink-0">
        {device.firmware_version}
      </Badge>
    </button>
  )
}
