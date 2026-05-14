import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  UserPlus,
  GraduationCap,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { slideUp, staggerChildren, listItem } from '@/lib/animations'
import PageLayout from '@/components/layout/PageLayout'
import PageHeader from '@/components/layout/PageHeader'
import Pagination from '@/components/ui/Pagination'
import { useTeachers } from '@/hooks/useTeachers'
import { useAuthStore } from '@/store/authStore'
import { UserRole } from '@/types/common'
import type { TeacherListItem } from '@/types/common'
import AddTeacherModal from './components/AddTeacherModal'

const LIMIT = 20

function statusBadge(status: string) {
  if (status === 'ACTIVE') return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
  if (status === 'ON_LEAVE') return <Badge className="bg-warning/10 text-warning border-warning/20">On Leave</Badge>
  return <Badge variant="secondary">Resigned</Badge>
}

function TeacherTableSkeleton() {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface-raised border-b border-border">
          <tr>
            {['Name', 'Designation', 'Subjects', 'Class Teacher', 'Status', 'Leave Balance', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: 7 }).map((__, j) => (
                <td key={j} className="px-4 py-3">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TeacherRow({ teacher }: { teacher: TeacherListItem }) {
  const navigate = useNavigate()
  const truncatedSubjects =
    teacher.subjects.length > 3
      ? teacher.subjects.slice(0, 3).join(', ') + ` +${teacher.subjects.length - 3}`
      : teacher.subjects.join(', ') || '—'

  return (
    <motion.tr
      variants={listItem}
      className="hover:bg-surface-raised transition-colors cursor-pointer group"
      onClick={() => navigate(`/teachers/${teacher.teacher_id}`)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-primary">
              {teacher.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-text-primary">{teacher.full_name}</p>
            <p className="text-xs text-text-muted">{teacher.mobile}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline" className="font-normal">{teacher.designation}</Badge>
      </td>
      <td className="px-4 py-3 text-text-secondary text-xs max-w-[180px] truncate">
        {truncatedSubjects}
      </td>
      <td className="px-4 py-3">
        {teacher.class_teacher_of ? (
          <Badge className="bg-secondary/10 text-secondary border-secondary/20">
            {teacher.class_teacher_of}
          </Badge>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3">{statusBadge(teacher.status)}</td>
      <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
        CL: {teacher.cl_remaining} | SL: {teacher.sl_remaining}
      </td>
      <td className="px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity h-7"
          aria-label={`View ${teacher.full_name}`}
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/teachers/${teacher.teacher_id}`)
          }}
        >
          View
          <ChevronRight className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
        </Button>
      </td>
    </motion.tr>
  )
}

export default function TeachersPage() {
  const [page, setPage] = useState(1)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const role = useAuthStore((s) => s.role)

  const { data, isLoading, isError, refetch } = useTeachers(page, LIMIT)

  const teachers = data?.data ?? []
  const total = data?.meta.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const start = (page - 1) * LIMIT + 1
  const end = Math.min(page * LIMIT, total)

  useEffect(() => { setPage(1) }, [])

  if (isError) {
    return (
      <PageLayout>
        <PageHeader title="Teachers" />
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-danger" aria-hidden="true" />
          <p className="text-sm text-slate-600">Could not load teachers. Check your connection.</p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title="Teachers"
        description={isLoading ? 'Loading…' : `${total} teacher${total !== 1 ? 's' : ''} on staff`}
        action={
          role === UserRole.PRINCIPAL ? (
            <Button
              onClick={() => setIsAddOpen(true)}
              className="bg-primary hover:bg-primary/90"
              aria-label="Add a new teacher"
            >
              <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" />
              Add Teacher
            </Button>
          ) : undefined
        }
      />

      <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-4">
        {isLoading ? (
          <TeacherTableSkeleton />
        ) : teachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4 rounded-xl border border-border bg-surface p-12 text-center">
            <GraduationCap className="h-12 w-12 text-text-muted" aria-hidden="true" />
            <div>
              <p className="font-semibold text-text-primary">No teachers yet</p>
              <p className="text-sm text-text-muted mt-1">Add the first teacher to get started.</p>
            </div>
            {role === UserRole.PRINCIPAL && (
              <Button onClick={() => setIsAddOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Teacher
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-surface shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-border">
                <tr>
                  {['Name', 'Designation', 'Subjects', 'Class Teacher', 'Status', 'Leave Balance', ''].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <motion.tbody
                variants={staggerChildren}
                initial="initial"
                animate="animate"
                className="divide-y divide-border"
              >
                {teachers.map((t) => (
                  <TeacherRow key={t.teacher_id} teacher={t} />
                ))}
              </motion.tbody>
            </table>
          </div>
        )}

        {!isLoading && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-sm text-slate-500 order-2 sm:order-1">
              Showing {start}–{end} of {total} teacher{total !== 1 ? 's' : ''}
            </p>
            <div className="order-1 sm:order-2">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        )}
      </motion.div>

      <AddTeacherModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </PageLayout>
  )
}
