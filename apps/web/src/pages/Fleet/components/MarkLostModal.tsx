import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { useMarkDeviceLost } from '@/hooks/useFleet'
import type { FleetDevice } from '@/types/common'

interface Props {
  device: FleetDevice
  onClose: () => void
}

export default function MarkLostModal({ device, onClose }: Props) {
  const markLost = useMarkDeviceLost()

  const handleConfirm = async () => {
    await markLost.mutateAsync(device.device_id)
    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            Mark Device as Lost
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-slate-700">
            You are about to mark <strong>{device.device_id}</strong> as LOST.
          </p>
          {device.student_name && (
            <p className="text-sm text-slate-600">
              This device is currently assigned to <strong>{device.student_name}</strong>.
              A LOST alert will be created automatically.
            </p>
          )}
          <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
            This action will lock the device, create a critical alert, and record the loss report time.
            Notify the school authorities and file a police report if required.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={markLost.isPending}
          >
            {markLost.isPending ? 'Marking lost…' : 'Mark as Lost'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
