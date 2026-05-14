import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { listItem, staggerChildren } from '@/lib/animations'
import type { PriorityAction } from '@/types/common'

const MAX_PER_SECTION = 3

const SEVERITY_CONFIG = {
  critical: {
    label: 'REQUIRES ACTION',
    headerClass: 'text-danger',
    icon: AlertCircle,
    iconClass: 'text-danger',
  },
  warning: {
    label: 'WATCH',
    headerClass: 'text-warning',
    icon: AlertTriangle,
    iconClass: 'text-warning',
  },
  positive: {
    label: 'POSITIVE',
    headerClass: 'text-success',
    icon: CheckCircle2,
    iconClass: 'text-success',
  },
} as const

type Severity = keyof typeof SEVERITY_CONFIG

interface Props {
  priorityActions: PriorityAction[]
  isLoading: boolean
}

function ActionCard({ action, index }: { action: PriorityAction; index: number }) {
  const navigate = useNavigate()
  const cfg = SEVERITY_CONFIG[action.severity]
  const Icon = cfg.icon

  return (
    <motion.div
      variants={listItem}
      custom={index}
      className="rounded-xl border border-slate-200 p-4 bg-white"
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${cfg.iconClass}`} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">{action.title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{action.description}</p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-3 w-full text-xs"
        onClick={() => navigate(action.action_href)}
        aria-label={action.action_label}
      >
        {action.action_label}
      </Button>
    </motion.div>
  )
}

export default function PriorityPanel({ priorityActions, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-card h-full">
        <Skeleton className="h-5 w-40 mb-4 rounded" />
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  const sections: Severity[] = ['critical', 'warning', 'positive']
  const grouped = sections.reduce<Record<Severity, PriorityAction[]>>(
    (acc, sev) => ({ ...acc, [sev]: priorityActions.filter((a) => a.severity === sev) }),
    { critical: [], warning: [], positive: [] },
  )

  const hasAny = priorityActions.length > 0
  let globalIndex = 0

  return (
    <div className="bg-white rounded-2xl p-6 shadow-card h-full flex flex-col">
      <h2 className="text-base font-semibold text-slate-900 mb-4">Today's Priorities</h2>

      {!hasAny && (
        <div className="flex flex-col items-center justify-center flex-1 py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-success mb-3" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-900">All clear</p>
          <p className="text-xs text-slate-500 mt-1">No urgent actions required today</p>
        </div>
      )}

      {hasAny && (
        <motion.div
          variants={staggerChildren}
          initial="initial"
          animate="animate"
          className="space-y-5 flex-1 overflow-y-auto"
        >
          {sections.map((sev) => {
            const items = grouped[sev]
            if (items.length === 0) return null
            const cfg = SEVERITY_CONFIG[sev]
            const visible = items.slice(0, MAX_PER_SECTION)
            const overflow = items.length - MAX_PER_SECTION

            return (
              <div key={sev}>
                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${cfg.headerClass}`}>
                  {cfg.label} ({items.length})
                </p>
                <div className="space-y-2">
                  {visible.map((action) => {
                    const idx = globalIndex++
                    return <ActionCard key={action.id} action={action} index={idx} />
                  })}
                </div>
                {overflow > 0 && (
                  <p className="text-xs text-primary mt-2 cursor-pointer hover:underline">
                    +{overflow} more
                  </p>
                )}
              </div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
