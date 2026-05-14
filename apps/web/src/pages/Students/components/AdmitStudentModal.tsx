import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { z } from 'zod'
import { CheckCircle2, Loader2, Eye, EyeOff, Printer, UserPlus, ChevronRight } from 'lucide-react'
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
import { useAdmitStudent } from '@/hooks/useStudents'
import type { StudentDetail } from '@/types/common'
import { cn } from '@/lib/utils'

// ─── Zod schemas per step ─────────────────────────────────────────────────

const Step1Schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter date in YYYY-MM-DD format'),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  blood_group: z.string().optional(),
  caste_category: z.enum(['GENERAL', 'OBC', 'SC_ST', 'EWS', 'FREE']).optional(),
  aadhaar: z
    .string()
    .refine((v) => v === '' || /^\d{12}$/.test(v), 'Enter 12-digit Aadhaar or leave blank')
    .optional(),
})

const Step2Schema = z.object({
  class_year: z.number({ required_error: 'Select a class' }).int().min(1).max(10),
  section: z.string().regex(/^[A-F]$/, 'Select a section'),
  medium: z.enum(['ENGLISH', 'TELUGU'], { required_error: 'Select medium' }),
  board: z.string().optional(),
  smartpad_id: z.string().optional(),
})

const Step3Schema = z.object({
  father_name: z.string().min(2, "Father's name is required"),
  father_mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit mobile number'),
  mother_name: z.string().optional(),
  mother_mobile: z
    .string()
    .refine(
      (v) => v === '' || /^[6-9]\d{9}$/.test(v),
      'Enter valid 10-digit mobile or leave blank',
    )
    .optional(),
})

// ─── Types ────────────────────────────────────────────────────────────────

type Step1Data = z.infer<typeof Step1Schema>
type Step2Data = z.infer<typeof Step2Schema>
type Step3Data = z.infer<typeof Step3Schema>

// ─── SHA-256 Aadhaar hash ─────────────────────────────────────────────────

