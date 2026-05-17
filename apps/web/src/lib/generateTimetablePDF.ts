import jsPDF from 'jspdf'
import JSZip from 'jszip'
import type { TimetableSlotEntry } from '@/types/common'

const DAYS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const DAYS_FULL: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday',
  THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday',
}

const SUBJECT_COLORS: Record<string, [number, number, number]> = {
  MATHEMATICS:        [30,  64, 175],
  ENGLISH:            [5,  150, 105],
  TELUGU:             [220,  38,  38],
  HINDI:              [124,  58, 237],
  PHYSICAL_SCIENCE:   [217, 119,   6],
  BIOLOGICAL_SCIENCE: [20,  184, 166],
  SOCIAL_STUDIES:     [234,  88,  12],
  PT:                 [16,  185, 129],
  COMPUTER_LAB:       [14,  165, 233],
  LIBRARY:            [139,  92, 246],
  DRAWING:            [249, 115,  22],
  BREAK:              [226, 232, 240],
  LUNCH:              [226, 232, 240],
  ASSEMBLY:           [254, 243, 199],
}

function subjectColor(subject: string): [number, number, number] {
  const key = subject.replace(/_PART2$/, '').toUpperCase()
  return SUBJECT_COLORS[key] ?? [100, 116, 139]
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export async function generateSingleClassPDF(
  classYear: number,
  section: string,
  entries: TimetableSlotEntry[],
  schoolName = 'NeuraLife School',
): Promise<ArrayBuffer> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = 297
  const H = 210

  const workingDays = DAYS_SHORT.filter(d => entries.some(e => e.day_of_week === d))
  const allPeriods = Array.from(new Set(
    entries.filter(e => !['BREAK', 'LUNCH'].includes(e.subject_type)).map(e => e.period_number)
  )).sort((a, b) => a - b)

  const margins = { top: 28, left: 10, right: 10 }
  const tableTop = margins.top
  const tableLeft = margins.left
  const tableW = W - margins.left - margins.right

  const dayColW = 18
  const periodColW = (tableW - dayColW) / allPeriods.length
  const rowH = (H - tableTop - 10) / (workingDays.length + 1)

  // Header
  pdf.setFillColor(30, 64, 175)
  pdf.rect(0, 0, W, 18, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`${schoolName}`, 10, 7)
  pdf.setFontSize(11)
  pdf.text(`Class ${classYear} - ${section} Timetable`, 10, 13)
  pdf.setFontSize(9)
  pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, W - 10, 13, { align: 'right' })

  // Column headers (period numbers + times)
  pdf.setFillColor(241, 245, 249)
  pdf.rect(tableLeft, tableTop, tableW, rowH, 'F')
  pdf.setTextColor(15, 23, 42)
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Day', tableLeft + dayColW / 2, tableTop + rowH / 2 + 1, { align: 'center' })

  allPeriods.forEach((p, i) => {
    const x = tableLeft + dayColW + i * periodColW
    const firstEntry = entries.find(e => e.period_number === p && !['BREAK','LUNCH'].includes(e.subject_type))
    pdf.text(`P${p}`, x + periodColW / 2, tableTop + rowH / 2 - 1, { align: 'center' })
    if (firstEntry) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(6)
      pdf.text(
        `${formatTime(firstEntry.start_time)}–${formatTime(firstEntry.end_time)}`,
        x + periodColW / 2, tableTop + rowH / 2 + 3, { align: 'center' }
      )
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7)
    }
  })

  // Grid
  pdf.setDrawColor(226, 232, 240)
  pdf.setLineWidth(0.3)

  workingDays.forEach((day, di) => {
    const rowY = tableTop + rowH * (di + 1)
    const isAlt = di % 2 === 1
    if (isAlt) {
      pdf.setFillColor(248, 250, 252)
      pdf.rect(tableLeft, rowY, tableW, rowH, 'F')
    }

    pdf.setTextColor(71, 85, 105)
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'bold')
    pdf.text(DAYS_FULL[day]?.slice(0, 3) ?? day, tableLeft + dayColW / 2, rowY + rowH / 2 + 1, { align: 'center' })

    allPeriods.forEach((p, i) => {
      const x = tableLeft + dayColW + i * periodColW
      const entry = entries.find(e => e.day_of_week === day && e.period_number === p)
      if (!entry) return

      const isBreak = ['BREAK', 'LUNCH', 'ASSEMBLY'].includes(entry.subject_type)
      const [r, g, b] = subjectColor(entry.subject)
      const isPart2 = entry.subject.endsWith('_PART2')

      if (isBreak) {
        pdf.setFillColor(241, 245, 249)
        pdf.rect(x + 0.5, rowY + 0.5, periodColW - 1, rowH - 1, 'F')
        pdf.setTextColor(100, 116, 139)
        pdf.setFontSize(6)
        pdf.setFont('helvetica', 'italic')
        pdf.text(entry.subject, x + periodColW / 2, rowY + rowH / 2 + 1, { align: 'center' })
      } else if (!isPart2) {
        pdf.setFillColor(r, g, b)
        pdf.setGState(new (pdf as any).GState({ opacity: 0.15 }))
        pdf.rect(x + 0.5, rowY + 0.5, periodColW - 1, rowH - 1, 'F')
        pdf.setGState(new (pdf as any).GState({ opacity: 1 }))

        pdf.setTextColor(r, g, b)
        pdf.setFontSize(6.5)
        pdf.setFont('helvetica', 'bold')
        const label = entry.subject.replace(/_/g, ' ')
        pdf.text(label, x + periodColW / 2, rowY + rowH / 2 - 1, { align: 'center', maxWidth: periodColW - 2 })
        if (entry.teacher_name) {
          pdf.setFontSize(5.5)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(71, 85, 105)
          pdf.text(entry.teacher_name, x + periodColW / 2, rowY + rowH / 2 + 3, { align: 'center', maxWidth: periodColW - 2 })
        }
      }
    })
  })

  // Draw grid lines
  pdf.setDrawColor(226, 232, 240)
  pdf.setLineWidth(0.3)
  for (let r = 0; r <= workingDays.length + 1; r++) {
    pdf.line(tableLeft, tableTop + r * rowH, tableLeft + tableW, tableTop + r * rowH)
  }
  for (let c = 0; c <= allPeriods.length + 1; c++) {
    const x = c === 0 ? tableLeft : c === 1 ? tableLeft + dayColW : tableLeft + dayColW + (c - 1) * periodColW
    pdf.line(x, tableTop, x, tableTop + rowH * (workingDays.length + 1))
  }

  return pdf.output('arraybuffer') as ArrayBuffer
}

export async function downloadAllClassesPDF(
  classSections: Array<{ class_year: number; section: string }>,
  allEntries: Record<string, TimetableSlotEntry[]>,
  schoolName?: string,
): Promise<void> {
  if (classSections.length === 1) {
    const { class_year, section } = classSections[0]
    const key = `${class_year}-${section}`
    const buf = await generateSingleClassPDF(class_year, section, allEntries[key] ?? [], schoolName)
    const blob = new Blob([buf], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Timetable_Class${class_year}${section}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    return
  }

  const zip = new JSZip()
  const folder = zip.folder('Timetables')!
  await Promise.all(
    classSections.map(async ({ class_year, section }) => {
      const key = `${class_year}-${section}`
      const buf = await generateSingleClassPDF(class_year, section, allEntries[key] ?? [], schoolName)
      folder.file(`Class${class_year}-${section}.pdf`, buf)
    })
  )
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'NeuraLife_Timetables.zip'
  a.click()
  URL.revokeObjectURL(url)
}
