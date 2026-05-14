import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { z } from 'zod'
import { CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateTeacher } from '@/hooks/useTeachers'
import type { CreateTeacherInput } from '@/types/common'
import { cn } from '@/lib/utils'

// ─── SHA-256 Aadhaar hash ─────────────────────────────────────────────────

async function hashAadhaar(aadhaar: string): Promise<string> {
  const buffer = new TextEncoder().encode(aadhaar)
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── Step schemas ─────────────────────────────────────────────────────────

const Step1Schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  mobile: z.string().regex(/^\+91[6-9]\d{9}$/, 'Format: +91XXXXXXXXXX'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format').optional().or(z.literal('')),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  teaching_qualification: z.enum(['B.Ed', 'D.Ed', 'M.Ed', 'None']).optional(),
  pan_number: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format')
    .optional()
    .or(z.literal('')),
  aadhaar: z
    .string()
    .refine((v) => v === '' || /^\d{12}$/.test(v), 'Enter 12-digit Aadhaar or leave blank')
    .optional(),
})

const Step2Schema = z.object({
  designation: z.enum(['PRINCIPAL', 'VP', 'HM', 'PGT', 'TGT', 'PRT', 'PT', 'ADMIN', 'SUPPORT'], {
    required_error: 'Select a designation',
  }),
  employment_type: z.enum(['REGULAR', 'CONTRACT', 'PART_TIME', 'VISITING']),
  joining_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  employee_id: z.string().optional(),
  subject_assignments: z
    .array(
      z.object({
        class_year: z.number().int().min(1).max(10),
        section: z.string().regex(/^[A-F]$/),
        subject: z.string().min(1),
        is_class_teacher: z.boolean(),
      }),
    )
    .max(10),
})

