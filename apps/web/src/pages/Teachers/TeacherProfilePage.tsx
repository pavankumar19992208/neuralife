import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  BookOpen,
  User,
  CalendarDays,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { slideUp } from '@/lib/animations'
import PageLayout from '@/components/layout/PageLayout'
import PageHeader from '@/components/layout/PageHeader'
import { useTeacherProfile, useTeacherLeave, useLeaveAction, useSetSalary } from '@/hooks/useTeachers'
import { useAuthStore } from '@/store/authStore'
import { UserRole } from '@/types/common'
import type { CreateSalaryInput } from '@/types/common'

// ─── Salary Form ──────────────────────────────────────────────────────────

function computeGross(s: Partial<CreateSalaryInput>): number {
  const basic = s.basic ?? 0
  const hra = s.hra_type === 'PERCENT' ? (basic * (s.hra_value ?? 0)) / 100 : (s.hra_value ?? 0)
  const da = s.da_type === 'PERCENT' ? (basic * (s.da_value ?? 0)) / 100 : (s.da_value ?? 0)
  return basic + hra + da + (s.transport_allowance ?? 0) + (s.special_allowance ?? 0)
}

function SalaryForm({ teacherId, onClose }: { teacherId: string; onClose: () => void }) {
  const { mutateAsync, isPending } = useSetSalary(teacherId)
  const [form, setForm] = useState<Partial<CreateSalaryInput>>({
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
  const [error, setError] = useState('')
  const gross = computeGross(form)

  async function handleSave() {
    if (!form.basic || form.basic <= 0) { setError('Basic salary is required'); return }
    if (!form.effective_from) { setError('Effective from date is required'); return }
    setError('')
    try {
      await mutateAsync(form as CreateSalaryInput)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save salary')
    }
  }

  return (
    <div className="space-y-4 p-4 rounded-xl border border-border bg-slate-50">
      <h4 className="font-semibold text-slate-800">Update Salary Structure</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label>Basic (₹) *</Label>
          <Input type="number" value={form.basic ?? ''} onChange={(e) => setForm((s) => ({ ...s, basic: Number(e.target.value) }))} />
        </div>
        <div className="space-y-1">
          <Label>HRA</Label>
          <div className="flex gap-2">
            <select className="border border-border rounded-md text-sm px-2 h-9" value={form.hra_type} onChange={(e) => setForm((s) => ({ ...s, hra_type: e.target.value as 'PERCENT' | 'FIXED' }))}>
              <option value="PERCENT">%</option><option value="FIXED">₹</option>
            </select>
            <Input type="number" value={form.hra_value ?? ''} onChange={(e) => setForm((s) => ({ ...s, hra_value: Number(e.target.value) }))} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>DA</Label>
          <div className="flex gap-2">
            <select className="border border-border rounded-md text-sm px-2 h-9" value={form.da_type} onChange={(e) => setForm((s) => ({ ...s, da_type: e.target.value as 'PERCENT' | 'FIXED' }))}>
              <option value="PERCENT">%</option><option value="FIXED">₹</option>
            </select>
            <Input type="number" value={form.da_value ?? ''} onChange={(e) => setForm((s) => ({ ...s, da_value: Number(e.target.value) }))} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Transport (₹)</Label>
          <Input type="number" value={form.transport_allowance ?? 0} onChange={(e) => setForm((s) => ({ ...s, transport_allowance: Number(e.target.value) }))} />
        </div>
        <div className="space-y-1">
          <Label>Special (₹)</Label>
          <Input type="number" value={form.special_allowance ?? 0} onChange={(e) => setForm((s) => ({ ...s, special_allowance: Number(e.target.value) }))} />
        </div>
        <div className="col-span-2">
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
            <p className="text-xs text-text-muted">Gross Monthly</p>
            <p className="text-xl font-bold text-primary">₹{gross.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Effective From *</Label>
          <Input value={form.effective_from ?? ''} onChange={(e) => setForm((s) => ({ ...s, effective_from: e.target.value }))} />
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => void handleSave()} disabled={isPending}>
          Save
        </Button>
      </div>
    </div>
  )
}

// ─── Leave tab ────────────────────────────────────────────────────────────

function LeaveBalanceCard({ label, used, entitled }: { label: string; used: number; entitled: number }) {
  const remaining = entitled - used
  const pct = entitled > 0 ? Math.round((used / entitled) * 100) : 0
  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
      <p className="text-xs font-semibold text-text-secondary uppercase">{label}</p>
      <p className="text-2xl font-bold text-text-primary">{remaining}<span className="text-sm font-normal text-text-muted">/{entitled}</span></p>
      <p className="text-xs text-text-muted">{used} used</p>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function leaveStatusBadge(status: string | null) {
  if (status === 'APPROVED') return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>
  if (status === 'REJECTED') return <Badge className="bg-danger/10 text-danger border-danger/20"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
  return <Badge className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
}

// ─── Profile Page ─────────────────────────────────────────────────────────

type TabId = 'info' | 'subjects' | 'salary' | 'leave'

export default function TeacherProfilePage() {
  const { teacherId } = useParams<{ teacherId: string }>()
  const role = useAuthStore((s) => s.role)
  const [activeTab, setActiveTab] = useState<TabId>('info')
  const [showSalaryForm, setShowSalaryForm] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const {
    data: teacher,
    isLoading: teacherLoading,
    isError: teacherError,
    refetch,
  } = useTeacherProfile(teacherId)

  const { data: leaveData, isLoading: leaveLoading } = useTeacherLeave(
    activeTab === 'leave' ? teacherId : undefined,
  )

  const leaveActionMutation = useLeaveAction(teacherId ?? '', rejectingId ?? '')

  if (teacherError) {
    return (
      <PageLayout>
        <PageHeader title="Teacher Profile" backHref="/teachers" />
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-danger" />
          <p className="text-sm text-slate-600">Could not load teacher profile.</p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      </PageLayout>
    )
  }

  if (teacherLoading || !teacher) {
    return (
      <PageLayout>
        <PageHeader title="Teacher Profile" backHref="/teachers" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </PageLayout>
    )
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'info', label: 'Info' },
    { id: 'subjects', label: 'Subjects' },
    ...(role === UserRole.PRINCIPAL ? [{ id: 'salary' as TabId, label: 'Salary' }] : []),
    { id: 'leave', label: 'Leave' },
  ]

  function handleApprove() {
    leaveActionMutation.mutate({ action: 'APPROVE' })
  }

  function handleReject() {
    if (!rejectionReason.trim()) return
    leaveActionMutation.mutate({ action: 'REJECT', rejection_reason: rejectionReason })
    setRejectingId(null)
    setRejectionReason('')
  }

  return (
    <PageLayout>
      <PageHeader title={teacher.full_name} backHref="/teachers" />

      <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-6">
        {/* Header card */}
        <div className="rounded-xl border border-border bg-surface shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-primary">
                {teacher.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">{teacher.full_name}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline">{teacher.designation}</Badge>
                    <Badge className={cn(
                      teacher.status === 'ACTIVE' ? 'bg-success/10 text-success border-success/20' : 'bg-slate-100 text-slate-500',
                    )}>
                      {teacher.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 mt-3 text-sm text-text-secondary flex-wrap">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                  {teacher.mobile}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  Joined {teacher.joining_date}
                </span>
                {teacher.employee_id && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {teacher.employee_id}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary',
                )}
                aria-selected={activeTab === tab.id}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB: Info */}
        {activeTab === 'info' && (
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
              {[
                ['Full Name', teacher.full_name],
                ['Mobile', teacher.mobile],
                ['Email', teacher.email ?? '—'],
                ['Date of Birth', teacher.date_of_birth ?? '—'],
                ['Gender', teacher.gender ?? '—'],
                ['Teaching Qualification', teacher.teaching_qualification ?? '—'],
                ['Employment Type', teacher.employment_type],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
                  <p className="mt-1 text-sm text-text-primary">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: Subjects */}
        {activeTab === 'subjects' && (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            {teacher.subject_assignments.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <BookOpen className="h-8 w-8 text-text-muted" />
                <p className="text-sm text-text-muted">No subject assignments yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-border">
                  <tr>
                    {['Class', 'Section', 'Subject', 'Class Teacher'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {teacher.subject_assignments.map((sa, i) => (
                    <tr
                      key={i}
                      className={sa.is_class_teacher ? 'bg-secondary/5' : 'hover:bg-slate-50'}
                    >
                      <td className="px-4 py-3 font-medium">{sa.class_year}</td>
                      <td className="px-4 py-3">{sa.section}</td>
                      <td className="px-4 py-3">{sa.subject}</td>
                      <td className="px-4 py-3">
                        {sa.is_class_teacher ? (
                          <Badge className="bg-secondary/10 text-secondary border-secondary/20">
                            Class Teacher
                          </Badge>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB: Salary (PRINCIPAL only) */}
        {activeTab === 'salary' && role === UserRole.PRINCIPAL && (
          <div className="space-y-4">
            {showSalaryForm ? (
              <SalaryForm teacherId={teacher.teacher_id} onClose={() => setShowSalaryForm(false)} />
            ) : teacher.salary ? (
              <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wide">Gross Monthly</p>
                    <p className="text-3xl font-bold text-primary flex items-center gap-1">
                      <IndianRupee className="h-6 w-6" aria-hidden="true" />
                      {teacher.salary.gross_monthly.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-text-muted mt-1">Effective from {teacher.salary.effective_from}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowSalaryForm(true)}>
                    Update Salary
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 pt-2">
                  {[
                    ['Basic', `₹${teacher.salary.basic.toLocaleString('en-IN')}`],
                    ['HRA', `₹${teacher.salary.hra_value.toLocaleString('en-IN')}`],
                    ['DA', `₹${teacher.salary.da_value.toLocaleString('en-IN')}`],
                    ['Transport', `₹${teacher.salary.transport_allowance.toLocaleString('en-IN')}`],
                    ['Special', `₹${teacher.salary.special_allowance.toLocaleString('en-IN')}`],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-text-muted">{label}</p>
                      <p className="font-medium text-text-primary">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  {teacher.salary.pf_applicable && <Badge variant="outline">PF</Badge>}
                  {teacher.salary.esi_applicable && <Badge variant="outline">ESI</Badge>}
                  <Badge variant="outline">PT</Badge>
                </div>

                {teacher.salary.ifsc_code && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-text-muted">Bank</p>
                    <p className="text-sm text-text-primary">
                      {teacher.salary.bank_name ?? '—'} · {teacher.salary.ifsc_code}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-12 text-center rounded-xl border border-border bg-surface">
                <IndianRupee className="h-8 w-8 text-text-muted" />
                <p className="text-sm text-text-muted">No salary structure set yet.</p>
                <Button onClick={() => setShowSalaryForm(true)}>Set Salary Structure</Button>
              </div>
            )}
          </div>
        )}

        {/* TAB: Leave */}
        {activeTab === 'leave' && (
          <div className="space-y-6">
            {leaveLoading ? (
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
            ) : leaveData?.balances ? (
              <div className="grid grid-cols-3 gap-4">
                <LeaveBalanceCard label="Casual Leave" used={leaveData.balances.cl_used} entitled={leaveData.balances.cl_entitled} />
                <LeaveBalanceCard label="Sick Leave" used={leaveData.balances.sl_used} entitled={leaveData.balances.sl_entitled} />
                <LeaveBalanceCard label="Earned Leave" used={leaveData.balances.el_used} entitled={leaveData.balances.el_entitled} />
              </div>
            ) : (
              <p className="text-sm text-text-muted">No leave balances found for this year.</p>
            )}

            {/* Applications table */}
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h4 className="font-semibold text-sm text-text-primary">Leave Applications</h4>
              </div>
              {!leaveData?.applications || leaveData.applications.length === 0 ? (
                <div className="py-8 text-center text-sm text-text-muted">No applications.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-border">
                    <tr>
                      {['Type', 'Dates', 'Days', 'Status', ...(role === UserRole.PRINCIPAL ? ['Actions'] : [])].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {leaveData.applications.map((app) => (
                      <>
                        <tr key={app.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium">{app.leave_type}</td>
                          <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                            {app.from_date} → {app.to_date}
                          </td>
                          <td className="px-4 py-3">{app.days_count}</td>
                          <td className="px-4 py-3">{leaveStatusBadge(app.status)}</td>
                          {role === UserRole.PRINCIPAL && (
                            <td className="px-4 py-3">
                              {app.status === 'PENDING' && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="h-7 bg-success hover:bg-success/90 text-white"
                                    onClick={() => handleApprove()}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-danger border-danger/30 hover:bg-danger/10"
                                    onClick={() => setRejectingId(rejectingId === app.id ? null : app.id)}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                        {rejectingId === app.id && (
                          <tr key={`reject-${app.id}`}>
                            <td colSpan={5} className="px-4 py-3 bg-danger/5">
                              <div className="flex gap-2 items-start">
                                <textarea
                                  placeholder="Rejection reason..."
                                  value={rejectionReason}
                                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectionReason(e.target.value)}
                                  className="flex-1 h-16 text-sm rounded-md border border-border px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                                <div className="flex flex-col gap-2">
                                  <Button
                                    size="sm"
                                    className="h-7 bg-danger hover:bg-danger/90 text-white"
                                    onClick={() => handleReject()}
                                    disabled={!rejectionReason.trim()}
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7"
                                    onClick={() => { setRejectingId(null); setRejectionReason('') }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </PageLayout>
  )
}