async function hashAadhaar(aadhaar: string): Promise<string> {
  const buffer = new TextEncoder().encode(aadhaar)
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── Step indicator ───────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { num: 1, label: 'Student Details' },
    { num: 2, label: 'Academic' },
    { num: 3, label: 'Parents' },
  ]
  return (
    <div className="flex items-center justify-center gap-4 mb-6">
      {steps.map((step, i) => {
        const done = step.num < current
        const active = step.num === current
        return (
          <div key={step.num} className="flex items-center gap-2">
            <div
              className={cn(
                'w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-semibold transition-colors',
                done && 'bg-primary border-primary text-white',
                active && 'border-primary text-primary',
                !done && !active && 'border-slate-300 text-slate-400',
              )}
              aria-current={active ? 'step' : undefined}
            >
              {done ? '✓' : step.num}
            </div>
            <span
              className={cn(
                'text-xs font-medium hidden sm:block',
                active ? 'text-primary' : 'text-slate-400',
              )}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <ChevronRight className="h-3 w-3 text-slate-300 ml-1" aria-hidden="true" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Field error display ──────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-danger" role="alert">{message}</p>
}

// ─── Print NeuraID card ───────────────────────────────────────────────────

function printNeuraIdCard(student: StudentDetail) {
  const printDiv = document.createElement('div')
  printDiv.id = 'neura-print-card'
  printDiv.innerHTML = `
    <style>
      @media print {
        body > *:not(#neura-print-card) { display: none !important; }
        #neura-print-card { display: block !important; font-family: Inter, sans-serif; padding: 40px; }
      }
      #neura-print-card { display: none; }
      .card { border: 2px solid #1E40AF; border-radius: 12px; padding: 24px; max-width: 320px; margin: 0 auto; }
      .label { font-size: 10px; color: #64748B; text-transform: uppercase; letter-spacing: 0.1em; }
      .nid { font-size: 28px; font-weight: 800; color: #1E40AF; font-family: monospace; letter-spacing: 0.1em; }
      .name { font-size: 18px; font-weight: 600; color: #0F172A; margin-top: 8px; }
      .meta { font-size: 12px; color: #475569; margin-top: 4px; }
      .date { font-size: 11px; color: #94A3B8; margin-top: 12px; }
    </style>
    <div class="card">
      <div class="label">NeuraLife Student ID</div>
      <div class="nid">${student.neura_id}</div>
      <div class="name">${student.full_name}</div>
      ${student.yearly_progress ? `<div class="meta">Class ${student.yearly_progress.class_year}-${student.yearly_progress.section} · ${student.yearly_progress.medium}</div>` : ''}
      <div class="date">Issued: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
    </div>
  `
  document.body.appendChild(printDiv)
  window.print()
  document.body.removeChild(printDiv)
}

// ─── Props ────────────────────────────────────────────────────────────────

interface AdmitStudentModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (result: StudentDetail) => void
}

// ─── Component ────────────────────────────────────────────────────────────

export default function AdmitStudentModal({ open, onClose, onSuccess }: AdmitStudentModalProps) {
  const navigate = useNavigate()
  const { mutateAsync: admitStudent, isPending } = useAdmitStudent()

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successData, setSuccessData] = useState<StudentDetail | null>(null)
  const [showAadhaar, setShowAadhaar] = useState(false)

  // Idempotency key — generated once when modal opens
  const idempotencyKey = useRef<string>(crypto.randomUUID())

  // Step 1 state
  const [s1, setS1] = useState<Step1Data>({ full_name: '', date_of_birth: '' })
  // Step 2 state
  const [s2, setS2] = useState<Partial<Step2Data>>({})
  // Step 3 state
  const [s3, setS3] = useState<Partial<Step3Data>>({})

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1)
      setErrors({})
      setSuccessData(null)
      setS1({ full_name: '', date_of_birth: '' })
      setS2({})
      setS3({})
      idempotencyKey.current = crypto.randomUUID()
    }
  }, [open])

  function validateStep1() {
    const result = Step1Schema.safeParse(s1)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((e) => {
        if (e.path[0]) fieldErrors[String(e.path[0])] = e.message
      })
      setErrors(fieldErrors)
      return false
    }
    setErrors({})
    return true
  }

  function validateStep2() {
    const result = Step2Schema.safeParse(s2)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((e) => {
        if (e.path[0]) fieldErrors[String(e.path[0])] = e.message
      })
      setErrors(fieldErrors)
      return false
    }
    setErrors({})
    return true
  }

  function validateStep3() {
    const result = Step3Schema.safeParse(s3)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((e) => {
        if (e.path[0]) fieldErrors[String(e.path[0])] = e.message
      })
      setErrors(fieldErrors)
      return false
    }
    setErrors({})
    return true
  }

  async function handleSubmit() {
    if (!validateStep3()) return

    const aadhaarHash = s1.aadhaar ? await hashAadhaar(s1.aadhaar) : undefined

    const parents = []
    if (s3.father_name && s3.father_mobile) {
      parents.push({
        parent_name: s3.father_name,
        relationship: 'FATHER' as const,
        mobile: `+91${s3.father_mobile}`,
        is_primary: true,
      })
    }
    if (s3.mother_name && s3.mother_mobile) {
      parents.push({
        parent_name: s3.mother_name,
        relationship: 'MOTHER' as const,
        mobile: `+91${s3.mother_mobile}`,
        is_primary: false,
      })
    }

    try {
      const result = await admitStudent({
        body: {
          full_name: s1.full_name,
          date_of_birth: s1.date_of_birth,
          gender: s1.gender,
          blood_group: s1.blood_group,
          caste_category: s1.caste_category,
          aadhaar_hash: aadhaarHash,
          class_year: s2.class_year!,
          section: s2.section!,
          medium: s2.medium!,
          board: s2.board,
          parents,
        },
        idempotencyKey: idempotencyKey.current,
      })
      setSuccessData(result)
      setStep(4)
      onSuccess(result)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to admit student. Please try again.'
      setErrors({ submit: message })
    }
  }

  function handleAdmitAnother() {
    setStep(1)
    setErrors({})
    setSuccessData(null)
    setS1({ full_name: '', date_of_birth: '' })
    setS2({})
    setS3({})
    idempotencyKey.current = crypto.randomUUID()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
            Admit New Student
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 4 && successData ? (
            // ─── Success Screen ────────────────────────────────────────────
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }}
              className="py-4 text-center space-y-4"
            >
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
                </div>
              </div>

              <h2 className="text-xl font-bold text-slate-900">Student Admitted!</h2>

              <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-6 text-center my-4">
                <p className="text-xs font-medium text-primary uppercase tracking-widest mb-1">
                  NeuraID
                </p>
                <p className="text-4xl font-bold text-primary font-mono tracking-wider">
                  {successData.neura_id}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  This is the student's permanent learning identity number
                </p>
              </div>

              <div className="flex gap-3 justify-center flex-wrap">
                <Button
                  onClick={() => navigate(`/students/${successData.neura_id}`)}
                  className="bg-primary hover:bg-primary/90"
                >
                  View Profile
                </Button>
                <Button
                  variant="outline"
                  onClick={() => printNeuraIdCard(successData)}
                >
                  <Printer className="h-4 w-4 mr-2" aria-hidden="true" />
                  Print NeuraID Card
                </Button>
              </div>

              <button
                onClick={handleAdmitAnother}
                className="text-sm text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
              >
                Admit Another Student
              </button>
            </motion.div>
          ) : (
            <motion.div key={`step-${step}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
              {step !== 4 && <StepIndicator current={step as 1 | 2 | 3} />}

              {/* ─── Step 1 ───────────────────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={s1.full_name}
                        onChange={(e) => setS1((p) => ({ ...p, full_name: e.target.value }))}
                        placeholder="e.g. Arjun Reddy"
                        className={cn(errors.full_name && 'border-danger')}
                        autoFocus
                      />
                      <FieldError message={errors.full_name} />
                    </div>

                    <div>
                      <Label htmlFor="date_of_birth">Date of Birth *</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={s1.date_of_birth}
                        onChange={(e) => setS1((p) => ({ ...p, date_of_birth: e.target.value }))}
                        className={cn(errors.date_of_birth && 'border-danger')}
                      />
                      <FieldError message={errors.date_of_birth} />
                    </div>

                    <div>
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={s1.gender ?? ''}
                        onValueChange={(v) => setS1((p) => ({ ...p, gender: v as 'Male' | 'Female' | 'Other' || undefined }))}
                      >
                        <SelectTrigger id="gender">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="blood_group">Blood Group</Label>
                      <Select
                        value={s1.blood_group ?? ''}
                        onValueChange={(v) => setS1((p) => ({ ...p, blood_group: v || undefined }))}
                      >
                        <SelectTrigger id="blood_group">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                            <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="caste_category">Caste Category</Label>
                      <Select
                        value={s1.caste_category ?? ''}
                        onValueChange={(v) => setS1((p) => ({ ...p, caste_category: (v || undefined) as typeof s1.caste_category }))}
                      >
                        <SelectTrigger id="caste_category">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GENERAL">General</SelectItem>
                          <SelectItem value="OBC">OBC</SelectItem>
                          <SelectItem value="SC_ST">SC/ST</SelectItem>
                          <SelectItem value="EWS">EWS</SelectItem>
                          <SelectItem value="FREE">Free</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="aadhaar">Aadhaar Number (optional)</Label>
                      <div className="relative">
                        <Input
                          id="aadhaar"
                          type={showAadhaar ? 'text' : 'password'}
                          value={s1.aadhaar ?? ''}
                          onChange={(e) => setS1((p) => ({ ...p, aadhaar: e.target.value }))}
                          placeholder="XXXXXXXXXXXX"
                          maxLength={12}
                          className={cn('pr-10', errors.aadhaar && 'border-danger')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAadhaar((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          aria-label={showAadhaar ? 'Hide Aadhaar' : 'Show Aadhaar'}
                        >
                          {showAadhaar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        🔒 Hashed locally — never sent to servers
                      </p>
                      <FieldError message={errors.aadhaar} />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={() => { if (validateStep1()) setStep(2) }}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── Step 2 ───────────────────────────────────────────── */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="class_year">Class Year *</Label>
                      <Select
                        value={s2.class_year !== undefined ? String(s2.class_year) : ''}
                        onValueChange={(v) => setS2((p) => ({ ...p, class_year: Number(v) }))}
                      >
                        <SelectTrigger id="class_year" className={cn(errors.class_year && 'border-danger')}>
                          <SelectValue placeholder="Select class…" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((c) => (
                            <SelectItem key={c} value={String(c)}>Class {c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError message={errors.class_year} />
                    </div>

                    <div>
                      <Label htmlFor="section">Section *</Label>
                      <Select
                        value={s2.section ?? ''}
                        onValueChange={(v) => setS2((p) => ({ ...p, section: v }))}
                      >
                        <SelectTrigger id="section" className={cn(errors.section && 'border-danger')}>
                          <SelectValue placeholder="Select section…" />
                        </SelectTrigger>
                        <SelectContent>
                          {['A', 'B', 'C', 'D', 'E', 'F'].map((s) => (
                            <SelectItem key={s} value={s}>Section {s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError message={errors.section} />
                    </div>

                    <div>
                      <Label htmlFor="medium">Medium *</Label>
                      <Select
                        value={s2.medium ?? ''}
                        onValueChange={(v) => setS2((p) => ({ ...p, medium: v as 'ENGLISH' | 'TELUGU' }))}
                      >
                        <SelectTrigger id="medium" className={cn(errors.medium && 'border-danger')}>
                          <SelectValue placeholder="Select medium…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ENGLISH">English</SelectItem>
                          <SelectItem value="TELUGU">Telugu</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError message={errors.medium} />
                    </div>

                    <div>
                      <Label htmlFor="board">Board</Label>
                      <Select
                        value={s2.board ?? ''}
                        onValueChange={(v) => setS2((p) => ({ ...p, board: v || undefined }))}
                      >
                        <SelectTrigger id="board">
                          <SelectValue placeholder="Select board…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SCERT AP">SCERT AP</SelectItem>
                          <SelectItem value="SCERT TS">SCERT TS</SelectItem>
                          <SelectItem value="CBSE">CBSE</SelectItem>
                          <SelectItem value="ICSE">ICSE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <Label htmlFor="smartpad_id">SmartPad ID (optional)</Label>
                      <Input
                        id="smartpad_id"
                        value={s2.smartpad_id ?? ''}
                        onChange={(e) => setS2((p) => ({ ...p, smartpad_id: e.target.value || undefined }))}
                        placeholder="e.g. PAD-0042 (assign later if unknown)"
                      />
                      <p className="mt-1 text-xs text-slate-500">Leave blank to assign later</p>
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
                    <Button
                      onClick={() => { if (validateStep2()) setStep(3) }}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── Step 3 ───────────────────────────────────────────── */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700">Father</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="father_name">Father's Full Name *</Label>
                        <Input
                          id="father_name"
                          value={s3.father_name ?? ''}
                          onChange={(e) => setS3((p) => ({ ...p, father_name: e.target.value }))}
                          placeholder="e.g. Rajesh Reddy"
                          className={cn(errors.father_name && 'border-danger')}
                        />
                        <FieldError message={errors.father_name} />
                      </div>
                      <div>
                        <Label htmlFor="father_mobile">Father's Mobile *</Label>
                        <div className="flex">
                          <span className="flex items-center px-3 bg-slate-50 border border-r-0 border-border rounded-l-md text-sm text-slate-500">
                            +91
                          </span>
                          <Input
                            id="father_mobile"
                            value={s3.father_mobile ?? ''}
                            onChange={(e) => setS3((p) => ({ ...p, father_mobile: e.target.value.replace(/\D/g, '') }))}
                            placeholder="9876543210"
                            maxLength={10}
                            className={cn('rounded-l-none', errors.father_mobile && 'border-danger')}
                          />
                        </div>
                        <FieldError message={errors.father_mobile} />
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-700 pt-2">Mother (optional)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="mother_name">Mother's Full Name</Label>
                        <Input
                          id="mother_name"
                          value={s3.mother_name ?? ''}
                          onChange={(e) => setS3((p) => ({ ...p, mother_name: e.target.value || undefined }))}
                          placeholder="e.g. Sunita Reddy"
                        />
                      </div>
                      <div>
                        <Label htmlFor="mother_mobile">Mother's Mobile</Label>
                        <div className="flex">
                          <span className="flex items-center px-3 bg-slate-50 border border-r-0 border-border rounded-l-md text-sm text-slate-500">
                            +91
                          </span>
                          <Input
                            id="mother_mobile"
                            value={s3.mother_mobile ?? ''}
                            onChange={(e) => setS3((p) => ({ ...p, mother_mobile: e.target.value.replace(/\D/g, '') || undefined }))}
                            placeholder="9876543211"
                            maxLength={10}
                            className={cn('rounded-l-none', errors.mother_mobile && 'border-danger')}
                          />
                        </div>
                        <FieldError message={errors.mother_mobile} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm text-primary">
                    ℹ️ Both mobile numbers will become login credentials for the Parent App
                  </div>

                  {errors.submit && (
                    <div className="rounded-lg bg-danger/10 border border-danger/20 p-3 text-sm text-danger">
                      {errors.submit}
                    </div>
                  )}

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep(2)} disabled={isPending}>
                      ← Back
                    </Button>
                    <Button
                      onClick={() => void handleSubmit()}
                      disabled={isPending}
                      className="bg-primary hover:bg-primary/90 min-w-[120px]"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                          Admitting…
                        </>
                      ) : (
                        'Submit →'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
