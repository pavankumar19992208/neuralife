import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  BarChart3,
  Users,
} from 'lucide-react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import EmptyState from '@/components/feedback/EmptyState'
import PageLayout from '@/components/layout/PageLayout'
import PageHeader from '@/components/layout/PageHeader'
import { slideUp } from '@/lib/animations'
import { timeAgo } from '@/lib/timeAgo'
import { useStudentProfile } from '@/hooks/useStudents'
import { useAuthStore } from '@/store/authStore'
import { UserRole } from '@/types/common'
import { cn } from '@/lib/utils'
import type { StudentDetail } from '@/types/common'
import NeuraCoinBadge from '@/components/ui/NeuraCoinBadge'

// ─── Mastery subjects ─────────────────────────────────────────────────────

const SUBJECTS = [
  'MATHEMATICS',
  'PHYSICAL_SCIENCE',
  'BIOLOGICAL_SCIENCE',
  'ENGLISH',
  'TELUGU',
  'SOCIAL_STUDIES',
]

// ─── Helper: initials ─────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// ─── Band avatar colours ──────────────────────────────────────────────────

function bandColor(band: string | null): string {
  switch (band) {
    case 'FOUNDATION': return 'bg-purple-100 text-purple-700'
    case 'ELEMENTARY':  return 'bg-blue-100 text-blue-700'
    case 'MIDDLE':      return 'bg-teal-100 text-teal-700'
    case 'SECONDARY':   return 'bg-indigo-100 text-indigo-700'
    default:            return 'bg-slate-100 text-slate-600'
  }
}

// ─── SmartPad status text ─────────────────────────────────────────────────

function SmartPadStatus({ student }: { student: StudentDetail }) {
  const progress = student.yearly_progress
  if (!progress?.smartpad_id) {
    return <span className="text-sm text-slate-400">No SmartPad assigned</span>
  }

  // We don't have last_sync_at in StudentDetail; show the ID
  return (
    <span className="text-sm text-slate-600 font-mono">
      {progress.smartpad_id}
    </span>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <PageLayout>
      <div className="space-y-6">
        <div className="flex gap-6 p-6 bg-white rounded-xl border border-border">
          <Skeleton className="h-20 w-20 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </PageLayout>
  )
}

// ─── Log Intervention Modal ───────────────────────────────────────────────

