import { useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import EmptyState from '@/components/feedback/EmptyState'
import PageLayout from '@/components/layout/PageLayout'
import { useReportCard } from '@/hooks/useExams'
import type { ExamResultSubject } from '@/types/common'

const GRADE_COLORS: Record<string, string> = {
  'A+': '#10b981', A: '#0d9488', B: '#1e40af', C: '#6366f1', D: '#f59e0b', F: '#ef4444',
}

export default function ReportCardPage() {
  const { examId, neuraId } = useParams<{ examId: string; neuraId: string }>()
  const navigate = useNavigate()
  const printRef = useRef<HTMLDivElement>(null)

  const { data: card, isLoading, isError } = useReportCard(examId, neuraId)

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <PageLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </PageLayout>
    )
  }

  if (isError || !card) {
    return (
      <PageLayout>
        <EmptyState
          icon={<AlertCircle className="h-8 w-8 text-danger" />}
          title="Could not load report card"
          action={<Button onClick={() => navigate(`/exams/${examId}`)}>Back</Button>}
        />
      </PageLayout>
    )
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-card-print, #report-card-print * { visibility: visible; }
          #report-card-print { position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <PageLayout>
        {/* Action bar — not printed */}
        <div className="no-print mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/exams/${examId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Report Card</h1>
            <p className="text-sm text-text-secondary">{card.student.full_name} · {card.exam.name}</p>
          </div>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print / Download PDF
          </Button>
        </div>

        {/* The printable card */}
        <div id="report-card-print" ref={printRef}>
          <ReportCardPrint card={card} />
        </div>
      </PageLayout>
    </>
  )
}

function ReportCardPrint({ card }: { card: NonNullable<ReturnType<typeof useReportCard>['data']> }) {
  const passColor = card.totals.is_pass ? '#10b981' : '#ef4444'

  return (
    <div
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '24px',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        backgroundColor: '#fff',
      }}
    >
      {/* School header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
            {card.school.name}
          </h2>
          {card.school.address && (
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>{card.school.address}</p>
          )}
          {card.school.district && (
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>{card.school.district}</p>
          )}
          {card.school.board && (
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>Board: {card.school.board}</p>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Powered by</p>
          <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 700, color: '#1e40af' }}>NeuraLife</p>
        </div>
      </div>

      {/* Title bar */}
      <div
        style={{
          background: '#1e40af',
          color: '#fff',
          padding: '10px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>PROGRESS REPORT CARD</p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', opacity: 0.8 }}>
            {card.exam.name} · Academic Year: {card.exam.academic_year_label}
          </p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '12px', opacity: 0.9 }}>
          <p style={{ margin: 0 }}>{card.exam.start_date} to {card.exam.end_date}</p>
        </div>
      </div>

      {/* Student details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px',
          background: '#f8fafc',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '13px',
        }}
      >
        <div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>STUDENT NAME</p>
          <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#0f172a' }}>{card.student.full_name}</p>
        </div>
        <div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>NURA ID</p>
          <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#0f172a' }}>{card.student.neura_id}</p>
        </div>
        <div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>CLASS</p>
          <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#0f172a' }}>
            {card.student.class_year} — {card.student.section}
          </p>
        </div>
        {card.student.date_of_birth && (
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>DATE OF BIRTH</p>
            <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#0f172a' }}>{card.student.date_of_birth}</p>
          </div>
        )}
        {card.student.parent_name && (
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>PARENT / GUARDIAN</p>
            <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#0f172a' }}>{card.student.parent_name}</p>
          </div>
        )}
        {card.attendance_pct != null && (
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>ATTENDANCE</p>
            <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#0f172a' }}>{card.attendance_pct.toFixed(1)}%</p>
          </div>
        )}
      </div>

      {/* Marks table */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px',
          marginBottom: '16px',
        }}
      >
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            {['Subject', 'Max Marks', 'Marks Obtained', 'Percentage', 'Grade', 'Result'].map((h) => (
              <th
                key={h}
                style={{
                  padding: '8px 12px',
                  textAlign: h === 'Subject' ? 'left' : 'center',
                  fontWeight: 600,
                  color: '#475569',
                  fontSize: '11px',
                  borderBottom: '2px solid #e2e8f0',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {card.subject_results.map((sr: ExamResultSubject, i) => (
            <tr
              key={sr.subject}
              style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
            >
              <td style={{ padding: '8px 12px', fontWeight: 500 }}>{sr.subject}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>{sr.max_marks}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>
                {sr.is_absent ? 'AB' : (sr.marks_obtained ?? '—')}
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                {sr.is_absent ? '—' : sr.percentage != null ? `${sr.percentage.toFixed(1)}%` : '—'}
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                <span
                  style={{
                    fontWeight: 700,
                    color: GRADE_COLORS[sr.grade] ?? '#64748b',
                  }}
                >
                  {sr.grade}
                </span>
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                <span style={{ fontWeight: 600, color: sr.is_pass ? '#10b981' : '#ef4444', fontSize: '12px' }}>
                  {sr.is_absent ? '—' : sr.is_pass ? 'PASS' : 'FAIL'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '8px',
          background: '#1e40af',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          textAlign: 'center',
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: '10px', opacity: 0.8 }}>TOTAL MARKS</p>
          <p style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 800 }}>
            {card.totals.total_marks_obtained}/{card.totals.total_max_marks}
          </p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '10px', opacity: 0.8 }}>PERCENTAGE</p>
          <p style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 800 }}>
            {card.totals.percentage.toFixed(1)}%
          </p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '10px', opacity: 0.8 }}>GRADE</p>
          <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800 }}>
            {card.totals.grade}
          </p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '10px', opacity: 0.8 }}>CLASS RANK</p>
          <p style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 800 }}>
            {card.totals.class_rank != null
              ? `${card.totals.class_rank} / ${card.totals.total_students}`
              : '—'}
          </p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '10px', opacity: 0.8 }}>RESULT</p>
          <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 800, color: passColor }}>
            {card.totals.is_pass ? '✓ PASS' : '✗ FAIL'}
          </p>
        </div>
      </div>

      {/* NeuraCoin badge + remarks */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-start' }}>
        {card.neuracoin_earned > 0 && (
          <div
            style={{
              background: '#fef3c7',
              border: '1px solid #fcd34d',
              borderRadius: '8px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flex: '0 0 auto',
            }}
          >
            <span style={{ fontSize: '20px' }}>🪙</span>
            <div>
              <p style={{ margin: 0, fontSize: '11px', color: '#92400e' }}>NeuraCoin Earned</p>
              <p style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 800, color: '#b45309' }}>
                +{card.neuracoin_earned}
              </p>
            </div>
          </div>
        )}
        {card.teacher_remarks && (
          <div
            style={{
              flex: 1,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 16px',
            }}
          >
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontWeight: 600 }}>TEACHER'S REMARKS</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#0f172a' }}>{card.teacher_remarks}</p>
          </div>
        )}
        {!card.teacher_remarks && (
          <div
            style={{
              flex: 1,
              background: '#f8fafc',
              border: '1px dashed #e2e8f0',
              borderRadius: '8px',
              padding: '10px 16px',
              minHeight: '60px',
            }}
          >
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Teacher's Signature & Remarks</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '10px',
          fontSize: '10px',
          color: '#94a3b8',
        }}
      >
        <span>Generated by NeuraLife · neuralife.in</span>
        <span>NeuraID: {card.student.neura_id}</span>
        <span>Printed: {new Date().toLocaleDateString('en-IN')}</span>
      </div>
    </div>
  )
}
