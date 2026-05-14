import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useConcessionRules,
  useCreateConcessionRule,
  useDeactivateConcessionRule,
  useCustomFeeHeads,
  useCreateCustomFeeHead,
  useUpdateFeeStructure,
} from '@/hooks/useFees'
import { useFeeStructure } from '@/hooks/useFees'
import type { ConcessionRule, CustomFeeHead, FeeStructureRow } from '@/types/common'

// ─── Concession Rule Form ──────────────────────────────────────────────────

const ConcessionFormSchema = z.object({
  rule_name: z.string().min(2).max(100),
  concession_type: z.string().min(1, 'Select a type'),
  eligibility_note: z.string().max(300).optional(),
  amount_type: z.enum(['PERCENT', 'FIXED']),
  concession_value: z.number({ invalid_type_error: 'Enter a number' }).positive().max(100),
  max_cap: z.number().positive().optional(),
  auto_apply: z.boolean(),
})
type ConcessionFormValues = z.infer<typeof ConcessionFormSchema>

const CONCESSION_TYPES = [
  'MERIT_SCHOLARSHIP', 'SC_ST_WAIVER', 'SIBLING_DISCOUNT', 'STAFF_WARD',
  'MANAGEMENT_QUOTA', 'OTHER', 'ALUMNI_CHILD', 'OBC_CONCESSION', 'EWS_CONCESSION',
  'INCOME_BPL', 'DISABILITY', 'SINGLE_PARENT', 'SIBLING_SECOND', 'SIBLING_THIRD_PLUS',
]

