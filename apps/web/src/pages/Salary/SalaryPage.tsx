import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, ChevronLeft, ChevronRight, Play, CheckCircle, CreditCard,
  Download, AlertTriangle, Plus, Trash2, Lock, Unlock, FileText,
  TrendingUp, Users, IndianRupee,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { slideUp } from '@/lib/animations'
import PageLayout from '@/components/layout/PageLayout'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/feedback/EmptyState'
import { useAuthStore } from '@/store/authStore'
import {
  usePayroll, usePayrollHistory, useGeneratePayroll,
  useApprovePayroll, useMarkPaid, useAddAdjustment,
  useDeleteAdjustment, useNEFTExport, useHoldPayslip, useReleaseHold,
} from '@/hooks/useSalary'
import { generatePayslipPDF, buildNEFTCSV } from '@/lib/generatePayslipPDF'
import type { PayslipRow, AdjustmentType, PayrollStatus } from '@/types/common'

const RUPEE = '₹'
function fmt(n: number) { return `${RUPEE}${n.toLocaleString('en-IN', { minimumFractionDigits: 0 })}` }
const MONTH_LABELS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const SHORT_MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const STATUS_CONFIG: Record<PayrollStatus, { label: string; color: string }> = {
  DRAFT:     { label: 'Draft',     color: 'bg-slate-100 text-slate-700' },
  GENERATED: { label: 'Generated', color: 'bg-blue-100 text-blue-700' },
  APPROVED:  { label: 'Approved',  color: 'bg-amber-100 text-amber-700' },
  PAID:      { label: 'Paid',      color: 'bg-green-100 text-green-700' },
}

