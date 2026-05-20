import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAssignDevice } from '@/hooks/useFleet'
import type { FleetDevice } from '@/types/common'

interface Props {
  device: FleetDevice
  onClose: () => void
}

export default function AssignDeviceModal({ device, onClose }: Props) {
  const [neuraId, setNeuraId] = useState('')
  const assign = useAssignDevice()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!neuraId.trim()) return
    await assign.mutateAsync({ deviceId: device.device_id, data: { neura_id: neuraId.trim() } })
    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign {device.device_id}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="neura_id">Student NeuraID</Label>
            <Input
              id="neura_id"
              placeholder="NID-2025-AP-XXXXXX"
              value={neuraId}
              onChange={e => setNeuraId(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-slate-500">Enter the student's NeuraID exactly as shown on their SmartPad card.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!neuraId.trim() || assign.isPending}>
              {assign.isPending ? 'Assigning…' : 'Assign Device'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
