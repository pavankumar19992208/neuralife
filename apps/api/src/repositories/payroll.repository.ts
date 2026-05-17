import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import { DatabaseError, NotFoundError } from '../utils/errors.js'
import type {
  PayrollSummary, PayslipRow, PayrollAdjustment,
  PayrollStatus, AdjustmentType,
} from '../types/common.js'

// Raw DB row shapes for tables not yet in generated types
interface RawPayrollRun {
  id: string; school_id: string; academic_year_id: string
  month: number; year: number; status: string
  total_gross: number; total_deductions: number; total_net: number
  teacher_count: number; generated_at: string | null
  approved_at: string | null; paid_at: string | null; notes: string | null
  created_at: string; updated_at: string
}
interface RawPayslip {
  id: string; payroll_run_id: string; school_id: string; teacher_id: string
  month: number; year: number
  basic: number; hra: number; da: number
  transport_allowance: number; special_allowance: number; gross_salary: number
  working_days: number; present_days: number; lop_days: number
  pf_employee: number; esi_employee: number; professional_tax: number
  lop_deduction: number; total_deductions: number; net_salary: number
  status: string; payment_date: string | null; payment_reference: string | null
}
interface RawAdjustment {
  id: string; payslip_id: string; adjustment_type: string
  label: string; amount: number; is_deduction: boolean; created_at: string
}

