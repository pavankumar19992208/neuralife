import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Download, ArrowLeft, Loader2, Search, IndianRupee, Info,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useStudentLedger, useRecordPayment } from '@/hooks/useFees'
import { generateReceiptPDF } from '@/lib/generateReceiptPDF'
import { slideUp, scaleIn } from '@/lib/animations'
import type { PaymentReceipt, StudentFeeBalance, FeeLedgerItem } from '@/types/common'

// ─── Schema ───────────────────────────────────────────────────────────────

const FormSchema = z.object({
  neura_id: z.string().min(10, 'Enter a valid Neura ID'),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be positive')
    .multipleOf(0.01),
  payment_mode: z.enum(['CASH', 'UPI', 'CHEQUE', 'NEFT', 'ONLINE']),
  transaction_reference: z.string().max(100).optional(),
  notes: z.string().max(200).optional(),
})

type FormValues = z.infer<typeof FormSchema>

type Screen = 'form' | 'confirm' | 'receipt'

// ─── Unpaid Terms Checklist ────────────────────────────────────────────────

function UnpaidTermsChecklist({
  ledger,
  selectedIds,
  onToggle,
  onSelectAll,
}: {
  ledger: FeeLedgerItem[]
  selectedIds: Set<string>
  onToggle: (id: string, balance: number) => void
  onSelectAll: () => void
}) {
  const unpaid = ledger.filter((i) => i.balance > 0 && i.status !== 'PAID')

  if (unpaid.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-3">
        No unpaid items found.
      </div>
    )
  }

  // Group by period_label
  const grouped = new Map<string, FeeLedgerItem[]>()
  for (const item of unpaid) {
    const key = item.period_label ?? 'One-time'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(item)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">Unpaid Items</p>
        <button
          type="button"
          onClick={onSelectAll}
          className="text-xs text-primary font-medium hover:underline"
        >
          Select All Unpaid
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
        {[...grouped.entries()].map(([period, items]) => (
          <div key={period}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-2 mb-1">
              {period}
            </p>
            {items.map((item) => {
              const checked = selectedIds.has(item.id)
              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                    checked ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 border border-border hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(item.id, item.balance)}
                    className="h-3.5 w-3.5 rounded accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-slate-800">
                      {item.fee_head.replace(/_/g, ' ')}
                    </span>
                    {item.amount_paid > 0 && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground">
                        (paid ₹{item.amount_paid.toLocaleString('en-IN')})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-semibold text-slate-900">
                      ₹{item.balance.toLocaleString('en-IN')}
                    </span>
                    {item.status === 'OVERDUE' && (
                      <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700">
                        OVERDUE
                      </span>
                    )}
                    <button
                      type="button"
                      title={`Due: ₹${item.amount_due} · Paid: ₹${item.amount_paid} · Waived: ₹${item.amount_waived}`}
                      className="text-muted-foreground hover:text-slate-700"
                      tabIndex={-1}
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </div>
                </label>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Screen 1: Form ────────────────────────────────────────────────────────

function FormScreen({
  onConfirm,
  initialNeuraId,
}: {
  onConfirm: (
    values: FormValues,
    balance: StudentFeeBalance,
    allocations?: Array<{ ledger_id: string; amount: number }>
  ) => void
  initialNeuraId?: string
}) {
  const [neuraIdInput, setNeuraIdInput] = useState(initialNeuraId ?? '')
  const [searchedId, setSearchedId] = useState<string | null>(initialNeuraId ?? null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data: balance, isLoading: ledgerLoading, isError: ledgerError } = useStudentLedger(searchedId)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { payment_mode: 'CASH', neura_id: initialNeuraId ?? '' },
  })

  const watchedMode = watch('payment_mode')

  // Auto-search when initialNeuraId provided
  useEffect(() => {
    if (initialNeuraId) {
      setSearchedId(initialNeuraId)
      setValue('neura_id', initialNeuraId)
    }
  }, [initialNeuraId, setValue])

  // Compute total from selected items
  const selectedTotal = balance
    ? balance.ledger
        .filter((i) => selectedIds.has(i.id))
        .reduce((s, i) => s + i.balance, 0)
    : 0

  // Auto-fill amount when selection changes
  useEffect(() => {
    if (selectedIds.size > 0) {
      setValue('amount', Math.round(selectedTotal * 100) / 100)
    } else if (balance && balance.total_balance > 0 && selectedIds.size === 0) {
      setValue('amount', balance.total_balance)
    }
  }, [selectedTotal, balance, setValue, selectedIds.size])

  function handleLookup() {
    const trimmed = neuraIdInput.trim().toUpperCase()
    if (trimmed.length >= 10) {
      setSearchedId(trimmed)
      setValue('neura_id', trimmed)
      setSelectedIds(new Set())
    }
  }

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (!balance) return
    const unpaidIds = balance.ledger
      .filter((i) => i.balance > 0 && i.status !== 'PAID')
      .map((i) => i.id)
    setSelectedIds(new Set(unpaidIds))
  }

  const onSubmit = (values: FormValues) => {
    if (!balance) return
    const allocations =
      selectedIds.size > 0
        ? balance.ledger
            .filter((i) => selectedIds.has(i.id))
            .map((i) => ({ ledger_id: i.id, amount: i.balance }))
        : undefined
    onConfirm(values, balance, allocations)
  }

  const hasUnpaidItems = balance && balance.ledger.some(
    (i) => i.balance > 0 && i.status !== 'PAID'
  )

  return (
    <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-5">
      {/* Neura ID lookup */}
      <div className="space-y-2">
        <Label>Neura ID</Label>
        <div className="flex gap-2">
          <Input
            placeholder="NID-2025-AP-000000"
            value={neuraIdInput}
            onChange={(e) => setNeuraIdInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            className="font-mono text-sm uppercase"
          />
          <Button type="button" variant="outline" onClick={handleLookup} size="icon" aria-label="Look up student">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {errors.neura_id && (
          <p className="text-xs text-red-500">{errors.neura_id.message}</p>
        )}
      </div>

      {/* Student info card */}
      {ledgerLoading && searchedId && (
        <div className="rounded-lg border border-border bg-slate-50 p-3 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      )}
      {ledgerError && searchedId && (
        <p className="text-sm text-red-500">Student not found. Check the Neura ID.</p>
      )}
      {balance && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{balance.full_name}</p>
              <p className="text-xs text-muted-foreground">
                Class {balance.class_year} · {balance.section}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Balance Due</p>
              <p className="text-lg font-bold text-slate-900">
                ₹{balance.total_balance.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <StatusBadge status={balance.status} />
          </div>
        </div>
      )}

      {/* Unpaid checklist */}
      {balance && hasUnpaidItems && (
        <UnpaidTermsChecklist
          ledger={balance.ledger}
          selectedIds={selectedIds}
          onToggle={toggleItem}
          onSelectAll={selectAll}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Amount */}
        <div className="space-y-1.5">
          <Label>
            Amount (₹)
            {selectedIds.size > 0 && (
              <span className="ml-2 text-xs text-primary font-normal">
                ({selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected)
              </span>
            )}
          </Label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="number"
              step="0.01"
              min="0.01"
              className="pl-9"
              {...register('amount', { valueAsNumber: true })}
            />
          </div>
          {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
        </div>

        {/* Payment mode */}
        <div className="space-y-1.5">
          <Label>Payment Mode</Label>
          <Select
            value={watchedMode}
            onValueChange={(v) => setValue('payment_mode', v as FormValues['payment_mode'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['CASH', 'UPI', 'CHEQUE', 'NEFT', 'ONLINE'].map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Transaction reference (optional for non-cash) */}
        {watchedMode !== 'CASH' && (
          <div className="space-y-1.5">
            <Label>
              Transaction Reference{' '}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              placeholder={watchedMode === 'UPI' ? 'UPI transaction ID' : 'Reference number'}
              {...register('transaction_reference')}
            />
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <Label>
            Notes <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input placeholder="Any remarks..." {...register('notes')} />
        </div>

        <Button type="submit" className="w-full" disabled={!balance}>
          Review Payment
        </Button>
      </form>
    </motion.div>
  )
}

// ─── Screen 2: Confirm ─────────────────────────────────────────────────────

function ConfirmScreen({
  values,
  balance,
  onBack,
  onConfirm,
  isPending,
}: {
  values: FormValues
  balance: StudentFeeBalance
  onBack: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  return (
    <motion.div variants={scaleIn} initial="initial" animate="animate" className="space-y-5">
      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-800">
          Confirm this payment — once recorded it cannot be changed (only voided by Principal).
        </p>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
        <Row label="Student" value={balance.full_name} />
        <Row label="Neura ID" value={values.neura_id} mono />
        <Row label="Class" value={`Class ${balance.class_year} - ${balance.section}`} />
        <Row
          label="Amount"
          value={`₹${values.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          highlight
        />
        <Row label="Mode" value={values.payment_mode} />
        {values.transaction_reference && (
          <Row label="Ref No." value={values.transaction_reference} mono />
        )}
        {values.notes && <Row label="Notes" value={values.notes} />}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={isPending}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onConfirm} className="flex-1" disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          {isPending ? 'Recording...' : 'Record Payment'}
        </Button>
      </div>
    </motion.div>
  )
}

function Row({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`text-sm ${mono ? 'font-mono' : ''} ${highlight ? 'text-lg font-bold text-blue-700' : 'font-medium text-slate-900'}`}
      >
        {value}
      </span>
    </div>
  )
}

// ─── Screen 3: Receipt ─────────────────────────────────────────────────────

function ReceiptScreen({
  receipt,
  onClose,
}: {
  receipt: PaymentReceipt
  onClose: () => void
}) {
  return (
    <motion.div variants={scaleIn} initial="initial" animate="animate" className="space-y-5">
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <p className="text-lg font-bold text-slate-900">Payment Recorded</p>
        <p className="text-sm text-muted-foreground">Receipt #{receipt.receipt_number}</p>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
        <Row label="Student" value={receipt.student_name} />
        <Row
          label="Amount"
          value={`₹${receipt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          highlight
        />
        <Row label="Mode" value={receipt.payment_mode} />
        <Row label="Date" value={receipt.payment_date} />
        <Row label="Collected by" value={receipt.collected_by_name} />
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => generateReceiptPDF(receipt)}
        >
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
        <Button onClick={onClose} className="flex-1">
          Done
        </Button>
      </div>
    </motion.div>
  )
}

// ─── Status Badge helper ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    PAID: 'bg-green-100 text-green-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
    OVERDUE: 'bg-red-100 text-red-700',
    PENDING: 'bg-slate-100 text-slate-600',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${variants[status] ?? variants.PENDING}`}>
      {status}
    </span>
  )
}

// ─── Main Modal ────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  initialNeuraId?: string
}

export function RecordPaymentModal({ open, onClose, initialNeuraId }: Props) {
  const [screen, setScreen] = useState<Screen>('form')
  const [formValues, setFormValues] = useState<FormValues | null>(null)
  const [studentBalance, setStudentBalance] = useState<StudentFeeBalance | null>(null)
  const [allocations, setAllocations] = useState<Array<{ ledger_id: string; amount: number }> | undefined>(undefined)
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null)

  const recordPayment = useRecordPayment()

  function handleFormConfirm(
    values: FormValues,
    balance: StudentFeeBalance,
    allocs?: Array<{ ledger_id: string; amount: number }>
  ) {
    setFormValues(values)
    setStudentBalance(balance)
    setAllocations(allocs)
    setScreen('confirm')
  }

  async function handleConfirm() {
    if (!formValues) return
    const result = await recordPayment.mutateAsync({
      ...formValues,
      ledger_allocations: allocations,
    })
    setReceipt(result)
    setScreen('receipt')
  }

  function handleClose() {
    setScreen('form')
    setFormValues(null)
    setStudentBalance(null)
    setAllocations(undefined)
    setReceipt(null)
    recordPayment.reset()
    onClose()
  }

  const titles: Record<Screen, string> = {
    form: 'Record Fee Payment',
    confirm: 'Confirm Payment',
    receipt: 'Payment Complete',
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titles[screen]}</DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {screen === 'form' && (
            <motion.div key="form">
              <FormScreen
                onConfirm={handleFormConfirm}
                initialNeuraId={initialNeuraId}
              />
            </motion.div>
          )}
          {screen === 'confirm' && formValues && studentBalance && (
            <motion.div key="confirm">
              <ConfirmScreen
                values={formValues}
                balance={studentBalance}
                onBack={() => setScreen('form')}
                onConfirm={handleConfirm}
                isPending={recordPayment.isPending}
              />
            </motion.div>
          )}
          {screen === 'receipt' && receipt && (
            <motion.div key="receipt">
              <ReceiptScreen receipt={receipt} onClose={handleClose} />
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
