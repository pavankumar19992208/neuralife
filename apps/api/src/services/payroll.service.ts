import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import { ValidationError, NotFoundError } from '../utils/errors.js'
import { PayrollRepository } from '../repositories/payroll.repository.js'
import type { PayrollSummary, PayslipRow, NEFTExportRow, AdjustmentType } from '../types/common.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any>

const WORKING_DAYS_IN_MONTH = 26 // standard assumption for Indian payroll

function computeGross(sal: {
  basic: number; hra_type: string; hra_value: number
  da_type: string; da_value: number; transport_allowance: number; special_allowance: number
}): { basic: number; hra: number; da: number; transport_allowance: number; special_allowance: number; gross: number } {
  const basic = sal.basic
  const hra = sal.hra_type === 'PERCENT' ? Math.round(basic * sal.hra_value / 100) : sal.hra_value
  const da  = sal.da_type  === 'PERCENT' ? Math.round(basic * sal.da_value  / 100) : sal.da_value
  const transport = sal.transport_allowance
  const special   = sal.special_allowance
  const gross = basic + hra + da + transport + special
  return { basic, hra, da, transport_allowance: transport, special_allowance: special, gross }
}

function computeDeductions(
  gross: number, basic: number,
  lopDays: number, workingDays: number,
  pfApplicable: boolean, esiApplicable: boolean, ptApplicable: boolean,
): { pf: number; esi: number; pt: number; lopDeduction: number } {
  const dailyRate = workingDays > 0 ? gross / workingDays : 0
  const lopDeduction = Math.round(dailyRate * lopDays * 100) / 100

  const pf  = pfApplicable  ? Math.round(basic * 0.12 * 100) / 100 : 0
  const esi = esiApplicable && gross <= 21000 ? Math.round(gross * 0.0075 * 100) / 100 : 0
  const pt  = ptApplicable  && gross > 15000  ? 200 : 0

  return { pf, esi, pt, lopDeduction }
}

export class PayrollService {
  private readonly repo: PayrollRepository

  constructor(
    private readonly supabase: AnySupabase,
    private readonly logger: FastifyBaseLogger,
  ) {
    this.repo = new PayrollRepository(supabase as SupabaseClient<Database>, logger)
  }

  async generatePayroll(
    schoolId: string, academicYearId: string,
    month: number, year: number, correlationId: string,
  ): Promise<PayrollSummary> {
    this.logger.info({ correlationId, schoolId, month, year }, 'PayrollService.generatePayroll')

    // Find or create the payroll run
    let run = await this.repo.findRun(schoolId, month, year, correlationId)
    if (run && run.status === 'PAID') {
      throw new ValidationError('Payroll already paid — cannot regenerate', { month, year })
    }
    if (!run) {
      run = await this.repo.createRun(schoolId, academicYearId, month, year, correlationId)
    }

    const teachers = await this.repo.getTeachersWithSalary(schoolId, correlationId)
    if (teachers.length === 0) {
      throw new ValidationError('No active teachers with salary structures found')
    }

    const workingDays = WORKING_DAYS_IN_MONTH
    let totalGross = 0; let totalDeductions = 0; let totalNet = 0

    for (const { teacher, salary } of teachers) {
      if (!salary) continue

      const sal = await this.repo.getTeacherSalaryStructure(teacher.id, correlationId)
      if (!sal) continue

      const salTyped = sal as unknown as {
        basic: number; hra_type: string; hra_value: number
        da_type: string; da_value: number; transport_allowance: number
        special_allowance: number; pf_applicable: boolean
        esi_applicable: boolean; pt_applicable: boolean
      }
      const { basic, hra, da, transport_allowance, special_allowance, gross } = computeGross(salTyped)

      const lopDays = await this.repo.getTeacherLopDays(schoolId, teacher.id, month, year, correlationId)
      const presentDays = Math.max(0, workingDays - lopDays)

      const { pf, esi, pt, lopDeduction } = computeDeductions(
        gross, basic, lopDays, workingDays,
        salTyped.pf_applicable, salTyped.esi_applicable, salTyped.pt_applicable,
      )

      const adjList = await this.repo.getAdjustmentsByPayslip(
        // We don't have payslip id yet — adjustments are added after generation, skip here
        '', correlationId,
      ).catch(() => [])
      const adjDeductions = adjList.filter(a => a.is_deduction).reduce((s, a) => s + a.amount, 0)
      const adjAdditions  = adjList.filter(a => !a.is_deduction).reduce((s, a) => s + a.amount, 0)

      const totalDed = pf + esi + pt + lopDeduction + adjDeductions
      const net = Math.max(0, gross - totalDed + adjAdditions)

      await this.repo.upsertPayslip({
        id: crypto.randomUUID(),
        payroll_run_id: run.id, school_id: schoolId, teacher_id: teacher.id,
        month, year, basic, hra, da, transport_allowance, special_allowance,
        gross_salary: gross, working_days: workingDays, present_days: presentDays,
        lop_days: lopDays, pf_employee: pf, esi_employee: esi,
        professional_tax: pt, lop_deduction: lopDeduction,
        total_deductions: totalDed, net_salary: net,
      }, correlationId)

      totalGross += gross; totalDeductions += totalDed; totalNet += net
    }

    const teacherCount = teachers.filter(t => t.salary).length
    await this.repo.updateRun(run.id, {
      status: 'GENERATED',
      total_gross: Math.round(totalGross * 100) / 100,
      total_deductions: Math.round(totalDeductions * 100) / 100,
      total_net: Math.round(totalNet * 100) / 100,
      teacher_count: teacherCount,
      generated_at: new Date().toISOString(),
    }, correlationId)

    return this.getPayrollSummary(schoolId, month, year, correlationId)
  }

