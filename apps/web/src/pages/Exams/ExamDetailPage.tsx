import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, CheckCircle, AlertCircle, BookOpen, Trophy,
  FileText, Download, Coins
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import EmptyState from '@/components/feedback/EmptyState'
import PageLayout from '@/components/layout/PageLayout'
import { slideUp } from '@/lib/animations'
import { useExam, useExamResults, usePublishExam } from '@/hooks/useExams'
import { useAuthStore } from '@/store/authStore'
import { UserRole } from '@/types/common'
import type { ExamSubject, ExamResult } from '@/types/common'
import { LoadingButton } from '@/components/ui/LoadingButton'
import { cn } from '@/lib/utils'

const GRADE_COLORS: Record<string, string> = {
  'A+': 'text-emerald-700 bg-emerald-50',
  A: 'text-teal-700 bg-teal-50',
  B: 'text-blue-700 bg-blue-100',
  C: 'text-indigo-700 bg-indigo-100',
  D: 'text-amber-700 bg-amber-100',
  F: 'text-red-700 bg-red-100',
  AB: 'text-slate-500 bg-slate-100',
}

export default function ExamDetailPage() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const isPrincipal = role === UserRole.PRINCIPAL || role === UserRole.SCHOOL_ADMIN
  const [activeTab, setActiveTab] = useState('overview')

  const { data: exam, isLoading, isError } = useExam(examId)
  const { data: results } = useExamResults(examId)
  const publishMut = usePublishExam()

  if (isLoading) {
    return (
      <PageLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </PageLayout>
    )
  }

  if (isError || !exam) {
    return (
      <PageLayout>
        <EmptyState
          icon={<AlertCircle className="h-8 w-8 text-danger" />}
          title="Could not load exam"
          action={<Button onClick={() => navigate('/exams')}>Back to Exams</Button>}
        />
      </PageLayout>
    )
  }

  const canPublish =
    isPrincipal &&
    exam.status !== 'PUBLISHED' &&
    exam.status !== 'ARCHIVED'

  return (
    <PageLayout>
      <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/exams')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-text-primary">{exam.name}</h1>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  exam.status === 'PUBLISHED' && 'border-green-300 text-green-700',
                  exam.status === 'MARKS_PENDING' && 'border-amber-300 text-amber-700',
                  exam.status === 'DRAFT' && 'border-slate-300 text-slate-500',
                )}
              >
                {exam.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              {exam.start_date} — {exam.end_date} · {exam.subjects_count} subjects
            </p>
          </div>

          {canPublish && (
            <LoadingButton
              loading={publishMut.isPending}
              onClick={() => {
                if (confirm('Publish results? This will compute grades, ranks, and award NeuraCoin to students.')) {
                  publishMut.mutate(examId!)
                }
              }}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4" />
              Publish Results
            </LoadingButton>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Subjects & Marks</TabsTrigger>
            {exam.status === 'PUBLISHED' && (
              <>
                <TabsTrigger value="results">Results</TabsTrigger>
                <TabsTrigger value="report-cards">Report Cards</TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Subjects & Marks Entry */}
          <TabsContent value="overview" className="space-y-4 pt-4">
            <p className="text-sm text-text-secondary">
              {isPrincipal
                ? 'Click a subject row to enter marks for that class/section.'
                : 'Click your assigned subject to enter marks.'}
            </p>

            {exam.subjects.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-8 w-8 text-muted-foreground" />}
                title="No subjects configured"
                description="Edit the exam to add subjects."
              />
            ) : (
              <div className="space-y-2">
                {exam.subjects.map((subject) => (
                  <SubjectRow
                    key={subject.id}
                    subject={subject}
                    examStatus={exam.status}
                    onEnterMarks={() =>
                      navigate(`/exams/${exam.id}/marks?subject_id=${subject.id}`)
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Results table */}
          {exam.status === 'PUBLISHED' && (
            <TabsContent value="results" className="pt-4">
              {!results?.length ? (
                <EmptyState
                  icon={<Trophy className="h-8 w-8 text-muted-foreground" />}
                  title="No results yet"
                  description="Results are computed when the exam is published."
                />
              ) : (
                <ResultsTable results={results} examId={exam.id} navigate={navigate} />
              )}
            </TabsContent>
          )}

          {/* Report Cards */}
          {exam.status === 'PUBLISHED' && (
            <TabsContent value="report-cards" className="pt-4">
              <ReportCardsTab results={results ?? []} examId={exam.id} navigate={navigate} />
            </TabsContent>
          )}
        </Tabs>
      </motion.div>
    </PageLayout>
  )
}

function SubjectRow({
  subject,
  examStatus,
  onEnterMarks,
}: {
  subject: ExamSubject
  examStatus: string
  onEnterMarks: () => void
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-text-primary">{subject.subject}</p>
        <p className="text-xs text-text-secondary">
          Class {subject.class_year}
          {subject.section ? ` — Section ${subject.section}` : ' — All sections'}
          {' · '}Max: {subject.max_marks} marks · Pass: {subject.pass_marks} marks
        </p>
        {subject.teacher_name && (
          <p className="text-xs text-primary mt-0.5">Teacher: {subject.teacher_name}</p>
        )}
      </div>

      {examStatus !== 'PUBLISHED' && examStatus !== 'ARCHIVED' && (
        <Button size="sm" variant="outline" onClick={onEnterMarks} className="shrink-0 gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          Enter Marks
        </Button>
      )}
    </div>
  )
}

function ResultsTable({
  results,
  examId,
  navigate,
}: {
  results: ExamResult[]
  examId: string
  navigate: (path: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-raised text-left text-xs font-semibold text-text-secondary">
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">Student</th>
            <th className="px-4 py-3">Class</th>
            <th className="px-4 py-3 text-right">Marks</th>
            <th className="px-4 py-3 text-right">%</th>
            <th className="px-4 py-3">Grade</th>
            <th className="px-4 py-3">Pass/Fail</th>
            <th className="px-4 py-3 text-right">
              <span className="flex items-center justify-end gap-1">
                <Coins className="h-3 w-3 text-amber-500" /> Coins
              </span>
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr
              key={r.neura_id}
              className={cn(
                'border-b border-border last:border-0 hover:bg-surface-raised',
                !r.is_pass && 'bg-red-50/30',
              )}
            >
              <td className="px-4 py-3 text-text-secondary font-medium">
                {r.overall_rank != null ? `#${r.overall_rank}` : i + 1}
              </td>
              <td className="px-4 py-3">
                <p className="font-medium">{r.student_name}</p>
                <p className="text-xs text-text-secondary">{r.neura_id}</p>
              </td>
              <td className="px-4 py-3 text-text-secondary">
                {r.class_year}-{r.section}
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {r.total_marks_obtained}/{r.total_max_marks}
              </td>
              <td className="px-4 py-3 text-right font-medium">{r.percentage.toFixed(1)}%</td>
              <td className="px-4 py-3">
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', GRADE_COLORS[r.grade] ?? 'bg-slate-100 text-slate-700')}>
                  {r.grade}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={cn('text-xs font-semibold', r.is_pass ? 'text-green-700' : 'text-red-700')}>
                  {r.is_pass ? 'PASS' : 'FAIL'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-amber-600 font-semibold">+{r.neuracoin_earned}</span>
              </td>
              <td className="px-4 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => navigate(`/exams/${examId}/report-card/${r.neura_id}`)}
                >
                  <Download className="h-3 w-3" /> Card
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReportCardsTab({
  results,
  examId,
  navigate,
}: {
  results: ExamResult[]
  examId: string
  navigate: (path: string) => void
}) {
  const [search, setSearch] = useState('')
  const filtered = results.filter((r) =>
    r.student_name.toLowerCase().includes(search.toLowerCase()) ||
    r.neura_id.includes(search),
  )

  return (
    <div className="space-y-4">
      <input
        className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
        placeholder="Search student name or NeuraID…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="space-y-2">
        {filtered.map((r) => (
          <div
            key={r.neura_id}
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3"
          >
            <div className="flex-1">
              <p className="font-medium">{r.student_name}</p>
              <p className="text-xs text-text-secondary">
                {r.neura_id} · Class {r.class_year}-{r.section} ·{' '}
                <span className={cn('font-semibold', r.is_pass ? 'text-green-700' : 'text-red-700')}>
                  {r.grade} — {r.is_pass ? 'PASS' : 'FAIL'}
                </span>
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => navigate(`/exams/${examId}/report-card/${r.neura_id}`)}
            >
              <FileText className="h-3.5 w-3.5" />
              View Card
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
