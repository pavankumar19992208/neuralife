import jsPDF from 'jspdf'
import type { PayslipRow } from '@/types/common'

const RUPEE = '₹'
const MONTH_LABELS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

function fmt(n: number): string {
  return `${RUPEE}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function amountInWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function toWords(n: number): string {
    if (n === 0) return ''
    if (n < 20) return ones[n] + ' '
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '') + ' '
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + toWords(n % 100)
    if (n < 100000) return toWords(Math.floor(n / 1000)) + 'Thousand ' + toWords(n % 1000)
    if (n < 10000000) return toWords(Math.floor(n / 100000)) + 'Lakh ' + toWords(n % 100000)
    return toWords(Math.floor(n / 10000000)) + 'Crore ' + toWords(n % 10000000)
  }

  const whole = Math.floor(amount)
  const paise = Math.round((amount - whole) * 100)
  let words = toWords(whole).trim() + ' Rupees'
  if (paise > 0) words += ' and ' + toWords(paise).trim() + ' Paise'
  return words + ' Only'
}

export function generatePayslipPDF(
  payslip: PayslipRow,
  schoolName: string,
  schoolAddress: string,
  month: number,
  year: number,
): void {
  const doc = new jsPDF({ format: 'a4', orientation: 'portrait', unit: 'mm' })
  const W = 210; const H = 297
  const ml = 15; const mr = W - 15
  let y = 15

  // ─── Header ──────────────────────────────────────────────────────────────
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, W, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14).setFont('helvetica', 'bold')
  doc.text(schoolName, ml, 10)
  doc.setFontSize(8).setFont('helvetica', 'normal')
  doc.text(schoolAddress, ml, 16)

  doc.setFontSize(11).setFont('helvetica', 'bold')
  doc.text('PAY SLIP', mr - 22, 10)
  doc.setFontSize(8).setFont('helvetica', 'normal')
  doc.text(`${MONTH_LABELS[month]} ${year}`, mr - 22, 16)

  y = 30
  doc.setTextColor(15, 23, 42)

  // ─── Employee Details box ────────────────────────────────────────────────
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(ml, y, W - 30, 28, 2, 2, 'F')
  doc.setFontSize(8).setFont('helvetica', 'bold')
  const col2 = ml + 90

  doc.text('Employee Name', ml + 4, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.text(payslip.teacher_name, ml + 4, y + 13)

  doc.setFont('helvetica', 'bold')
  doc.text('Employee ID', ml + 4, y + 20)
  doc.setFont('helvetica', 'normal')
  doc.text(payslip.employee_id ?? '—', ml + 4, y + 26)

  doc.setFont('helvetica', 'bold')
  doc.text('Designation', col2, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.text(payslip.designation, col2, y + 13)

  doc.setFont('helvetica', 'bold')
  doc.text('Days Present / Working', col2, y + 20)
  doc.setFont('helvetica', 'normal')
  doc.text(`${payslip.present_days} / ${payslip.working_days}`, col2, y + 26)

  y += 34

  // ─── Earnings & Deductions table ─────────────────────────────────────────
  const tableW = (W - 30) / 2 - 2
  const colE = ml; const colD = ml + tableW + 4
  const rowH = 7; const headY = y

  // Table headers
  doc.setFillColor(30, 64, 175)
  doc.rect(colE, headY, tableW, 8, 'F')
  doc.rect(colD, headY, tableW, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8).setFont('helvetica', 'bold')
  doc.text('EARNINGS', colE + 3, headY + 5.5)
  doc.text('DEDUCTIONS', colD + 3, headY + 5.5)

  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'normal')

  const earnings = [
    ['Basic Salary', payslip.basic],
    ['HRA', payslip.hra],
    ['DA', payslip.da],
    ['Transport Allowance', payslip.transport_allowance],
    ['Special Allowance', payslip.special_allowance],
    ...payslip.adjustments.filter(a => !a.is_deduction).map(a => [a.label, a.amount] as [string, number]),
  ] as [string, number][]

  const deductions = [
    ['PF (Employee 12%)', payslip.pf_employee],
    ['ESI (Employee 0.75%)', payslip.esi_employee],
    ['Professional Tax', payslip.professional_tax],
    ['LOP Deduction', payslip.lop_deduction],
    ...payslip.adjustments.filter(a => a.is_deduction).map(a => [a.label, a.amount] as [string, number]),
  ] as [string, number][]

  const maxRows = Math.max(earnings.length, deductions.length)

  for (let i = 0; i < maxRows; i++) {
    const rowY = headY + 8 + i * rowH
    const bg = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255]
    doc.setFillColor(bg[0], bg[1], bg[2])
    doc.rect(colE, rowY, tableW, rowH, 'F')
    doc.rect(colD, rowY, tableW, rowH, 'F')

    if (earnings[i]) {
      doc.setFontSize(7.5).setFont('helvetica', 'normal')
      doc.text(earnings[i][0], colE + 3, rowY + 4.8)
      doc.text(fmt(earnings[i][1] as number), colE + tableW - 3, rowY + 4.8, { align: 'right' })
    }
    if (deductions[i]) {
      doc.text(deductions[i][0], colD + 3, rowY + 4.8)
      doc.text(fmt(deductions[i][1] as number), colD + tableW - 3, rowY + 4.8, { align: 'right' })
    }
  }

  // Totals row
  const totY = headY + 8 + maxRows * rowH
  doc.setFillColor(226, 232, 240)
  doc.rect(colE, totY, tableW, 8, 'F')
  doc.rect(colD, totY, tableW, 8, 'F')
  doc.setFont('helvetica', 'bold').setFontSize(8)
  doc.text('Gross Earnings', colE + 3, totY + 5.5)
  doc.text(fmt(payslip.gross_salary), colE + tableW - 3, totY + 5.5, { align: 'right' })
  doc.text('Total Deductions', colD + 3, totY + 5.5)
  doc.text(fmt(payslip.total_deductions), colD + tableW - 3, totY + 5.5, { align: 'right' })

  y = totY + 14

  // ─── Net Pay box ──────────────────────────────────────────────────────────
  doc.setFillColor(30, 64, 175)
  doc.roundedRect(ml, y, W - 30, 18, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11).setFont('helvetica', 'bold')
  doc.text('NET PAY', ml + 5, y + 11)
  doc.setFontSize(13)
  doc.text(fmt(payslip.net_salary), mr - 5, y + 11, { align: 'right' })

  y += 24
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(8).setFont('helvetica', 'italic')
  doc.text(`In Words: ${amountInWords(payslip.net_salary)}`, ml, y)

  y += 10
  doc.setFont('helvetica', 'normal').setFontSize(7.5)
  if (payslip.bank_account_number) {
    doc.text(`Bank: ${payslip.bank_name ?? ''}  |  A/C: ${payslip.bank_account_number}  |  IFSC: ${payslip.ifsc_code ?? ''}`, ml, y)
    y += 5
  }

  // ─── Footer ───────────────────────────────────────────────────────────────
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7).setFont('helvetica', 'italic')
  doc.text('This is a computer-generated payslip and does not require a signature.', ml, H - 10)
  doc.text(`Generated by NeuraLife  ·  ${new Date().toLocaleDateString('en-IN')}`, mr, H - 10, { align: 'right' })

  doc.save(`Payslip_${payslip.teacher_name.replace(/\s+/g, '_')}_${MONTH_LABELS[month]}_${year}.pdf`)
}

export function buildNEFTCSV(
  rows: Array<{ teacher_name: string; account_number: string; ifsc_code: string; bank_name: string; net_salary: number; remarks: string }>,
  monthLabel: string,
  year: number,
): void {
  const header = 'Teacher Name,Account Number,IFSC Code,Bank Name,Net Salary,Remarks'
  const dataRows = rows.map(r =>
    `"${r.teacher_name}","${r.account_number}","${r.ifsc_code}","${r.bank_name}",${r.net_salary.toFixed(2)},"${r.remarks}"`
  )
  const total = rows.reduce((s, r) => s + r.net_salary, 0)
  dataRows.push(`"TOTAL","","","",${total.toFixed(2)},"${rows.length} teachers"`)

  const csv = [header, ...dataRows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `NEFT_${monthLabel}_${year}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