const MONTH_LABELS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export class PayrollRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: FastifyBaseLogger,
  ) {}

  // Cast to any for tables not yet in generated Supabase types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): any { return this.supabase }

  async findRun(schoolId: string, month: number, year: number, correlationId: string): Promise<RawPayrollRun | null> {
    this.logger.debug({ correlationId, schoolId, month, year }, 'PayrollRepository.findRun')
    const { data, error } = await this.db
      .from('payroll_runs')
      .select('*')
      .eq('school_id', schoolId)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle()
    if (error) throw new DatabaseError(error.message, { correlationId })
    return data as RawPayrollRun | null
  }

  async createRun(
    schoolId: string, academicYearId: string,
    month: number, year: number, correlationId: string,
  ): Promise<RawPayrollRun> {
    const { data, error } = await this.db
      .from('payroll_runs')
      .insert({ school_id: schoolId, academic_year_id: academicYearId, month, year, status: 'DRAFT' })
      .select()
      .single()
    if (error) throw new DatabaseError(error.message, { correlationId })
    return data as RawPayrollRun
  }

  async updateRun(runId: string, updates: Record<string, unknown>, correlationId: string): Promise<void> {
    const { error } = await this.db.from('payroll_runs').update(updates).eq('id', runId)
    if (error) throw new DatabaseError(error.message, { correlationId })
  }

  async upsertPayslip(payslip: Omit<RawPayslip, 'status' | 'payment_date' | 'payment_reference'>, correlationId: string): Promise<RawPayslip> {
    // Delete existing payslip for same run+teacher, then insert fresh
    await this.db
      .from('payslips')
      .delete()
      .eq('payroll_run_id', payslip.payroll_run_id)
      .eq('teacher_id', payslip.teacher_id)

    const { data, error } = await this.db
      .from('payslips')
      .insert({ ...payslip, status: 'GENERATED' })
      .select()
      .single()
    if (error) throw new DatabaseError(error.message, { correlationId })
    return data as RawPayslip
  }

  async getPayslipsByRun(runId: string, correlationId: string): Promise<RawPayslip[]> {
    const { data, error } = await this.db
      .from('payslips')
      .select('*')
      .eq('payroll_run_id', runId)
      .order('teacher_id')
    if (error) throw new DatabaseError(error.message, { correlationId })
    return (data ?? []) as RawPayslip[]
  }

  async getPayslipById(payslipId: string, correlationId: string): Promise<RawPayslip> {
    const { data, error } = await this.db
      .from('payslips')
      .select('*')
      .eq('id', payslipId)
      .single()
    if (error || !data) throw new NotFoundError('Payslip not found', { payslipId, correlationId })
    return data as RawPayslip
  }

  async updatePayslip(payslipId: string, updates: Record<string, unknown>, correlationId: string): Promise<void> {
    const { error } = await this.db.from('payslips').update(updates).eq('id', payslipId)
    if (error) throw new DatabaseError(error.message, { correlationId })
  }

  async getAdjustmentsByPayslip(payslipId: string, correlationId: string): Promise<RawAdjustment[]> {
    if (!payslipId) return []
    const { data, error } = await this.db
      .from('payroll_adjustments')
      .select('*')
      .eq('payslip_id', payslipId)
      .order('created_at')
    if (error) throw new DatabaseError(error.message, { correlationId })
    return (data ?? []) as RawAdjustment[]
  }

  async addAdjustment(
    payslipId: string, schoolId: string,
    adjustmentType: AdjustmentType, label: string,
    amount: number, isDeduction: boolean,
    addedBy: string, correlationId: string,
  ): Promise<RawAdjustment> {
    const { data, error } = await this.db
      .from('payroll_adjustments')
      .insert({
        payslip_id: payslipId, school_id: schoolId,
        adjustment_type: adjustmentType, label, amount,
        is_deduction: isDeduction, added_by: addedBy,
      })
      .select()
      .single()
    if (error) throw new DatabaseError(error.message, { correlationId })
    return data as RawAdjustment
  }

  async deleteAdjustment(adjustmentId: string, correlationId: string): Promise<void> {
    const { error } = await this.db.from('payroll_adjustments').delete().eq('id', adjustmentId)
    if (error) throw new DatabaseError(error.message, { correlationId })
  }

  async getTeachersWithSalary(schoolId: string, correlationId: string): Promise<{
    teacher: { id: string; full_name: string; employee_id: string | null; designation: string }
    salary: { bank_account_number: string | null; ifsc_code: string | null; bank_name: string | null } | null
  }[]> {
    this.logger.debug({ correlationId, schoolId }, 'PayrollRepository.getTeachersWithSalary')

    // Get teachers via teacher_school_assignments (where employee_id + designation live)
    const { data: assignments, error: aErr } = await this.supabase
      .from('teacher_school_assignments')
      .select('teacher_id, employee_id, designation, teachers!teacher_id(id, full_name, status, deleted_at)')
      .eq('school_id', schoolId)
      .eq('status', 'ACTIVE')

    if (aErr) throw new DatabaseError(aErr.message, { correlationId })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const active = ((assignments ?? []) as any[]).filter((a: any) =>
      a.teachers?.status === 'ACTIVE' && !a.teachers?.deleted_at
    )

    const teacherIds = active.map((a: { teacher_id: string }) => a.teacher_id)
    if (teacherIds.length === 0) return []

    const { data: salaries, error: sErr } = await this.supabase
      .from('salary_structures')
      .select('teacher_id, bank_account_number, ifsc_code, bank_name')
      .in('teacher_id', teacherIds)
      .is('effective_to', null)
      .order('effective_from', { ascending: false })
    if (sErr) throw new DatabaseError(sErr.message, { correlationId })

    const salaryMap = new Map<string, { bank_account_number: string | null; ifsc_code: string | null; bank_name: string | null }>()
    for (const s of salaries ?? []) {
      if (!salaryMap.has(s.teacher_id)) {
        salaryMap.set(s.teacher_id, {
          bank_account_number: s.bank_account_number ?? null,
          ifsc_code: s.ifsc_code ?? null,
          bank_name: s.bank_name ?? null,
        })
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return active.map((a: any) => ({
      teacher: {
        id: a.teacher_id as string,
        full_name: a.teachers.full_name as string,
        employee_id: a.employee_id as string | null,
        designation: a.designation as string,
      },
      salary: salaryMap.get(a.teacher_id) ?? null,
    }))
  }

  async listRuns(schoolId: string, correlationId: string): Promise<RawPayrollRun[]> {
    const { data, error } = await this.db
      .from('payroll_runs')
      .select('*')
      .eq('school_id', schoolId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
    if (error) throw new DatabaseError(error.message, { correlationId })
    return (data ?? []) as RawPayrollRun[]
  }

  async getTeacherSalaryStructure(teacherId: string, correlationId: string) {
    const { data, error } = await this.supabase
      .from('salary_structures')
      .select(
        'basic, hra_type, hra_value, da_type, da_value, transport_allowance, ' +
        'special_allowance, pf_applicable, esi_applicable, pt_applicable, ' +
        'bank_account_number, ifsc_code, bank_name',
      )
      .eq('teacher_id', teacherId)
      .is('effective_to', null)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new DatabaseError(error.message, { correlationId })
    return data
  }

  async getTeacherLopDays(schoolId: string, teacherId: string, month: number, year: number, correlationId: string): Promise<number> {
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data, error } = await this.supabase
      .from('leave_applications')
      .select('days_count')
      .eq('school_id', schoolId)
      .eq('teacher_id', teacherId)
      .eq('status', 'APPROVED')
      .eq('leave_type', 'LOP')
      .gte('from_date', from)
      .lte('to_date', to)
    if (error) throw new DatabaseError(error.message, { correlationId })
    return (data ?? []).reduce((sum, row) => sum + (row.days_count ?? 0), 0)
  }

  buildSummary(
    run: RawPayrollRun,
    payslips: RawPayslip[],
    allAdjustments: Map<string, RawAdjustment[]>,
    teacherMap: Map<string, { name: string; employee_id: string | null; designation: string }>,
    bankMap: Map<string, { account: string | null; ifsc: string | null; bank: string | null }>,
  ): PayrollSummary {
    const rows: PayslipRow[] = payslips.map(ps => {
      const t = teacherMap.get(ps.teacher_id)
      const b = bankMap.get(ps.teacher_id)
      const adjs: PayrollAdjustment[] = (allAdjustments.get(ps.id) ?? []).map(a => ({
        id: a.id, payslip_id: a.payslip_id,
        adjustment_type: a.adjustment_type as AdjustmentType,
        label: a.label, amount: a.amount,
        is_deduction: a.is_deduction, created_at: a.created_at,
      }))
      return {
        id: ps.id, payroll_run_id: ps.payroll_run_id, teacher_id: ps.teacher_id,
        teacher_name: t?.name ?? 'Unknown', employee_id: t?.employee_id ?? null,
        designation: t?.designation ?? '',
        basic: ps.basic, hra: ps.hra, da: ps.da,
        transport_allowance: ps.transport_allowance, special_allowance: ps.special_allowance,
        gross_salary: ps.gross_salary, working_days: ps.working_days,
        present_days: ps.present_days, lop_days: Number(ps.lop_days),
        pf_employee: ps.pf_employee, esi_employee: ps.esi_employee,
        professional_tax: ps.professional_tax, lop_deduction: ps.lop_deduction,
        adjustments: adjs, total_deductions: ps.total_deductions,
        net_salary: ps.net_salary, status: ps.status as 'GENERATED' | 'ON_HOLD' | 'PAID',
        payment_date: ps.payment_date, payment_reference: ps.payment_reference,
        bank_account_number: b?.account ?? null, ifsc_code: b?.ifsc ?? null, bank_name: b?.bank ?? null,
      }
    })

    return {
      id: run.id, school_id: run.school_id, academic_year_id: run.academic_year_id,
      month: run.month, year: run.year, month_label: MONTH_LABELS[run.month] ?? '',
      status: run.status as PayrollStatus,
      total_gross: run.total_gross, total_deductions: run.total_deductions,
      total_net: run.total_net, teacher_count: run.teacher_count,
      generated_at: run.generated_at, approved_at: run.approved_at,
      paid_at: run.paid_at, payslips: rows,
    }
  }
}
