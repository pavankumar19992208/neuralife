import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { PriorityAction } from '@/types/common'

interface Props {
  atRiskCount: number
  priorityActions: PriorityAction[]
  isLoading: boolean
}

export default function AtRiskTable({ atRiskCount, isLoading }: Props) {
  const navigate = useNavigate()

  if (isLoading) {
    return <Skeleton className="h-full min-h-[200px] w-full rounded-xl" />
  }

  if (atRiskCount === 0) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-card border border-slate-200 h-full flex flex-col items-center justify-center min-h-[200px]">
        <CheckCircle2 className="h-10 w-10 text-success mb-3" aria-hidden="true" />
        <p className="font-medium text-slate-900">No students at risk</p>
        <p className="text-sm text-slate-500 mt-1">All students are on track</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-card border border-slate-200 h-full flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-danger" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-slate-900">AT_RISK Students</h3>
      </div>

      {/* Summary card — student-level details need a separate API */}
      <div className="bg-danger/5 border border-danger/20 rounded-xl p-4 flex-1">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="h-5 w-5 text-danger flex-shrink-0" aria-hidden="true" />
          <span className="font-semibold text-danger">
            {atRiskCount} student{atRiskCount === 1 ? '' : 's'} need attention
          </span>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          These students have declining mastery scores.
          View their profiles to log an intervention.
        </p>
        {/* TODO: Replace with full student table when
            GET /api/v1/students?classification=at_risk endpoint is built */}
        <Button
          onClick={() => navigate('/students?filter=at_risk')}
          className="w-full"
          variant="destructive"
          size="sm"
          aria-label="View AT_RISK students"
        >
          View AT_RISK students →
        </Button>
      </div>
    </div>
  )
}
