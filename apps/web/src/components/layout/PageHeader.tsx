import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  backHref?: string
}

export default function PageHeader({ title, description, action, backHref }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {backHref && (
        <Link
          to={backHref}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2 w-fit transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  )
}
