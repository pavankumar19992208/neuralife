import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useReturnDevice } from '@/hooks/useFleet'
import type { FleetDevice, ReturnDeviceInput } from '@/types/common'

interface Props {
  device: FleetDevice
  onClose: () => void
}

const CONDITIONS = [
  { value: 'EXCELLENT', label: 'Excellent', color: 'text-green-600' },
  { value: 'GOOD',      label: 'Good',      color: 'text-blue-600' },
  { value: 'MINOR_DAMAGE', label: 'Minor Damage', color: 'text-amber-600' },
  { value: 'MAJOR_DAMAGE', label: 'Major Damage', color: 'text-red-600' },
]

export default function ReturnDeviceModal({ device, onClose }: Props) {
  const [condition, setCondition] = useState<ReturnDeviceInput['condition']>('GOOD')
  const [repairRequired, setRepairRequired] = useState(false)
  const [costEstimate, setCostEstimate] = useState('')
  const [damageDesc, setDamageDesc] = useState('')
  const [notes, setNotes] = useState('')
  const returnDevice = useReturnDevice()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await returnDevice.mutateAsync({
      deviceId: device.device_id,
      data: {
        condition,
        repair_required: repairRequired,
        damage_description: damageDesc || undefined,
        repair_cost_estimate: costEstimate ? Number(costEstimate) : undefined,
        notes: notes || undefined,
      },
    })
    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Return {device.device_id}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Condition at Return</Label>
            <div className="grid grid-cols-2 gap-2">
              {CONDITIONS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    setCondition(c.value as ReturnDeviceInput['condition'])
                    if (['EXCELLENT', 'GOOD'].includes(c.value)) setRepairRequired(false)
                    else setRepairRequired(true)
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    condition === c.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-slate-600 hover:border-primary/50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {(condition === 'MINOR_DAMAGE' || condition === 'MAJOR_DAMAGE') && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="damage_desc">Damage Description</Label>
                <Textarea
                  id="damage_desc"
                  placeholder="Describe the damage…"
                  value={damageDesc}
                  onChange={e => setDamageDesc(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cost_estimate">Repair Cost Estimate (₹)</Label>
                <Input
                  id="cost_estimate"
                  type="number"
                  min="0"
                  placeholder="e.g. 850"
                  value={costEstimate}
                  onChange={e => setCostEstimate(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={returnDevice.isPending}>
              {returnDevice.isPending ? 'Processing…' : 'Confirm Return'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