  async getPayrollSummary(schoolId: string, month: number, year: number, correlationId: string): Promise<PayrollSummary> {
    const run = await this.repo.findRun(schoolId, month, year, correlationId)
    if (!run) throw new NotFoundError('Payroll run not found', { month, year })

    const payslips = await this.repo.getPayslipsByRun(run.id, correlationId)

    const allAdjustments = new Map<string, Awaited<ReturnType<PayrollRepository['getAdjustmentsByPayslip']>>>()
    await Promise.all(payslips.map(async ps => {
      const adjs = await this.repo.getAdjustmentsByPayslip(ps.id, correlationId)
      allAdjustments.set(ps.id, adjs)
    }))

    // Fetch teacher metadata (employee_id + designation live on teacher_school_assignments)
    const teacherIds = [...new Set(payslips.map(p => p.teacher_id))]
    const teacherMap = new Map<string, { name: string; employee_id: string | null; designation: string }>()
    const bankMap    = new Map<string, { account: string | null; ifsc: string | null; bank: string | null }>()

    if (teacherIds.length > 0) {
      const { data: asgRows } = await (this.supabase as SupabaseClient<Database>)
        .from('teacher_school_assignments')
        .select('teacher_id, employee_id, designation, teachers!teacher_id(full_name)')
        .in('teacher_id', teacherIds)
      for (const a of (asgRows ?? []) as unknown as Array<{ teacher_id: string; employee_id: string | null; designation: string; teachers: { full_name: string } }>) {
        if (!teacherMap.has(a.teacher_id)) {
          teacherMap.set(a.teacher_id, {
            name: a.teachers.full_name, employee_id: a.employee_id, designation: a.designation,
          })
        }
      }

      const { data: sRows } = await (this.supabase as SupabaseClient<Database>)
        .from('salary_structures')
        .select('teacher_id, bank_account_number, ifsc_code, bank_name')
        .in('teacher_id', teacherIds)
        .is('effective_to', null)
        .order('effective_from', { ascending: false })
      const seen = new Set<string>()
      for (const s of sRows ?? []) {
        if (!seen.has(s.teacher_id)) {
          seen.add(s.teacher_id)
          bankMap.set(s.teacher_id, {
            account: s.bank_account_number ?? null,
            ifsc: s.ifsc_code ?? null,
            bank: s.bank_name ?? null,
          })
        }
      }
    }

    return this.repo.buildSummary(run, payslips, allAdjustments, teacherMap, bankMap)
  }

  async approvePayroll(schoolId: string, month: number, year: number, correlationId: string): Promise<PayrollSummary> {
    const run = await this.repo.findRun(schoolId, month, year, correlationId)
    if (!run) throw new NotFoundError('Payroll run not found', { month, year })
    if (run.status !== 'GENERATED') throw new ValidationError(`Cannot approve a run with status ${run.status}`)
    await this.repo.updateRun(run.id, { status: 'APPROVED', approved_at: new Date().toISOString() }, correlationId)
    return this.getPayrollSummary(schoolId, month, year, correlationId)
  }

  async markPaid(schoolId: string, month: number, year: number, correlationId: string): Promise<PayrollSummary> {
    const run = await this.repo.findRun(schoolId, month, year, correlationId)
    if (!run) throw new NotFoundError('Payroll run not found', { month, year })
    if (run.status !== 'APPROVED') throw new ValidationError(`Cannot mark paid — status is ${run.status}`)

    const payslips = await this.repo.getPayslipsByRun(run.id, correlationId)
    await Promise.all(
      payslips
        .filter(ps => ps.status === 'GENERATED')
        .map(ps => this.repo.updatePayslip(ps.id, { status: 'PAID', payment_date: new Date().toISOString().split('T')[0] }, correlationId))
    )
    await this.repo.updateRun(run.id, { status: 'PAID', paid_at: new Date().toISOString() }, correlationId)
    return this.getPayrollSummary(schoolId, month, year, correlationId)
  }

