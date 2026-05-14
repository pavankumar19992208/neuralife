import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { slideUp } from '@/lib/animations'
import PageLayout from '@/components/layout/PageLayout'
import PageHeader from '@/components/layout/PageHeader'
import { useDashboard } from '@/hooks/useDashboard'
import { useAuthStore } from '@/store/authStore'
import SchoolHealthScoreCard from './components/SchoolHealthScore'
import PriorityPanel from './components/PriorityPanel'
import KPIStrip from './components/KPIStrip'
import AtRiskTable from './components/AtRiskTable'
import SmartPadStatus from './components/SmartPadStatus'
import type { SchoolHealthKPIs, SchoolHealthDrivers } from '@/types/common'

const EMPTY_KPIS: SchoolHealthKPIs = {
  total_students: 0,
  present_today: 0,
  present_today_pct: 0,
  active_smartpads: 0,
  total_smartpads: 0,
  mastery_avg: 0,
  at_risk_count: 0,
  fee_collection_pct: 0,
}

const EMPTY_DRIVERS: SchoolHealthDrivers = { positive: [], warnings: [], critical: [] }

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboard()
  const school_name = useAuthStore((s) => s.school_name)

  const kpis = data?.kpis ?? EMPTY_KPIS

  if (isError) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-danger" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900">Could not load dashboard</h2>
          <p className="text-sm text-slate-500">Check your connection and try again.</p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title={`${greeting()}${school_name ? `, ${school_name}` : ''}`}
        description={
          isLoading
            ? 'Loading school data…'
            : `${kpis.present_today} of ${kpis.total_students} students present today`
        }
      />

      <motion.div
        variants={slideUp}
        initial="initial"
        animate="animate"
        className="space-y-6"
      >
        {/* Row 1 — Health score + Priority panel */}
        <div className="flex flex-col lg:grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <SchoolHealthScoreCard
              score={data?.overall_score ?? 0}
              band={data?.band ?? 'GOOD'}
              vsLastWeek={data?.vs_last_week ?? 0}
              drivers={data?.drivers ?? EMPTY_DRIVERS}
              isLoading={isLoading}
            />
          </div>
          <div className="lg:col-span-2">
            <PriorityPanel
              priorityActions={data?.priority_actions ?? []}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Row 2 — KPI strip */}
        <KPIStrip kpis={kpis} isLoading={isLoading} />

        {/* Row 3 — AT_RISK summary + SmartPad fleet */}
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6">
          <AtRiskTable
            atRiskCount={kpis.at_risk_count}
            priorityActions={data?.priority_actions ?? []}
            isLoading={isLoading}
          />
          <SmartPadStatus
            total={kpis.total_smartpads}
            synced48h={kpis.active_smartpads}
            offline9d={0}
            isLoading={isLoading}
          />
        </div>
      </motion.div>
    </PageLayout>
  )
}