function ConcessionRuleForm({ onSaved }: { onSaved: () => void }) {
  const createRule = useCreateConcessionRule()
  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<ConcessionFormValues>({
    resolver: zodResolver(ConcessionFormSchema),
    defaultValues: { amount_type: 'PERCENT', auto_apply: true },
  })
  const watchedAmountType = watch('amount_type')
  const watchedAutoApply = watch('auto_apply')

  const onSubmit = async (values: ConcessionFormValues) => {
    await createRule.mutateAsync({
      ...values,
      eligibility_note: values.eligibility_note ?? null,
      applies_to_heads: null,
      max_cap: values.max_cap ?? null,
    })
    reset()
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 border border-border rounded-xl p-4 bg-surface-raised/30">
      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">New Rule</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Rule Name</Label>
          <Input placeholder="e.g. SC/ST 50% waiver" {...register('rule_name')} />
          {errors.rule_name && <p className="text-xs text-danger">{errors.rule_name.message}</p>}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Concession Type</Label>
          <Select onValueChange={(v) => setValue('concession_type', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              {CONCESSION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.concession_type && <p className="text-xs text-danger">{errors.concession_type.message}</p>}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Amount Type</Label>
          <Select
            value={watchedAmountType}
            onValueChange={(v) => setValue('amount_type', v as 'PERCENT' | 'FIXED')}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENT">Percentage (%)</SelectItem>
              <SelectItem value="FIXED">Fixed Amount (₹)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">
            {watchedAmountType === 'PERCENT' ? 'Percentage (%)' : 'Amount (₹)'}
          </Label>
          <Input
            type="number"
            step="0.01"
            {...register('concession_value', { valueAsNumber: true })}
          />
          {errors.concession_value && <p className="text-xs text-danger">{errors.concession_value.message}</p>}
        </div>

        {watchedAmountType === 'PERCENT' && (
          <div className="space-y-1">
            <Label className="text-xs">Max Cap (₹) <span className="text-text-muted">(optional)</span></Label>
            <Input
              type="number"
              step="0.01"
              placeholder="No cap"
              {...register('max_cap', { valueAsNumber: true })}
            />
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Eligibility Note <span className="text-text-muted">(optional)</span></Label>
          <Input placeholder="e.g. Income certificate required" {...register('eligibility_note')} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setValue('auto_apply', !watchedAutoApply)}
            className="text-primary"
            aria-label="Toggle auto-apply"
          >
            {watchedAutoApply ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5 text-text-muted" />}
          </button>
          <span className="text-xs text-text-secondary">Auto-apply during enrollment</span>
        </div>
        <Button type="submit" size="sm" disabled={createRule.isPending}>
          {createRule.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          <span className="ml-1">Add Rule</span>
        </Button>
      </div>
    </form>
  )
}

// ─── Custom Fee Head Form ──────────────────────────────────────────────────

const PREDEFINED_HEADS = [
  { code: 'BUS_FEE', name: 'Bus Fee' },
  { code: 'SPORTS_FEE', name: 'Sports Fee' },
  { code: 'LAB_FEE', name: 'Lab Fee / Science Lab' },
  { code: 'LIBRARY_FEE', name: 'Library Fee' },
  { code: 'HOSTEL_FEE', name: 'Hostel Fee' },
  { code: 'ACTIVITY_FEE', name: 'Cultural Activities Fee' },
  { code: 'UNIFORM_FEE', name: 'Uniform Fee' },
  { code: 'COMPUTER_LAB', name: 'Computer Lab Fee' },
  { code: 'MEAL_FEE', name: 'Meal / Canteen Fee' },
  { code: 'MEDICAL_FEE', name: 'Medical / Health Fee' },
  { code: 'CUSTOM', name: 'Custom (enter manually)' },
]

const CustomHeadFormSchema = z.object({
  head_code: z.string().min(1, 'Required'),
  display_name: z.string().min(2).max(100),
  description: z.string().max(300).optional(),
  collection_type: z.enum(['MONTHLY', 'TERMLY', 'ANNUAL', 'ONE_TIME']),
  default_amount: z.number({ invalid_type_error: 'Enter amount' }).min(0),
})
type CustomHeadFormValues = z.infer<typeof CustomHeadFormSchema>

function CustomFeeHeadForm({ onSaved }: { onSaved: () => void }) {
  const createHead = useCreateCustomFeeHead()
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<CustomHeadFormValues>({
    resolver: zodResolver(CustomHeadFormSchema),
    defaultValues: { collection_type: 'MONTHLY', default_amount: 0 },
  })

  function handlePresetChange(code: string) {
    setSelectedPreset(code)
    const preset = PREDEFINED_HEADS.find((h) => h.code === code)
    if (preset && code !== 'CUSTOM') {
      setValue('head_code', preset.code)
      setValue('display_name', preset.name)
    } else if (code === 'CUSTOM') {
      setValue('head_code', '')
      setValue('display_name', '')
    }
  }

  const onSubmit = async (values: CustomHeadFormValues) => {
    await createHead.mutateAsync({
      head_code: values.head_code,
      display_name: values.display_name,
      description: values.description ?? null,
      collection_type: values.collection_type,
      amounts: [{ class_year: null, student_category: null, amount: values.default_amount }],
    })
    reset()
    setSelectedPreset('')
    onSaved()
  }

  const watchedCollectionType = watch('collection_type')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 border border-border rounded-xl p-4 bg-surface-raised/30">
      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">New Fee Head</p>

      <div className="space-y-1">
        <Label className="text-xs">Preset</Label>
        <Select value={selectedPreset} onValueChange={handlePresetChange}>
          <SelectTrigger><SelectValue placeholder="Choose a preset or Custom..." /></SelectTrigger>
          <SelectContent>
            {PREDEFINED_HEADS.map((h) => (
              <SelectItem key={h.code} value={h.code}>{h.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(selectedPreset === 'CUSTOM' || !selectedPreset) && (
          <div className="space-y-1">
            <Label className="text-xs">Fee Code <span className="text-text-muted">(uppercase, e.g. BUS_FEE)</span></Label>
            <Input placeholder="MY_FEE" className="uppercase font-mono" {...register('head_code')} />
            {errors.head_code && <p className="text-xs text-danger">{errors.head_code.message}</p>}
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Display Name</Label>
          <Input placeholder="Shown to users" {...register('display_name')} />
          {errors.display_name && <p className="text-xs text-danger">{errors.display_name.message}</p>}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Collection Type</Label>
          <Select
            value={watchedCollectionType}
            onValueChange={(v) => setValue('collection_type', v as CustomHeadFormValues['collection_type'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="TERMLY">Per Term</SelectItem>
              <SelectItem value="ANNUAL">Annual</SelectItem>
              <SelectItem value="ONE_TIME">One-time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Default Amount (₹)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register('default_amount', { valueAsNumber: true })}
          />
          {errors.default_amount && <p className="text-xs text-danger">{errors.default_amount.message}</p>}
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Description <span className="text-text-muted">(optional)</span></Label>
          <Input placeholder="Brief description..." {...register('description')} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={createHead.isPending}>
          {createHead.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          <span className="ml-1">Add Fee Head</span>
        </Button>
      </div>
    </form>
  )
}

// ─── Tab: Concession Rules ────────────────────────────────────────────────

function ConcessionRulesTab() {
  const [showForm, setShowForm] = useState(false)
  const { data: rules, isLoading } = useConcessionRules()
  const deactivate = useDeactivateConcessionRule()

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      )}

      {!isLoading && (rules ?? []).length > 0 && (
        <div className="space-y-2">
          {(rules ?? []).map((rule: ConcessionRule) => (
            <div
              key={rule.id}
              className={`flex items-start justify-between gap-3 rounded-xl border p-4 transition-opacity ${
                rule.is_active ? 'border-border bg-white' : 'border-border/50 bg-surface-raised/40 opacity-60'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-text-primary">{rule.rule_name}</p>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {rule.concession_type.replace(/_/g, ' ')}
                  </span>
                  {rule.auto_apply && (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                      Auto-apply
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {rule.amount_type === 'PERCENT'
                    ? `${rule.concession_value}% discount${rule.max_cap ? ` (max ₹${rule.max_cap})` : ''}`
                    : `₹${rule.concession_value} fixed deduction`}
                </p>
                {rule.eligibility_note && (
                  <p className="text-xs text-text-muted mt-0.5 italic">{rule.eligibility_note}</p>
                )}
              </div>
              {rule.is_active && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:text-danger hover:bg-danger/10 h-7 w-7 p-0 shrink-0"
                  onClick={() => deactivate.mutate(rule.id)}
                  aria-label={`Deactivate ${rule.rule_name}`}
                  disabled={deactivate.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && (rules ?? []).length === 0 && !showForm && (
        <div className="text-center py-8 text-text-muted text-sm">
          No concession rules configured. Add your first rule below.
        </div>
      )}

      {showForm ? (
        <ConcessionRuleForm onSaved={() => setShowForm(false)} />
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Rule
        </Button>
      )}
    </div>
  )
}

// ─── Tab: Custom Fee Heads ────────────────────────────────────────────────

function CustomFeeHeadsTab() {
  const [showForm, setShowForm] = useState(false)
  const { data: heads, isLoading } = useCustomFeeHeads()

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      )}

      {!isLoading && (heads ?? []).length > 0 && (
        <div className="space-y-2">
          {(heads ?? []).map((head: CustomFeeHead) => (
            <div
              key={head.id}
              className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                head.is_active ? 'border-border bg-white' : 'border-border/50 bg-surface-raised/40 opacity-60'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-text-primary">{head.display_name}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-text-secondary">
                    {head.head_code}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {head.collection_type}
                  </span>
                </div>
                {head.description && (
                  <p className="text-xs text-text-muted mt-0.5">{head.description}</p>
                )}
                {head.amounts.length > 0 && (
                  <p className="text-xs text-text-secondary mt-0.5">
                    Default: ₹{head.amounts[0].amount.toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (heads ?? []).length === 0 && !showForm && (
        <div className="text-center py-8 text-text-muted text-sm">
          No custom fee heads defined. Add your first below.
        </div>
      )}

      {showForm ? (
        <CustomFeeHeadForm onSaved={() => setShowForm(false)} />
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Fee Head
        </Button>
      )}
    </div>
  )
}

// ─── Tab: Fee Structure ────────────────────────────────────────────────────

function FeeStructureTab() {
  const { data: structures, isLoading } = useFeeStructure()
  const updateStructure = useUpdateFeeStructure()
  const [category, setCategory] = useState<string>('GENERAL')
  const [edited, setEdited] = useState<Record<string, Record<string, number>>>({})

  const filtered = (structures ?? []).filter((s) => s.student_category === category)

  function getCellValue(classYear: number, field: keyof FeeStructureRow): number {
    const key = `${classYear}-${category}`
    if (edited[key]?.[field] !== undefined) return edited[key][field]
    const row = filtered.find((r) => r.class_year === classYear)
    return row ? (row[field] as number) : 0
  }

  function setCellValue(classYear: number, field: string, value: number) {
    const key = `${classYear}-${category}`
    setEdited((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), [field]: value },
    }))
  }

  async function handleSave() {
    if (!structures) return
    const rows: FeeStructureRow[] = structures
      .filter((s) => s.student_category === category)
      .map((s) => {
        const key = `${s.class_year}-${category}`
        const edits = edited[key] ?? {}
        return { ...s, ...edits }
      })
    await updateStructure.mutateAsync(rows)
    setEdited({})
  }

  const COLS: Array<{ field: keyof FeeStructureRow; label: string }> = [
    { field: 'tuition_fee_monthly', label: 'Tuition/mo' },
    { field: 'exam_fee_per_term', label: 'Exam/term' },
    { field: 'development_fee', label: 'Development' },
    { field: 'transport_fee_monthly', label: 'Transport/mo' },
    { field: 'late_fee_amount', label: 'Late Fee' },
    { field: 'fee_due_day_of_month', label: 'Due Day' },
  ]

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex items-center gap-1 flex-wrap">
        {['GENERAL', 'SC_ST', 'OBC', 'EWS', 'FREE'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              category === cat
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-text-secondary border-border hover:border-primary/40'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading && <Skeleton className="h-64 rounded-xl" />}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-8 text-text-muted text-sm">
          No fee structure found for {category} category.
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-raised border-b border-border">
                <th className="text-left py-2.5 px-3 font-semibold text-text-secondary">Class</th>
                {COLS.map((c) => (
                  <th key={c.field} className="text-right py-2.5 px-3 font-semibold text-text-secondary">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered
                .sort((a, b) => a.class_year - b.class_year)
                .map((row) => (
                  <tr key={row.class_year} className="hover:bg-surface-raised/50 transition-colors">
                    <td className="py-2 px-3 font-semibold text-text-primary">Class {row.class_year}</td>
                    {COLS.map((col) => (
                      <td key={col.field} className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step={col.field === 'fee_due_day_of_month' ? '1' : '0.01'}
                          value={getCellValue(row.class_year, col.field)}
                          onChange={(e) => setCellValue(row.class_year, col.field, parseFloat(e.target.value) || 0)}
                          className="w-20 text-right border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 bg-white"
                          aria-label={`${col.label} for Class ${row.class_year}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateStructure.isPending || Object.keys(edited).length === 0}
            size="sm"
          >
            {updateStructure.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Main Modal ────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
}

export function FeeSettingsModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fee Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="structure" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="structure" className="flex-1">Fee Structure</TabsTrigger>
            <TabsTrigger value="concessions" className="flex-1">Concession Rules</TabsTrigger>
            <TabsTrigger value="custom-heads" className="flex-1">Custom Fee Heads</TabsTrigger>
          </TabsList>

          <TabsContent value="structure" className="mt-4">
            <FeeStructureTab />
          </TabsContent>

          <TabsContent value="concessions" className="mt-4">
            <ConcessionRulesTab />
          </TabsContent>

          <TabsContent value="custom-heads" className="mt-4">
            <CustomFeeHeadsTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