function LogInterventionModal({
  open,
  neuraId: _neuraId,
  onClose,
}: {
  open: boolean
  neuraId: string
  onClose: () => void
}) {
  const [type, setType] = useState('')
  const [notes, setNotes] = useState('')

  function handleSubmit() {
    // TODO: POST /api/v1/interventions when built — _neuraId, type, notes
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Intervention</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="intervention-type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="intervention-type">
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HOMEWORK">Homework</SelectItem>
                <SelectItem value="PARENT_MEETING">Parent Meeting</SelectItem>
                <SelectItem value="REMEDIAL">Remedial</SelectItem>
                <SelectItem value="NOTE">Note</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="intervention-notes">Notes (optional)</Label>
            <textarea
              id="intervention-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="What was discussed or done…"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!type} className="bg-primary hover:bg-primary/90">
              Log Intervention
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Mastery percentile bar ───────────────────────────────────────────────

function PercentileBar({ score }: { score: number }) {
  const color = score >= 75 ? 'bg-success' : score >= 50 ? 'bg-primary' : score >= 35 ? 'bg-warning' : 'bg-danger'
  return (
    <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
      <div className={cn('h-2 rounded-full transition-all duration-500', color)} style={{ width: `${score}%` }} />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────

export default function StudentProfilePage() {
  const { neuraId } = useParams<{ neuraId: string }>()
  const { data: student, isLoading, isError, refetch } = useStudentProfile(neuraId)
  const role = useAuthStore((s) => s.role)
  const [isInterventionOpen, setIsInterventionOpen] = useState(false)

  if (isLoading) return <ProfileSkeleton />

  if (isError || !student) {
    return (
      <PageLayout>
        <PageHeader title="Student Profile" backHref="/students" />
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-danger" aria-hidden="true" />
          <p className="text-sm text-slate-600">Student not found or you don't have access.</p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      </PageLayout>
    )
  }

  const isAtRisk = student.mastery_summary.some((m) => m.classification === 'AT_RISK')
  const progress = student.yearly_progress

  const radarData = SUBJECTS.map((subject) => ({
    subject: subject.replace(/_/g, ' '),
    score: student.mastery_summary.find((m) => m.subject === subject)?.latest_percentile ?? 0,
  }))

  const showBehaviourTab =
    role === UserRole.PRINCIPAL ||
    role === UserRole.SCHOOL_ADMIN ||
    role === UserRole.TEACHER

  return (
    <PageLayout>
      <PageHeader
        title={student.full_name}
        backHref="/students"
      />

      <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-4">
        {/* AT_RISK banner */}
        {isAtRisk && (
          <div className="bg-danger/10 border-l-4 border-danger px-5 py-3 rounded-r-xl flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-danger flex-shrink-0" aria-hidden="true" />
              <span className="font-semibold text-danger text-sm">
                This student is AT_RISK — immediate attention required
              </span>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setIsInterventionOpen(true)}
              aria-label="Log an intervention for this student"
            >
              Log Intervention
            </Button>
          </div>
        )}

        {/* Profile header */}
        <div className="flex items-start gap-6 p-6 bg-white rounded-xl border border-border flex-wrap">
          <div
            className={cn(
              'h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0',
              bandColor(student.band),
            )}
            aria-hidden="true"
          >
            {initials(student.full_name)}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{student.full_name}</h2>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-block font-mono text-sm bg-primary/5 text-primary px-3 py-1 rounded-full border border-primary/20">
                {student.neura_id}
              </span>
              <NeuraCoinBadge amount={student.neuracoin_balance} size="sm" />
            </div>

            {progress && (
              <p className="text-sm text-slate-600 pt-1">
                Class {progress.class_year}-{progress.section}
                {' · '}
                {progress.medium.charAt(0) + progress.medium.slice(1).toLowerCase()} medium
                {progress.board ? ` · ${progress.board}` : ''}
              </p>
            )}

            <div className="flex items-center gap-3 flex-wrap pt-1">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border',
                  student.status === 'ACTIVE'
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-slate-100 text-slate-600 border-slate-200',
                )}
              >
                {student.status}
              </span>
              <SmartPadStatus student={student} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="mastery">Mastery</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="homework">Homework</TabsTrigger>
            {showBehaviourTab && <TabsTrigger value="behaviour">Behaviour</TabsTrigger>}
            <TabsTrigger value="parents">Parents</TabsTrigger>
          </TabsList>

          {/* ─── Overview ─────────────────────────────────────────── */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Mastery radar */}
              <div className="bg-white rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Mastery Radar</h3>
                {student.mastery_summary.length === 0 ? (
                  <EmptyState
                    icon={<BarChart3 className="h-8 w-8" />}
                    title="No mastery data yet"
                    description="Data appears after the student uses their SmartPad"
                  />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#E2E8F0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748B' }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name="Mastery"
                        dataKey="score"
                        fill="#1E40AF"
                        fillOpacity={0.3}
                        stroke="#1E40AF"
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Quick stats */}
              <div className="bg-white rounded-xl border border-border p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Quick Stats</h3>
                {[
                  { label: 'Attendance this month', value: '—' },
                  { label: 'Homework completion', value: '—' },
                  { label: 'SmartPad active days (7d)', value: '—' },
                ].map((stat) => (
                  <div key={stat.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <span className="text-sm text-slate-600">{stat.label}</span>
                    <span className="text-sm font-medium text-slate-400">{stat.value}</span>
                  </div>
                ))}
                <p className="text-xs text-slate-400">Data loads here when attendance/homework API is built</p>
              </div>

              {/* Recent activity */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Activity</h3>
                {/* TODO: Replace with real activity feed when sessions API is built */}
                <EmptyState
                  title="No recent activity recorded"
                  description="Activity from SmartPad sessions will appear here"
                />
              </div>
            </div>
          </TabsContent>

          {/* ─── Mastery ───────────────────────────────────────────── */}
          <TabsContent value="mastery">
            <div className="bg-white rounded-xl border border-border p-5">
              {student.mastery_summary.length === 0 ? (
                <EmptyState
                  icon={<BarChart3 className="h-8 w-8" />}
                  title="No mastery data yet"
                  description="Data appears after the student uses their SmartPad"
                />
              ) : (
                <div className="space-y-5">
                  {student.mastery_summary.map((m) => {
                    const pct = m.latest_percentile ?? 0
                    const classMap: Record<string, string> = {
                      MASTERED:   'bg-success/10 text-success border-success/20',
                      GOOD:       'bg-primary/10 text-primary border-primary/20',
                      DEVELOPING: 'bg-warning/10 text-amber-700 border-warning/20',
                      AT_RISK:    'bg-danger/10 text-danger border-danger/20',
                    }
                    const badgeClass = m.classification
                      ? (classMap[m.classification] ?? 'bg-slate-100 text-slate-600 border-slate-200')
                      : 'bg-slate-100 text-slate-600 border-slate-200'

                    return (
                      <div key={m.subject} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-900">
                            {m.subject.replace(/_/g, ' ')}
                          </span>
                          <div className="flex items-center gap-3">
                            {m.classification && (
                              <span className={cn('text-xs font-medium rounded-full px-2 py-0.5 border', badgeClass)}>
                                {m.classification}
                              </span>
                            )}
                            <span className="text-sm text-slate-500">{pct}th percentile</span>
                          </div>
                        </div>
                        <PercentileBar score={pct} />
                        {m.computed_date && (
                          <p className="text-xs text-slate-400">
                            Last computed: {timeAgo(m.computed_date)}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── Attendance ────────────────────────────────────────── */}
          <TabsContent value="attendance">
            <div className="bg-white rounded-xl border border-border p-5">
              <EmptyState
                title="Detailed attendance coming soon"
                description="Full attendance history loads when the attendance API is built"
              />
            </div>
          </TabsContent>

          {/* ─── Homework ──────────────────────────────────────────── */}
          <TabsContent value="homework">
            <div className="bg-white rounded-xl border border-border p-5">
              {/* TODO: Connect to homework API when built */}
              <EmptyState
                title="Homework tracking coming soon"
                description="Homework submission history will appear here"
              />
            </div>
          </TabsContent>

          {/* ─── Behaviour ─────────────────────────────────────────── */}
          {showBehaviourTab && (
            <TabsContent value="behaviour">
              <div className="bg-white rounded-xl border border-border p-5">
                {role === UserRole.TEACHER && (
                  <div className="mb-4 text-sm text-slate-500 bg-slate-50 rounded-lg p-3">
                    Behaviour log is visible to the class teacher and principal
                  </div>
                )}
                {/* TODO: Connect to behaviour API when built */}
                <EmptyState
                  title="No behaviour records for this student"
                  description="Behaviour observations and notes will appear here"
                />
              </div>
            </TabsContent>
          )}

          {/* ─── Parents ───────────────────────────────────────────── */}
          <TabsContent value="parents">
            <div className="bg-white rounded-xl border border-border p-5 space-y-3">
              {student.parents.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-8 w-8" />}
                  title="No parent contacts recorded"
                  description="Parent contacts are added during student admission"
                />
              ) : (
                <>
                  {student.parents.map((parent, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 border border-border rounded-xl"
                    >
                      <div className="space-y-0.5">
                        <p className="font-medium text-slate-900">{parent.parent_name}</p>
                        <p className="text-sm text-slate-500 capitalize">
                          {parent.relationship.toLowerCase()}
                        </p>
                        <p className="text-sm font-mono text-slate-600">{parent.mobile}</p>
                      </div>
                      {parent.is_primary && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 border">
                          Primary
                        </Badge>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-slate-400 pt-2">
                    Parents can log in to the mobile app using their registered mobile number
                  </p>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      <LogInterventionModal
        open={isInterventionOpen}
        neuraId={student.neura_id}
        onClose={() => setIsInterventionOpen(false)}
      />
    </PageLayout>
  )
}