// ─── Payslip Detail Drawer ─────────────────────────────────────────────────
function PayslipDrawer({
  payslip, month, year, schoolName, schoolAddress, runStatus, onClose,
}: {
  payslip: PayslipRow; month: number; year: number
  schoolName: string; schoolAddress: string
  runStatus: PayrollStatus
  onClose: () => void
}) {
  const [adjType, setAdjType] = useState<AdjustmentType>('BONUS')
  const [adjLabel, setAdjLabel] = useState('')
  const [adjAmount, setAdjAmount] = useState('')
  const [adjIsDeduction, setAdjIsDeduction] = useState(false)

  const addAdj = useAddAdjustment()
  const delAdj = useDeleteAdjustment()
  const holdPs = useHoldPayslip()
  const releasePs = useReleaseHold()

  const canEdit = runStatus === 'GENERATED' || runStatus === 'APPROVED'

  async function handleAddAdj() {
    const amount = parseFloat(adjAmount)
    if (!adjLabel.trim() || isNaN(amount) || amount <= 0) return
    try {
      await addAdj.mutateAsync({ payslipId: payslip.id, adjustment_type: adjType, label: adjLabel.trim(), amount, is_deduction: adjIsDeduction })
      setAdjLabel(''); setAdjAmount('')
      toast.success('Adjustment added')
    } catch { toast.error('Failed to add adjustment') }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 z-40" onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="fixed right-0 top-0 h-full w-[26rem] bg-white shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="font-semibold">{payslip.teacher_name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{payslip.designation} · {MONTH_LABELS[month]} {year}</p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              payslip.status === 'ON_HOLD' ? (
                <button onClick={() => releasePs.mutateAsync(payslip.id).then(() => toast.success('Hold released')).catch(() => toast.error('Failed'))}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-amber-400" title="Release hold">
                  <Unlock className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={() => holdPs.mutateAsync(payslip.id).then(() => toast.success('Payslip held')).catch(() => toast.error('Failed'))}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-300" title="Put on hold">
                  <Lock className="h-4 w-4" />
                </button>
              )
            )}
            <button onClick={() => generatePayslipPDF(payslip, schoolName, schoolAddress, month, year)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Download PDF">
              <FileText className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {payslip.status === 'ON_HOLD' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-xs text-amber-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              This payslip is on hold and will be excluded from NEFT export.
            </div>
          )}

          {/* Net Pay */}
          <div className="bg-primary rounded-xl p-4 text-white text-center">
            <p className="text-xs opacity-80 mb-1">Net Pay</p>
            <p className="text-2xl font-bold">{fmt(payslip.net_salary)}</p>
            {payslip.bank_account_number && (
              <p className="text-xs opacity-70 mt-1">{payslip.bank_name} · {payslip.bank_account_number}</p>
            )}
          </div>

          {/* Earnings */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Earnings</p>
            <div className="space-y-1">
              {[
                ['Basic', payslip.basic], ['HRA', payslip.hra], ['DA', payslip.da],
                ['Transport', payslip.transport_allowance], ['Special', payslip.special_allowance],
                ...payslip.adjustments.filter(a => !a.is_deduction).map(a => [a.label, a.amount]),
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between text-sm text-slate-700 py-1 border-b border-border/50">
                  <span>{k}</span><span className="font-medium text-green-700">{fmt(v as number)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold text-slate-800 pt-1">
                <span>Gross</span><span>{fmt(payslip.gross_salary)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Deductions</p>
            <div className="space-y-1">
              {[
                ['PF (12%)', payslip.pf_employee], ['ESI (0.75%)', payslip.esi_employee],
                ['Professional Tax', payslip.professional_tax], [`LOP (${payslip.lop_days}d)`, payslip.lop_deduction],
                ...payslip.adjustments.filter(a => a.is_deduction).map(a => [a.label, a.amount]),
              ].filter(([, v]) => (v as number) > 0).map(([k, v], idx) => {
                const adj = payslip.adjustments.find(a => a.is_deduction && a.label === k)
                return (
                  <div key={idx} className="flex justify-between items-center text-sm text-slate-700 py-1 border-b border-border/50">
                    <span>{k as string}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-red-600">{fmt(v as number)}</span>
                      {adj && canEdit && (
                        <button onClick={() => delAdj.mutateAsync({ payslipId: payslip.id, adjustmentId: adj.id }).then(() => toast.success('Removed')).catch(() => toast.error('Failed'))}
                          className="text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              <div className="flex justify-between text-sm font-semibold text-slate-800 pt-1">
                <span>Total Deductions</span><span className="text-red-600">{fmt(payslip.total_deductions)}</span>
              </div>
            </div>
          </div>

          {/* Add adjustment */}
          {canEdit && (
            <div className="border border-border rounded-xl p-3 space-y-3">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Add Adjustment</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Type</Label>
                  <select value={adjType} onChange={e => setAdjType(e.target.value as AdjustmentType)}
                    className="w-full mt-1 text-xs border border-border rounded-lg px-2 py-1.5 bg-white">
                    {(['BONUS', 'ARREAR', 'ADVANCE_RECOVERY', 'FINE', 'OTHER'] as AdjustmentType[]).map(t =>
                      <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                    )}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Direction</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="radio" checked={!adjIsDeduction} onChange={() => setAdjIsDeduction(false)} />
                      Addition
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="radio" checked={adjIsDeduction} onChange={() => setAdjIsDeduction(true)} />
                      Deduction
                    </label>
                  </div>
                </div>
              </div>
              <Input placeholder="Label (e.g. Performance bonus)" value={adjLabel} onChange={e => setAdjLabel(e.target.value)} className="text-xs" />
              <div className="flex gap-2">
                <Input type="number" placeholder="Amount" value={adjAmount} onChange={e => setAdjAmount(e.target.value)} className="text-xs flex-1" />
                <Button size="sm" onClick={handleAddAdj} disabled={addAdj.isPending} className="bg-primary hover:bg-primary/90">
                  <Plus className="h-3.5 w-3.5 mr-1" />Add
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}

// ─── Monthly Payroll Tab ───────────────────────────────────────────────────
function MonthlyPayrollTab({ schoolName, schoolAddress }: { schoolName: string; schoolAddress: string }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipRow | null>(null)

  const { data: payroll, isLoading } = usePayroll(month, year)
  const generate = useGeneratePayroll()
  const approve = useApprovePayroll()
  const markPaid = useMarkPaid()
  const [neftEnabled, setNeftEnabled] = useState(false)
  const { data: neftRows } = useNEFTExport(month, year, neftEnabled)

  function navigate(dir: 1 | -1) {
    const d = new Date(year, month - 1 + dir)
    setMonth(d.getMonth() + 1); setYear(d.getFullYear())
    setSelectedPayslip(null)
  }

  async function handleGenerate() {
    try {
      await generate.mutateAsync({ month, year })
      toast.success('Payroll generated')
    } catch (e: unknown) {
      const err = e as { message?: string }
      toast.error(err?.message ?? 'Failed to generate payroll')
    }
  }

  async function handleApprove() {
    try { await approve.mutateAsync({ month, year }); toast.success('Payroll approved') }
    catch { toast.error('Failed to approve') }
  }

  async function handleMarkPaid() {
    try { await markPaid.mutateAsync({ month, year }); toast.success('Marked as paid') }
    catch { toast.error('Failed') }
  }

  async function handleNEFT() {
    setNeftEnabled(true)
    setTimeout(() => {
      if (neftRows) buildNEFTCSV(neftRows, SHORT_MONTHS[month], year)
    }, 500)
    toast.success('NEFT CSV downloading...')
  }

  if (isLoading) return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg border border-border hover:bg-slate-50 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-semibold text-lg text-slate-800 min-w-[140px] text-center">
            {MONTH_LABELS[month]} {year}
          </span>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg border border-border hover:bg-slate-50 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {payroll?.status === 'GENERATED' && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleNEFT}>
                <Download className="h-3.5 w-3.5" />NEFT CSV
              </Button>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 gap-1.5" onClick={handleApprove} disabled={approve.isPending}>
                <CheckCircle className="h-3.5 w-3.5" />Approve
              </Button>
            </>
          )}
          {payroll?.status === 'APPROVED' && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleNEFT}>
                <Download className="h-3.5 w-3.5" />NEFT CSV
              </Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1.5" onClick={handleMarkPaid} disabled={markPaid.isPending}>
                <CreditCard className="h-3.5 w-3.5" />Mark Paid
              </Button>
            </>
          )}
          {(!payroll || payroll.status === 'DRAFT') && (
            <Button size="sm" className="bg-primary hover:bg-primary/90 gap-1.5" onClick={handleGenerate} disabled={generate.isPending}>
              {generate.isPending
                ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : <Play className="h-3.5 w-3.5" />}
              Generate Payroll
            </Button>
          )}
        </div>
      </div>

      {/* KPI strip */}
      {payroll && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Teachers', value: payroll.teacher_count, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Gross Payroll', value: fmt(payroll.total_gross), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Deductions', value: fmt(payroll.total_deductions), icon: IndianRupee, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Net Payroll', value: fmt(payroll.total_net), icon: Wallet, color: 'text-primary', bg: 'bg-blue-50' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', kpi.bg)}>
                <kpi.icon className={cn('h-4.5 w-4.5', kpi.color)} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className="font-bold text-slate-800">{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status badge */}
      {payroll && (
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_CONFIG[payroll.status].color)}>
            {STATUS_CONFIG[payroll.status].label}
          </span>
          {payroll.generated_at && <span className="text-xs text-slate-500">Generated {new Date(payroll.generated_at).toLocaleDateString('en-IN')}</span>}
          {payroll.approved_at && <span className="text-xs text-slate-500">· Approved {new Date(payroll.approved_at).toLocaleDateString('en-IN')}</span>}
          {payroll.paid_at && <span className="text-xs text-slate-500">· Paid {new Date(payroll.paid_at).toLocaleDateString('en-IN')}</span>}
        </div>
      )}

      {/* Payslip table */}
      {!payroll ? (
        <EmptyState
          icon={<Wallet className="h-8 w-8 text-slate-400" />}
          title={`No payroll for ${MONTH_LABELS[month]} ${year}`}
          description="Click 'Generate Payroll' to compute salaries for all active teachers."
          action={
            <Button className="bg-primary hover:bg-primary/90 gap-1.5" onClick={handleGenerate} disabled={generate.isPending}>
              <Play className="h-4 w-4" />Generate Payroll
            </Button>
          }
        />
      ) : payroll.payslips.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8 text-slate-400" />}
          title="No payslips"
          description="No active teachers with salary structures found."
        />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Teacher</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">Gross</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">Deductions</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">Net</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {payroll.payslips.map((ps, i) => (
                <tr key={ps.id} className={cn('border-b border-border/50 hover:bg-slate-50/60 transition-colors cursor-pointer', i % 2 === 1 && 'bg-slate-50/30')}
                  onClick={() => setSelectedPayslip(ps)}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{ps.teacher_name}</div>
                    <div className="text-xs text-slate-500">{ps.designation}{ps.employee_id ? ` · ${ps.employee_id}` : ''}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{fmt(ps.gross_salary)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{fmt(ps.total_deductions)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(ps.net_salary)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      ps.status === 'PAID' ? 'bg-green-100 text-green-700' :
                      ps.status === 'ON_HOLD' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    )}>
                      {ps.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={e => { e.stopPropagation(); generatePayslipPDF(ps, schoolName, schoolAddress, month, year) }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {selectedPayslip && (
          <PayslipDrawer
            payslip={selectedPayslip}
            month={month} year={year}
            schoolName={schoolName} schoolAddress={schoolAddress}
            runStatus={payroll?.status ?? 'GENERATED'}
            onClose={() => setSelectedPayslip(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── History Tab ──────────────────────────────────────────────────────────
function HistoryTab() {
  const { data: history, isLoading } = usePayrollHistory()

  if (isLoading) return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
    </div>
  )

  if (!history?.length) return (
    <EmptyState
      icon={<FileText className="h-8 w-8 text-slate-400" />}
      title="No payroll history"
      description="Generated payrolls will appear here."
    />
  )

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Month</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">Teachers</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">Gross</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">Net</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600">Status</th>
          </tr>
        </thead>
        <tbody>
          {history.map((run, i) => (
            <tr key={run.id} className={cn('border-b border-border/50', i % 2 === 1 && 'bg-slate-50/30')}>
              <td className="px-4 py-3 font-medium text-slate-800">{run.month_label} {run.year}</td>
              <td className="px-4 py-3 text-right text-slate-700">{run.teacher_count}</td>
              <td className="px-4 py-3 text-right text-slate-700">{fmt(run.total_gross)}</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(run.total_net)}</td>
              <td className="px-4 py-3 text-center">
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', STATUS_CONFIG[run.status].color)}>
                  {STATUS_CONFIG[run.status].label}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Salary Revisions Tab ─────────────────────────────────────────────────
function RevisionsTab() {
  return (
    <div className="text-center py-16 text-slate-500">
      <Wallet className="h-10 w-10 mx-auto text-slate-300 mb-3" />
      <p className="font-medium text-slate-600">Salary Revisions</p>
      <p className="text-sm mt-1">Manage salary structure changes via Teacher Profile → Salary tab.</p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────
const TABS = ['Monthly Payroll', 'History', 'Revisions'] as const
type Tab = (typeof TABS)[number]

export default function SalaryPage() {
  const [tab, setTab] = useState<Tab>('Monthly Payroll')
  const { school_name } = useAuthStore()

  return (
    <PageLayout>
      <PageHeader
        title="Salary & Payroll"
        description="Generate monthly payslips, approve payroll, and export NEFT files"
      />

      <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-6">
        {/* Tab bar */}
        <div className="flex items-center gap-0 bg-slate-100 rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                'px-5 py-2 rounded-lg text-sm font-medium transition-all',
                tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}>
              {t}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            {tab === 'Monthly Payroll' && (
              <MonthlyPayrollTab
                schoolName={school_name ?? 'NeuraLife School'}
                schoolAddress="Vikas High School, Guntur, AP"
              />
            )}
            {tab === 'History' && <HistoryTab />}
            {tab === 'Revisions' && <RevisionsTab />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </PageLayout>
  )
}
