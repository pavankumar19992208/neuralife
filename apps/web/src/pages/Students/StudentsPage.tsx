import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, LayoutList, LayoutGrid, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { slideUp } from '@/lib/animations'
import PageLayout from '@/components/layout/PageLayout'
import PageHeader from '@/components/layout/PageHeader'
import Pagination from '@/components/ui/Pagination'
import { cn } from '@/lib/utils'
import { useStudents } from '@/hooks/useStudents'
import type { StudentListFilters } from '@/types/common'
import type { StudentDetail } from '@/types/common'
import StudentFilters from './components/StudentFilters'
import StudentTable from './components/StudentTable'
import StudentCards from './components/StudentCards'
import AdmitStudentModal from './components/AdmitStudentModal'

const LIMIT = 20

function getInitialViewMode(): 'table' | 'cards' {
  const saved = localStorage.getItem('students-view-mode')
  if (saved === 'table' || saved === 'cards') return saved
  return window.innerWidth >= 768 ? 'table' : 'cards'
}

export default function StudentsPage() {
  const [filters, setFilters] = useState<StudentListFilters>({})
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(getInitialViewMode)
  const [isAdmitOpen, setIsAdmitOpen] = useState(false)

  const { data, isLoading, isError, refetch } = useStudents(filters, page, LIMIT)

  const students = data?.data ?? []
  const total = data?.meta.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const start = (page - 1) * LIMIT + 1
  const end = Math.min(page * LIMIT, total)

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [filters])

  function handleViewMode(mode: 'table' | 'cards') {
    setViewMode(mode)
    localStorage.setItem('students-view-mode', mode)
  }

  function handleAdmitSuccess(_result: StudentDetail) {
    // Modal handles navigation to profile; just close here if needed
  }

  if (isError) {
    return (
      <PageLayout>
        <PageHeader title="Students" />
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-danger" aria-hidden="true" />
          <p className="text-sm text-slate-600">Could not load students.</p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title="Students"
        description={isLoading ? 'Loading…' : `${total} student${total !== 1 ? 's' : ''} enrolled`}
        action={
          <Button
            onClick={() => setIsAdmitOpen(true)}
            className="bg-primary hover:bg-primary/90"
            aria-label="Admit a new student"
          >
            <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" />
            Admit Student
          </Button>
        }
      />

      <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <StudentFilters filters={filters} onChange={setFilters} />

          {/* View toggle */}
          <div className="flex items-center gap-1 border border-border rounded-lg p-1">
            <button
              onClick={() => handleViewMode('table')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'table' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-slate-600',
              )}
              aria-label="Table view"
              aria-pressed={viewMode === 'table'}
            >
              <LayoutList className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => handleViewMode('cards')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'cards' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-slate-600',
              )}
              aria-label="Card view"
              aria-pressed={viewMode === 'cards'}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'table' ? (
          <StudentTable students={students} isLoading={isLoading} />
        ) : (
          <StudentCards students={students} isLoading={isLoading} />
        )}

        {/* Pagination */}
        {!isLoading && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-sm text-slate-500 order-2 sm:order-1">
              {total > 0
                ? `Showing ${start}–${end} of ${total} student${total !== 1 ? 's' : ''}`
                : 'No students'}
            </p>
            <div className="order-1 sm:order-2">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        )}
      </motion.div>

      <AdmitStudentModal
        open={isAdmitOpen}
        onClose={() => setIsAdmitOpen(false)}
        onSuccess={handleAdmitSuccess}
      />
    </PageLayout>
  )
}
