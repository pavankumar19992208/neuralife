import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import { DatabaseError, NotFoundError } from '../utils/errors.js'
import type {
  FeeStructureItem,
  FeeLedgerItem,
  StudentFeeBalance,
  FeeCollectionSummary,
  FeeAnalyticsData,
  FeeAnalyticsTrend,
  FeeHeadBreakdown,
  FeeClassBreakdown,
  UnpaidStudentItem,
  FeeStructureRow,
} from '../types/common.js'

function todayIST(): string {
  const now = new Date()
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0]
}

function computeOverallStatus(
  items: FeeLedgerItem[],
): 'PAID' | 'PARTIAL' | 'OVERDUE' | 'PENDING' {
  if (items.length === 0) return 'PENDING'
  const statuses = new Set(items.map((i) => i.status))
  if (statuses.has('OVERDUE')) return 'OVERDUE'
  if (statuses.has('PARTIAL')) return 'PARTIAL'
  if (statuses.has('PENDING')) return 'PENDING'
  return 'PAID'
}

export class FeeRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async getFeeStructure(
    schoolId: string,
    academicYearId: string,
    correlationId: string,
  ): Promise<FeeStructureItem[]> {
    this.logger.debug({ correlationId, schoolId }, 'FeeRepository.getFeeStructure')

    const { data, error } = await this.supabase
      .from('fee_structures')
      .select(
        `class_year, student_category,
         admission_fee, development_fee, tuition_fee_monthly,
         neuralife_sub_monthly, exam_fee_per_term, transport_fee_monthly,
         smartpad_fee, late_fee_amount, late_fee_grace_days, fee_due_day_of_month`,
      )
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .order('class_year')

    if (error) throw new DatabaseError(error.message, { correlationId })

    return (data ?? []).map((r) => ({
      class_year: r.class_year,
      student_category: r.student_category,
      admission_fee: r.admission_fee ?? 0,
      development_fee: r.development_fee ?? 0,
      tuition_fee_monthly: r.tuition_fee_monthly ?? 0,
      neuralife_sub_monthly: r.neuralife_sub_monthly ?? 0,
      exam_fee_per_term: r.exam_fee_per_term ?? 0,
      transport_fee_monthly: r.transport_fee_monthly ?? 0,
      smartpad_fee: r.smartpad_fee ?? 0,
      late_fee_amount: r.late_fee_amount ?? 0,
      late_fee_grace_days: r.late_fee_grace_days ?? 5,
      fee_due_day_of_month: r.fee_due_day_of_month ?? 1,
    }))
  }

  async getStudentFeeBalance(
    neuraId: string,
    schoolId: string,
    academicYearId: string,
    correlationId: string,
  ): Promise<StudentFeeBalance> {
    this.logger.debug({ correlationId, neuraId }, 'FeeRepository.getStudentFeeBalance')

    const [studentResult, ledgerResult] = await Promise.all([
      this.supabase
        .from('student_yearly_progress')
        .select('class_year, section, students!student_yearly_progress_neura_id_fkey(full_name)')
        .eq('neura_id', neuraId)
        .eq('school_id', schoolId)
        .eq('academic_year_id', academicYearId)
        .single(),

      this.supabase
        .from('fee_ledger')
        .select('id, fee_head, period_label, amount_due, amount_paid, amount_waived, due_date, status')
        .eq('neura_id', neuraId)
        .eq('school_id', schoolId)
        .eq('academic_year_id', academicYearId)
        .order('due_date'),
    ])

    if (studentResult.error || !studentResult.data) {
      throw new NotFoundError('Student not found in this school', { neuraId })
    }

    const syp = studentResult.data
    const studentArr = syp.students as unknown as Array<{ full_name: string }> | null
    const fullName =
      Array.isArray(studentArr) && studentArr.length > 0 ? studentArr[0].full_name : neuraId

    if (ledgerResult.error) throw new DatabaseError(ledgerResult.error.message, { correlationId })

    const ledger: FeeLedgerItem[] = (ledgerResult.data ?? []).map((r) => {
      const amountPaid = r.amount_paid ?? 0
      const amountWaived = r.amount_waived ?? 0
      const balance = Math.max(0, r.amount_due - amountPaid - amountWaived)
      return {
        id: r.id,
        fee_head: r.fee_head,
        period_label: r.period_label ?? null,
        amount_due: r.amount_due,
        amount_paid: amountPaid,
        amount_waived: amountWaived,
        balance,
        due_date: r.due_date,
        status: r.status as FeeLedgerItem['status'],
      }
    })

    const totalDue = ledger.reduce((s, i) => s + i.amount_due, 0)
    const totalPaid = ledger.reduce((s, i) => s + i.amount_paid, 0)
    const totalBalance = Math.max(0, totalDue - totalPaid - ledger.reduce((s, i) => s + i.amount_waived, 0))

    return {
      neura_id: neuraId,
      full_name: fullName,
      class_year: syp.class_year,
      section: syp.section,
      total_due: totalDue,
      total_paid: totalPaid,
      total_balance: totalBalance,
      status: computeOverallStatus(ledger),
      ledger,
    }
  }

  async getCollectionSummary(
    schoolId: string,
    academicYearId: string,
    correlationId: string,
  ): Promise<FeeCollectionSummary> {
    this.logger.debug({ correlationId, schoolId }, 'FeeRepository.getCollectionSummary')

    const currentMonthLabel = todayIST().slice(0, 7)

    const [ledgerResult, paymentsResult] = await Promise.all([
      this.supabase
        .from('fee_ledger')
        .select('neura_id, amount_due, amount_paid, status')
        .eq('school_id', schoolId)
        .eq('academic_year_id', academicYearId)
        .eq('period_label', currentMonthLabel),

      this.supabase
        .from('fee_payments')
        .select(
          `receipt_number, total_amount, payment_date, payment_mode,
           students!fee_payments_neura_id_fkey(full_name)`,
        )
        .eq('school_id', schoolId)
        .eq('voided', false)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    if (ledgerResult.error) throw new DatabaseError(ledgerResult.error.message, { correlationId })
    if (paymentsResult.error) throw new DatabaseError(paymentsResult.error.message, { correlationId })

    const rows = ledgerResult.data ?? []

    // Aggregate per student (a student may have multiple fee heads)
    const byStudent = new Map<string, { paid: boolean; partial: boolean; overdue: boolean; pending: boolean }>()
    let totalDue = 0
    let totalCollected = 0

    for (const r of rows) {
      totalDue += r.amount_due
      totalCollected += r.amount_paid ?? 0

      if (!byStudent.has(r.neura_id)) {
        byStudent.set(r.neura_id, { paid: false, partial: false, overdue: false, pending: false })
      }
      const s = byStudent.get(r.neura_id)!
      const status = r.status as string
      if (status === 'PAID') s.paid = true
      else if (status === 'PARTIAL') s.partial = true
      else if (status === 'OVERDUE') s.overdue = true
      else s.pending = true
    }

    // Count distinct students per category (a student is OVERDUE if any item is OVERDUE)
    let paidCount = 0, partialCount = 0, overdueCount = 0, pendingCount = 0
    for (const s of byStudent.values()) {
      if (s.overdue) overdueCount++
      else if (s.partial) partialCount++
      else if (s.pending) pendingCount++
      else if (s.paid) paidCount++
    }

    const totalStudents = byStudent.size
    const collectionRate = totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0

    const recentPayments = (paymentsResult.data ?? []).map((p) => {
      const stuArr = p.students as unknown as Array<{ full_name: string }> | null
      return {
        receipt_number: p.receipt_number,
        student_name: Array.isArray(stuArr) && stuArr.length > 0 ? stuArr[0].full_name : '',
        amount: p.total_amount,
        payment_date: p.payment_date,
        payment_mode: p.payment_mode,
      }
    })

    return {
      current_month_label: currentMonthLabel,
      total_students: totalStudents,
      total_due_month: totalDue,
      total_collected_month: totalCollected,
      collection_rate: collectionRate,
      paid_count: paidCount,
      partial_count: partialCount,
      overdue_count: overdueCount,
      pending_count: pendingCount,
      recent_payments: recentPayments,
    }
  }

  async getUnpaidLedgerItems(
    neuraId: string,
    schoolId: string,
    academicYearId: string,
    correlationId: string,
  ): Promise<Array<{ id: string; amount_due: number; amount_paid: number; due_date: string }>> {
    this.logger.debug({ correlationId, neuraId }, 'FeeRepository.getUnpaidLedgerItems')

    const { data, error } = await this.supabase
      .from('fee_ledger')
      .select('id, amount_due, amount_paid, due_date')
      .eq('neura_id', neuraId)
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .in('status', ['PENDING', 'PARTIAL', 'OVERDUE'])
      .order('due_date')

    if (error) throw new DatabaseError(error.message, { correlationId })

    return (data ?? []).map((r) => ({
      id: r.id,
      amount_due: r.amount_due,
      amount_paid: r.amount_paid ?? 0,
      due_date: r.due_date,
    }))
  }

  async updateLedgerAfterPayment(
    ledgerId: string,
    additionalPaid: number,
    correlationId: string,
  ): Promise<void> {
    // Fetch current values
    const { data: current, error: fetchErr } = await this.supabase
      .from('fee_ledger')
      .select('amount_due, amount_paid, amount_waived')
      .eq('id', ledgerId)
      .single()

    if (fetchErr || !current) throw new DatabaseError('Ledger item not found', { ledgerId, correlationId })

    const newPaid = (current.amount_paid ?? 0) + additionalPaid
    const newStatus: Database['public']['Enums']['fee_status'] =
      newPaid >= current.amount_due ? 'PAID' : 'PARTIAL'

    const { error } = await this.supabase
      .from('fee_ledger')
      .update({ amount_paid: newPaid, status: newStatus })
      .eq('id', ledgerId)

    if (error) throw new DatabaseError(error.message, { correlationId, ledgerId })
  }

  async reverseLedgerPayment(
    ledgerId: string,
    amountToReverse: number,
    correlationId: string,
  ): Promise<void> {
    const { data: current, error: fetchErr } = await this.supabase
      .from('fee_ledger')
      .select('amount_due, amount_paid, amount_waived')
      .eq('id', ledgerId)
      .single()

    if (fetchErr || !current) throw new DatabaseError('Ledger item not found', { ledgerId, correlationId })

    const newPaid = Math.max(0, (current.amount_paid ?? 0) - amountToReverse)
    const newStatus: Database['public']['Enums']['fee_status'] =
      newPaid === 0 ? 'PENDING' : newPaid < current.amount_due ? 'PARTIAL' : 'PAID'

    const { error } = await this.supabase
      .from('fee_ledger')
      .update({ amount_paid: newPaid, status: newStatus })
      .eq('id', ledgerId)

    if (error) throw new DatabaseError(error.message, { correlationId, ledgerId })
  }

  async getAnalytics(
    schoolId: string,
    academicYearId: string,
    correlationId: string,
  ): Promise<FeeAnalyticsData> {
    this.logger.debug({ correlationId, schoolId }, 'FeeRepository.getAnalytics')

    const [ledgerResult, yearResult] = await Promise.all([
      this.supabase
        .from('fee_ledger')
        .select('fee_head, period_label, amount_due, amount_paid, amount_waived, status, neura_id')
        .eq('school_id', schoolId)
        .eq('academic_year_id', academicYearId),

      this.supabase
        .from('academic_years')
        .select('year_label')
        .eq('id', academicYearId)
        .single(),
    ])

    if (ledgerResult.error) throw new DatabaseError(ledgerResult.error.message, { correlationId })

    const rows = ledgerResult.data ?? []
    const yearLabel = yearResult.data?.year_label ?? academicYearId

    // Totals
    let totalDueYear = 0
    let totalCollectedYear = 0
    let totalWaivedYear = 0
    let overdueAmount = 0

    // Monthly trend map: period_label → { due, collected }
    const monthMap = new Map<string, { due: number; collected: number }>()
    // Fee head map
    const headMap = new Map<string, { due: number; collected: number }>()

    for (const r of rows) {
      const due = r.amount_due ?? 0
      const paid = r.amount_paid ?? 0
      const waived = r.amount_waived ?? 0

      totalDueYear += due
      totalCollectedYear += paid
      totalWaivedYear += waived

      if (r.status === 'OVERDUE' || r.status === 'PARTIAL') {
        overdueAmount += Math.max(0, due - paid - waived)
      }

      // Monthly trend — only monthly period labels (YYYY-MM format)
      const pl = r.period_label ?? ''
      if (/^\d{4}-\d{2}$/.test(pl)) {
        if (!monthMap.has(pl)) monthMap.set(pl, { due: 0, collected: 0 })
        const m = monthMap.get(pl)!
        m.due += due
        m.collected += paid
      }

      // Fee head breakdown
      const head = r.fee_head ?? 'OTHER'
      if (!headMap.has(head)) headMap.set(head, { due: 0, collected: 0 })
      const h = headMap.get(head)!
      h.due += due
      h.collected += paid
    }

    // Build monthly trend sorted by month
    const monthly_trend: FeeAnalyticsTrend[] = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, v]) => ({
        month_label: label,
        due: v.due,
        collected: v.collected,
        rate: v.due > 0 ? Math.round((v.collected / v.due) * 100) : 0,
      }))

    // Fee head breakdown
    const by_fee_head: FeeHeadBreakdown[] = [...headMap.entries()].map(([head, v]) => ({
      fee_head: head,
      due: v.due,
      collected: v.collected,
      rate: v.due > 0 ? Math.round((v.collected / v.due) * 100) : 0,
    }))

    // Class breakdown via student_yearly_progress join
    const { data: sypRows, error: sypErr } = await this.supabase
      .from('student_yearly_progress')
      .select('neura_id, class_year, section')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)

    if (sypErr) throw new DatabaseError(sypErr.message, { correlationId })

    // Map neura_id → { class_year, section }
    const studentClassMap = new Map<string, { class_year: number; section: string }>()
    for (const s of sypRows ?? []) {
      studentClassMap.set(s.neura_id, { class_year: s.class_year, section: s.section })
    }

    // Aggregate per class
    const classMap = new Map<
      string,
      { class_year: number; section: string; students: Set<string>; paid_students: Set<string>; overdue_students: Set<string>; due: number; collected: number }
    >()

    for (const r of rows) {
      const cls = studentClassMap.get(r.neura_id)
      if (!cls) continue
      const key = `${cls.class_year}-${cls.section}`
      if (!classMap.has(key)) {
        classMap.set(key, {
          class_year: cls.class_year,
          section: cls.section,
          students: new Set(),
          paid_students: new Set(),
          overdue_students: new Set(),
          due: 0,
          collected: 0,
        })
      }
      const c = classMap.get(key)!
      c.students.add(r.neura_id)
      c.due += r.amount_due ?? 0
      c.collected += r.amount_paid ?? 0
      if (r.status === 'PAID') c.paid_students.add(r.neura_id)
      if (r.status === 'OVERDUE') c.overdue_students.add(r.neura_id)
    }

    const by_class: FeeClassBreakdown[] = [...classMap.values()]
      .sort((a, b) => a.class_year - b.class_year || a.section.localeCompare(b.section))
      .map((c) => ({
        class_year: c.class_year,
        section: c.section,
        total_students: c.students.size,
        paid_count: c.paid_students.size,
        overdue_count: c.overdue_students.size,
        due: c.due,
        collected: c.collected,
        rate: c.due > 0 ? Math.round((c.collected / c.due) * 100) : 0,
      }))

    return {
      year_label: yearLabel,
      total_due_year: totalDueYear,
      total_collected_year: totalCollectedYear,
      total_waived_year: totalWaivedYear,
      collection_rate_year: totalDueYear > 0 ? Math.round((totalCollectedYear / totalDueYear) * 100) : 0,
      overdue_amount: overdueAmount,
      monthly_trend,
      by_fee_head,
      by_class,
    }
  }

  async getUnpaidStudents(
    schoolId: string,
    academicYearId: string,
    page: number,
    limit: number,
    correlationId: string,
  ): Promise<{ items: UnpaidStudentItem[]; total: number }> {
    this.logger.debug({ correlationId, schoolId, page, limit }, 'FeeRepository.getUnpaidStudents')

    const { data: ledgerRows, error: ledgerErr } = await this.supabase
      .from('fee_ledger')
      .select('neura_id, fee_head, period_label, amount_due, amount_paid, amount_waived, due_date, status')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .in('status', ['PENDING', 'PARTIAL', 'OVERDUE'])

    if (ledgerErr) throw new DatabaseError(ledgerErr.message, { correlationId })

    const { data: sypRows, error: sypErr } = await this.supabase
      .from('student_yearly_progress')
      .select('neura_id, class_year, section, students!student_yearly_progress_neura_id_fkey(full_name)')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)

    if (sypErr) throw new DatabaseError(sypErr.message, { correlationId })

    // Map neura_id → student info
    type SypRow = { neura_id: string; class_year: number; section: string; students: unknown }
    const studentMap = new Map<string, { full_name: string; class_year: number; section: string }>()
    for (const s of (sypRows ?? []) as SypRow[]) {
      const stuArr = s.students as Array<{ full_name: string }> | null
      const fullName = Array.isArray(stuArr) && stuArr.length > 0 ? stuArr[0].full_name : s.neura_id
      studentMap.set(s.neura_id, { full_name: fullName, class_year: s.class_year, section: s.section })
    }

    // Group ledger rows by neura_id
    const grouped = new Map<string, typeof ledgerRows>()
    for (const r of ledgerRows ?? []) {
      if (!grouped.has(r.neura_id)) grouped.set(r.neura_id, [])
      grouped.get(r.neura_id)!.push(r)
    }

    // Current period label (YYYY-MM)
    const currentPeriod = todayIST().slice(0, 7)

    // Build items
    const allItems: UnpaidStudentItem[] = []

    for (const [neuraId, items] of grouped.entries()) {
      const student = studentMap.get(neuraId)
      if (!student) continue

      const totalOutstanding = items.reduce((s, i) => s + Math.max(0, i.amount_due - (i.amount_paid ?? 0) - (i.amount_waived ?? 0)), 0)
      const periodLabels = new Set(items.filter((i) => i.period_label).map((i) => i.period_label!))
      const periodsOverdue = periodLabels.size

      const dueDates = items.map((i) => i.due_date).filter(Boolean).sort()
      const oldestDueDate = dueDates[0] ?? todayIST()

      // Current period paid pct
      const currentItems = items.filter((i) => i.period_label === currentPeriod)
      let currentPeriodPaidPct = 0
      if (currentItems.length > 0) {
        const totalDueCurrent = currentItems.reduce((s, i) => s + i.amount_due, 0)
        const totalPaidCurrent = currentItems.reduce((s, i) => s + (i.amount_paid ?? 0), 0)
        currentPeriodPaidPct = totalDueCurrent > 0 ? Math.round((totalPaidCurrent / totalDueCurrent) * 100) : 0
      }

      const feeHeadsUnpaid = [...new Set(items.map((i) => i.fee_head))]

      allItems.push({
        neura_id: neuraId,
        full_name: student.full_name,
        class_year: student.class_year,
        section: student.section,
        periods_overdue: periodsOverdue,
        oldest_due_date: oldestDueDate,
        total_outstanding: totalOutstanding,
        current_period_paid_pct: currentPeriodPaidPct,
        fee_heads_unpaid: feeHeadsUnpaid,
      })
    }

    // Sort by total_outstanding DESC
    allItems.sort((a, b) => b.total_outstanding - a.total_outstanding)

    const total = allItems.length
    const offset = (page - 1) * limit
    const items = allItems.slice(offset, offset + limit)

    return { items, total }
  }

  async updateFeeStructure(
    schoolId: string,
    academicYearId: string,
    rows: FeeStructureRow[],
    correlationId: string,
  ): Promise<void> {
    this.logger.debug({ correlationId, schoolId, rowCount: rows.length }, 'FeeRepository.updateFeeStructure')

    for (const row of rows) {
      const { error } = await this.supabase
        .from('fee_structures')
        .upsert(
          {
            school_id: schoolId,
            academic_year_id: academicYearId,
            class_year: row.class_year,
            student_category: row.student_category as Database['public']['Enums']['fee_category'],
            admission_fee: row.admission_fee,
            development_fee: row.development_fee,
            tuition_fee_monthly: row.tuition_fee_monthly,
            neuralife_sub_monthly: row.neuralife_sub_monthly,
            exam_fee_per_term: row.exam_fee_per_term,
            transport_fee_monthly: row.transport_fee_monthly,
            smartpad_fee: row.smartpad_fee,
            late_fee_amount: row.late_fee_amount,
            late_fee_grace_days: row.late_fee_grace_days,
            fee_due_day_of_month: row.fee_due_day_of_month,
          },
          { onConflict: 'school_id,academic_year_id,class_year,student_category' },
        )

      if (error) throw new DatabaseError(error.message, { correlationId, row })
    }
  }
}