const Step3Schema = z.object({
  basic: z.number({ required_error: 'Basic salary is required' }).positive('Must be positive'),
  hra_type: z.enum(['PERCENT', 'FIXED']),
  hra_value: z.number().min(0),
  da_type: z.enum(['PERCENT', 'FIXED']),
  da_value: z.number().min(0),
  transport_allowance: z.number().min(0),
  special_allowance: z.number().min(0),
  pf_applicable: z.boolean(),
  esi_applicable: z.boolean(),
  pt_applicable: z.boolean(),
  bank_account_number: z.string().optional(),
  ifsc_code: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC')
    .optional()
    .or(z.literal('')),
  bank_name: z.string().optional(),
  account_holder_name: z.string().optional(),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

type Step1Data = z.infer<typeof Step1Schema>
type Step2Data = z.infer<typeof Step2Schema>
type Step3Data = z.infer<typeof Step3Schema>

interface SubjectRow {
  id: string
  class_year: number | ''
  section: string
  subject: string
  is_class_teacher: boolean
}

function computeGross(s: Partial<Step3Data>): number {
  const basic = s.basic ?? 0
  const hra =
    s.hra_type === 'PERCENT'
      ? (basic * (s.hra_value ?? 0)) / 100
      : (s.hra_value ?? 0)
  const da =
    s.da_type === 'PERCENT'
      ? (basic * (s.da_value ?? 0)) / 100
      : (s.da_value ?? 0)
  return basic + hra + da + (s.transport_allowance ?? 0) + (s.special_allowance ?? 0)
}

// ─── Step Indicator ───────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={cn(
              'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
              i + 1 < current
                ? 'bg-primary text-white'
                : i + 1 === current
                  ? 'bg-primary text-white ring-2 ring-primary/30'
                  : 'bg-slate-100 text-slate-400',
            )}
          >
            {i + 1 < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={cn(
                'h-0.5 w-8 transition-colors',
                i + 1 < current ? 'bg-primary' : 'bg-slate-200',
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
}

export default function AddTeacherModal({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { mutateAsync: createTeacher, isPending } = useCreateTeacher()

  const [step, setStep] = useState(1)
  const [step1, setStep1] = useState<Partial<Step1Data>>({ mobile: '+91' })
  const [step2, setStep2] = useState<Partial<Step2Data>>({
    employment_type: 'REGULAR',
    subject_assignments: [],
  })
  const [step3, setStep3] = useState<Partial<Step3Data>>({
    hra_type: 'PERCENT',
    da_type: 'PERCENT',
    hra_value: 20,
    da_value: 10,
    transport_allowance: 0,
    special_allowance: 0,
    pf_applicable: false,
    esi_applicable: false,
    pt_applicable: true,
    effective_from: new Date().toISOString().split('T')[0],
  })
  const [subjectRows, setSubjectRows] = useState<SubjectRow[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successTeacherId, setSuccessTeacherId] = useState<string | null>(null)
  const [successName, setSuccessName] = useState('')
  const [showBankDetails, setShowBankDetails] = useState(false)

  const gross = useMemo(() => computeGross(step3), [step3])

  function reset() {
    setStep(1)
    setStep1({ mobile: '+91' })
    setStep2({ employment_type: 'REGULAR', subject_assignments: [] })
    setStep3({
      hra_type: 'PERCENT',
      da_type: 'PERCENT',
      hra_value: 20,
      da_value: 10,
      transport_allowance: 0,
      special_allowance: 0,
      pf_applicable: false,
      esi_applicable: false,
      pt_applicable: true,
      effective_from: new Date().toISOString().split('T')[0],
    })
    setSubjectRows([])
    setErrors({})
    setSuccessTeacherId(null)
    setShowBankDetails(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  // ─── Step 1 next ─────────────────────────────────────────────────────

  function handleStep1Next() {
    const result = Step1Schema.safeParse(step1)
    if (!result.success) {
      const errs: Record<string, string> = {}
      result.error.errors.forEach((e) => {
        if (e.path[0]) errs[String(e.path[0])] = e.message
      })
      setErrors(errs)
      return
    }
    setErrors({})
    setStep(2)
  }

  // ─── Step 2 next ─────────────────────────────────────────────────────

  function handleStep2Next() {
    const assignments = subjectRows
      .filter((r) => r.class_year !== '' && r.section && r.subject)
      .map((r) => ({
        class_year: r.class_year as number,
        section: r.section,
        subject: r.subject,
        is_class_teacher: r.is_class_teacher,
      }))

    const toValidate = { ...step2, subject_assignments: assignments }
    const result = Step2Schema.safeParse(toValidate)
    if (!result.success) {
      const errs: Record<string, string> = {}
      result.error.errors.forEach((e) => {
        if (e.path[0]) errs[String(e.path[0])] = e.message
      })
      setErrors(errs)
      return
    }
    setErrors({})
    setStep2({ ...result.data })
    setStep(3)
  }

  // ─── Submit ───────────────────────────────────────────────────────────

  async function handleSubmit() {
    const salaryResult = Step3Schema.safeParse(step3)
    if (!salaryResult.success) {
      const errs: Record<string, string> = {}
      salaryResult.error.errors.forEach((e) => {
        if (e.path[0]) errs[String(e.path[0])] = e.message
      })
      setErrors(errs)
      return
    }
    setErrors({})

    try {
      let aadhaar_hash: string | undefined
      if (step1.aadhaar && /^\d{12}$/.test(step1.aadhaar)) {
        aadhaar_hash = await hashAadhaar(step1.aadhaar)
      }

      const body: CreateTeacherInput = {
        full_name: step1.full_name!,
        mobile: step1.mobile!,
        email: step1.email || undefined,
        date_of_birth: step1.date_of_birth || undefined,
        gender: step1.gender,
        pan_number: step1.pan_number || undefined,
        aadhaar_hash,
        teaching_qualification: step1.teaching_qualification,
        designation: step2.designation!,
        employment_type: step2.employment_type!,
        joining_date: step2.joining_date!,
        employee_id: step2.employee_id || undefined,
        subject_assignments: step2.subject_assignments ?? [],
      }

      const result = await createTeacher(body)
      setSuccessTeacherId(result.teacher_id)
      setSuccessName(step1.full_name ?? '')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add teacher'
      setErrors({ submit: msg })
    }
  }

  // ─── Subject rows helpers ─────────────────────────────────────────────

  function addSubjectRow() {
    setSubjectRows((rows) => [
      ...rows,
      { id: crypto.randomUUID(), class_year: '', section: '', subject: '', is_class_teacher: false },
    ])
  }

  function removeSubjectRow(id: string) {
    setSubjectRows((rows) => rows.filter((r) => r.id !== id))
  }

  function updateSubjectRow(id: string, field: keyof SubjectRow, value: unknown) {
    setSubjectRows((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Teacher</DialogTitle>
        </DialogHeader>

        {/* Success */}
        {successTeacherId ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6 space-y-4"
          >
            <CheckCircle2 className="h-16 w-16 text-success mx-auto" aria-hidden="true" />
            <div>
              <h3 className="text-xl font-bold text-slate-900">{successName}</h3>
              <p className="text-sm text-slate-500 mt-1">Added successfully</p>
              {(step2.subject_assignments ?? []).filter((s) => s.is_class_teacher).length > 0 && (
                <p className="text-sm text-secondary mt-2">
                  Class teacher assigned:{' '}
                  {(step2.subject_assignments ?? [])
                    .filter((s) => s.is_class_teacher)
                    .map((s) => `${s.class_year}-${s.section}`)
                    .join(', ')}
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  handleClose()
                  navigate(`/teachers/${successTeacherId}`)
                }}
              >
                View Profile
              </Button>
            </div>
          </motion.div>
        ) : (
          <>
            <StepIndicator current={step} total={3} />

            <AnimatePresence mode="wait">
              {/* STEP 1 — Personal Info */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="font-semibold text-slate-800">Personal Information</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={step1.full_name ?? ''}
                        onChange={(e) => setStep1((s) => ({ ...s, full_name: e.target.value }))}
                        placeholder="K. Suresh Kumar"
                        aria-describedby={errors.full_name ? 'full_name_err' : undefined}
                      />
                      {errors.full_name && <p id="full_name_err" className="text-xs text-danger">{errors.full_name}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="mobile">Mobile (+91) *</Label>
                      <Input
                        id="mobile"
                        value={step1.mobile ?? '+91'}
                        onChange={(e) => setStep1((s) => ({ ...s, mobile: e.target.value }))}
                        placeholder="+919876543210"
                      />
                      {errors.mobile && <p className="text-xs text-danger">{errors.mobile}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={step1.email ?? ''}
                        onChange={(e) => setStep1((s) => ({ ...s, email: e.target.value }))}
                        placeholder="teacher@school.edu"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        value={step1.date_of_birth ?? ''}
                        onChange={(e) => setStep1((s) => ({ ...s, date_of_birth: e.target.value }))}
                        placeholder="1985-04-10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Gender</Label>
                      <Select
                        value={step1.gender ?? ''}
                        onValueChange={(v) => setStep1((s) => ({ ...s, gender: v as Step1Data['gender'] }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Teaching Qualification</Label>
                      <Select
                        value={step1.teaching_qualification ?? ''}
                        onValueChange={(v) =>
                          setStep1((s) => ({ ...s, teaching_qualification: v as Step1Data['teaching_qualification'] }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {['B.Ed', 'D.Ed', 'M.Ed', 'None'].map((q) => (
                            <SelectItem key={q} value={q}>{q}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="pan">PAN Number</Label>
                      <Input
                        id="pan"
                        value={step1.pan_number ?? ''}
                        onChange={(e) =>
                          setStep1((s) => ({ ...s, pan_number: e.target.value.toUpperCase() }))
                        }
                        placeholder="ABCDE1234F"
                        className="uppercase"
                      />
                      <p className="text-xs text-text-muted">Used for payslip TDS calculation</p>
                      {errors.pan_number && <p className="text-xs text-danger">{errors.pan_number}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="aadhaar">Aadhaar (optional)</Label>
                      <Input
                        id="aadhaar"
                        value={step1.aadhaar ?? ''}
                        onChange={(e) => setStep1((s) => ({ ...s, aadhaar: e.target.value }))}
                        placeholder="12-digit Aadhaar"
                        maxLength={12}
                      />
                      <p className="text-xs text-text-muted">🔒 Hashed locally — never stored as plain text</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button className="bg-primary hover:bg-primary/90" onClick={handleStep1Next}>
                      Next: Assignment →
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2 — School Assignment + Subjects */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="font-semibold text-slate-800">School Assignment</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Designation *</Label>
                      <Select
                        value={step2.designation ?? ''}
                        onValueChange={(v) =>
                          setStep2((s) => ({ ...s, designation: v as Step2Data['designation'] }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {['PGT', 'TGT', 'PRT', 'PT', 'HM', 'VP', 'ADMIN', 'SUPPORT'].map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.designation && <p className="text-xs text-danger">{errors.designation}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label>Employment Type *</Label>
                      <Select
                        value={step2.employment_type ?? 'REGULAR'}
                        onValueChange={(v) =>
                          setStep2((s) => ({ ...s, employment_type: v as Step2Data['employment_type'] }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REGULAR">Regular</SelectItem>
                          <SelectItem value="CONTRACT">Contract</SelectItem>
                          <SelectItem value="PART_TIME">Part-time</SelectItem>
                          <SelectItem value="VISITING">Visiting</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="joining_date">Joining Date *</Label>
                      <Input
                        id="joining_date"
                        value={step2.joining_date ?? ''}
                        onChange={(e) => setStep2((s) => ({ ...s, joining_date: e.target.value }))}
                        placeholder="2026-06-01"
                      />
                      {errors.joining_date && <p className="text-xs text-danger">{errors.joining_date}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="employee_id">Employee ID</Label>
                      <Input
                        id="employee_id"
                        value={step2.employee_id ?? ''}
                        onChange={(e) => setStep2((s) => ({ ...s, employee_id: e.target.value }))}
                        placeholder="EMP-001 (optional)"
                      />
                    </div>
                  </div>

                  {/* Subject Assignments */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Subject Assignments</Label>
                      {subjectRows.length < 10 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={addSubjectRow}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add Row
                        </Button>
                      )}
                    </div>

                    {subjectRows.length === 0 && (
                      <p className="text-xs text-text-muted">
                        No subjects yet — can be added later.{' '}
                        <button className="text-primary underline" onClick={addSubjectRow}>
                          Add now
                        </button>
                      </p>
                    )}

                    {subjectRows.map((row) => (
                      <div key={row.id} className="flex items-center gap-2">
                        <Input
                          className="w-16 text-center"
                          placeholder="Cls"
                          type="number"
                          min={1}
                          max={10}
                          value={row.class_year === '' ? '' : row.class_year}
                          onChange={(e) =>
                            updateSubjectRow(row.id, 'class_year', e.target.value === '' ? '' : Number(e.target.value))
                          }
                        />
                        <Select
                          value={row.section}
                          onValueChange={(v) => updateSubjectRow(row.id, 'section', v)}
                        >
                          <SelectTrigger className="w-16">
                            <SelectValue placeholder="Sec" />
                          </SelectTrigger>
                          <SelectContent>
                            {['A', 'B', 'C', 'D', 'E', 'F'].map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          className="flex-1"
                          placeholder="Subject"
                          value={row.subject}
                          onChange={(e) => updateSubjectRow(row.id, 'subject', e.target.value)}
                        />
                        <label className="flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.is_class_teacher}
                            onChange={(e) => updateSubjectRow(row.id, 'is_class_teacher', e.target.checked)}
                            className="accent-secondary"
                          />
                          Class Teacher
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-danger hover:text-danger/80"
                          onClick={() => removeSubjectRow(row.id)}
                          aria-label="Remove row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}

                    {subjectRows.some((r) => r.is_class_teacher) && (
                      <p className="text-xs text-warning">
                        Verify no other teacher is already class teacher for the selected class. Backend validates definitively.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
                    <Button className="bg-primary hover:bg-primary/90" onClick={handleStep2Next}>
                      Next: Salary →
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3 — Salary Structure */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="font-semibold text-slate-800">Salary Structure</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="basic">Basic Salary (₹) *</Label>
                      <Input
                        id="basic"
                        type="number"
                        min={0}
                        value={step3.basic ?? ''}
                        onChange={(e) =>
                          setStep3((s) => ({ ...s, basic: e.target.value === '' ? undefined : Number(e.target.value) }))
                        }
                        placeholder="25000"
                      />
                      {errors.basic && <p className="text-xs text-danger">{errors.basic}</p>}
                    </div>

                    {/* HRA */}
                    <div className="space-y-1.5">
                      <Label>HRA Type</Label>
                      <Select
                        value={step3.hra_type ?? 'PERCENT'}
                        onValueChange={(v) => setStep3((s) => ({ ...s, hra_type: v as 'PERCENT' | 'FIXED' }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENT">% of Basic</SelectItem>
                          <SelectItem value="FIXED">Fixed ₹</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>HRA Value</Label>
                      <Input
                        type="number"
                        min={0}
                        value={step3.hra_value ?? ''}
                        onChange={(e) => setStep3((s) => ({ ...s, hra_value: Number(e.target.value) }))}
                      />
                    </div>

                    {/* DA */}
                    <div className="space-y-1.5">
                      <Label>DA Type</Label>
                      <Select
                        value={step3.da_type ?? 'PERCENT'}
                        onValueChange={(v) => setStep3((s) => ({ ...s, da_type: v as 'PERCENT' | 'FIXED' }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENT">% of Basic</SelectItem>
                          <SelectItem value="FIXED">Fixed ₹</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>DA Value</Label>
                      <Input
                        type="number"
                        min={0}
                        value={step3.da_value ?? ''}
                        onChange={(e) => setStep3((s) => ({ ...s, da_value: Number(e.target.value) }))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Transport Allowance (₹)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={step3.transport_allowance ?? 0}
                        onChange={(e) => setStep3((s) => ({ ...s, transport_allowance: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Special Allowance (₹)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={step3.special_allowance ?? 0}
                        onChange={(e) => setStep3((s) => ({ ...s, special_allowance: Number(e.target.value) }))}
                      />
                    </div>
                  </div>

                  {/* Gross preview */}
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <p className="text-sm text-text-secondary">Estimated Gross Monthly</p>
                    <p className="text-2xl font-bold text-primary">
                      ₹{gross.toLocaleString('en-IN')}
                    </p>
                  </div>

                  {/* Deductions */}
                  <div className="space-y-2">
                    <Label>Deductions</Label>
                    <div className="flex flex-wrap gap-4">
                      {[
                        { key: 'pf_applicable', label: 'PF' },
                        { key: 'esi_applicable', label: 'ESI' },
                        { key: 'pt_applicable', label: 'PT (₹200/mo — AP/TS)' },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!step3[key as keyof Step3Data]}
                            onChange={(e) => setStep3((s) => ({ ...s, [key]: e.target.checked }))}
                            className="accent-primary"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="effective_from">Effective From *</Label>
                    <Input
                      id="effective_from"
                      value={step3.effective_from ?? ''}
                      onChange={(e) => setStep3((s) => ({ ...s, effective_from: e.target.value }))}
                    />
                  </div>

                  {/* Bank Details (collapsible) */}
                  <div>
                    <button
                      type="button"
                      className="text-sm text-primary underline"
                      onClick={() => setShowBankDetails((v) => !v)}
                    >
                      {showBankDetails ? 'Hide' : 'Add'} bank details (optional — needed for payslip)
                    </button>
                    {showBankDetails && (
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="col-span-2 space-y-1.5">
                          <Label>Account Number</Label>
                          <Input
                            value={step3.bank_account_number ?? ''}
                            onChange={(e) => setStep3((s) => ({ ...s, bank_account_number: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>IFSC Code</Label>
                          <Input
                            value={step3.ifsc_code ?? ''}
                            onChange={(e) =>
                              setStep3((s) => ({ ...s, ifsc_code: e.target.value.toUpperCase() }))
                            }
                            placeholder="SBIN0001234"
                            className="uppercase"
                          />
                          {errors.ifsc_code && <p className="text-xs text-danger">{errors.ifsc_code}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label>Bank Name</Label>
                          <Input
                            value={step3.bank_name ?? ''}
                            onChange={(e) => setStep3((s) => ({ ...s, bank_name: e.target.value }))}
                          />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <Label>Account Holder Name</Label>
                          <Input
                            value={step3.account_holder_name ?? ''}
                            onChange={(e) =>
                              setStep3((s) => ({ ...s, account_holder_name: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {errors.submit && (
                    <p className="text-sm text-danger bg-danger/10 rounded-lg p-3">{errors.submit}</p>
                  )}

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
                    <Button
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => void handleSubmit()}
                      disabled={isPending}
                    >
                      {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
                      Add Teacher
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