  async addAdjustment(
    schoolId: string, payslipId: string,
    adjustmentType: AdjustmentType, label: string,
    amount: number, isDeduction: boolean, addedBy: string, correlationId: string,
  ): Promise<PayslipRow> {
    const ps = await this.repo.getPayslipById(payslipId, correlationId)
    if (ps.school_id !== schoolId) throw new NotFoundError('Payslip not found', { payslipId })

    await this.repo.addAdjustment(payslipId, schoolId, adjustmentType, label, amount, isDeduction, addedBy, correlationId)

    // Recompute net
    const adjs = await this.repo.getAdjustmentsByPayslip(payslipId, correlationId)
    const adjDed = adjs.filter(a => a.is_deduction).reduce((s, a) => s + a.amount, 0)
    const adjAdd = adjs.filter(a => !a.is_deduction).reduce((s, a) => s + a.amount, 0)
    const baseDed = ps.pf_employee + ps.esi_employee + ps.professional_tax + ps.lop_deduction
    const totalDed = Math.round((baseDed + adjDed) * 100) / 100
    const net = Math.max(0, Math.round((ps.gross_salary - totalDed + adjAdd) * 100) / 100)

    await this.repo.updatePayslip(payslipId, { total_deductions: totalDed, net_salary: net }, correlationId)

    return this.getSinglePayslip(schoolId, payslipId, correlationId)
  }

  async deleteAdjustment(
    schoolId: string, payslipId: string,
    adjustmentId: string, correlationId: string,
  ): Promise<PayslipRow> {
    const ps = await this.repo.getPayslipById(payslipId, correlationId)
    if (ps.school_id !== schoolId) throw new NotFoundError('Payslip not found', { payslipId })
    await this.repo.deleteAdjustment(adjustmentId, correlationId)

    const adjs = await this.repo.getAdjustmentsByPayslip(payslipId, correlationId)
    const adjDed = adjs.filter(a => a.is_deduction).reduce((s, a) => s + a.amount, 0)
    const adjAdd = adjs.filter(a => !a.is_deduction).reduce((s, a) => s + a.amount, 0)
    const baseDed = ps.pf_employee + ps.esi_employee + ps.professional_tax + ps.lop_deduction
    const totalDed = Math.round((baseDed + adjDed) * 100) / 100
    const net = Math.max(0, Math.round((ps.gross_salary - totalDed + adjAdd) * 100) / 100)
    await this.repo.updatePayslip(payslipId, { total_deductions: totalDed, net_salary: net }, correlationId)

    return this.getSinglePayslip(schoolId, payslipId, correlationId)
  }

  async getSinglePayslip(schoolId: string, payslipId: string, correlationId: string): Promise<PayslipRow> {
    const summary = await this.getPayrollSummaryByPayslipId(schoolId, payslipId, correlationId)
    const row = summary.payslips.find(p => p.id === payslipId)
    if (!row) throw new NotFoundError('Payslip not found', { payslipId })
    return row
  }

  private async getPayrollSummaryByPayslipId(schoolId: string, payslipId: string, correlationId: string): Promise<PayrollSummary> {
    const ps = await this.repo.getPayslipById(payslipId, correlationId)
    if (ps.school_id !== schoolId) throw new NotFoundError('Payslip not found', { payslipId })
    return this.getPayrollSummary(schoolId, ps.month, ps.year, correlationId)
  }

  async getPayrollHistory(schoolId: string, correlationId: string): Promise<Array<Omit<PayrollSummary, 'payslips'>>> {
    const runs = await this.repo.listRuns(schoolId, correlationId)
    const MONTH_LABELS = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ]
    return runs.map(r => ({
      id: r.id, school_id: r.school_id, academic_year_id: r.academic_year_id,
      month: r.month, year: r.year, month_label: MONTH_LABELS[r.month] ?? '',
      status: r.status as 'DRAFT' | 'GENERATED' | 'APPROVED' | 'PAID',
      total_gross: r.total_gross, total_deductions: r.total_deductions,
      total_net: r.total_net, teacher_count: r.teacher_count,
      generated_at: r.generated_at, approved_at: r.approved_at, paid_at: r.paid_at,
    }))
  }

  async buildNEFTExport(schoolId: string, month: number, year: number, correlationId: string): Promise<NEFTExportRow[]> {
    const summary = await this.getPayrollSummary(schoolId, month, year, correlationId)
    const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return summary.payslips
      .filter(ps => ps.status !== 'ON_HOLD' && ps.bank_account_number && ps.ifsc_code)
      .map(ps => ({
        teacher_name: ps.teacher_name,
        account_number: ps.bank_account_number!,
        ifsc_code: ps.ifsc_code!,
        bank_name: ps.bank_name ?? '',
        net_salary: ps.net_salary,
        remarks: `Salary ${MONTH_LABELS[month]} ${year}`,
      }))
  }

  async holdPayslip(schoolId: string, payslipId: string, correlationId: string): Promise<void> {
    const ps = await this.repo.getPayslipById(payslipId, correlationId)
    if (ps.school_id !== schoolId) throw new NotFoundError('Payslip not found', { payslipId })
    await this.repo.updatePayslip(payslipId, { status: 'ON_HOLD' }, correlationId)
  }

  async releaseHold(schoolId: string, payslipId: string, correlationId: string): Promise<void> {
    const ps = await this.repo.getPayslipById(payslipId, correlationId)
    if (ps.school_id !== schoolId) throw new NotFoundError('Payslip not found', { payslipId })
    await this.repo.updatePayslip(payslipId, { status: 'GENERATED' }, correlationId)
  }
}
