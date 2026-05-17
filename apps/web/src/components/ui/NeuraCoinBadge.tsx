import { cn } from '@/lib/utils'

interface Props {
  amount: number
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

export default function NeuraCoinBadge({ amount, size = 'md', animated: _animated }: Props) {
  if (size === 'sm') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
        <span aria-hidden="true">⭐</span>
        {amount.toLocaleString()}
      </span>
    )
  }

  if (size === 'lg') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">⭐</span>
        <div>
          <p className="text-2xl font-bold text-amber-700">{amount.toLocaleString()}</p>
          <p className="text-xs text-slate-500">NeuraCoins</p>
        </div>
      </div>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-700',
      )}
    >
      <span aria-hidden="true">⭐</span>
      {amount.toLocaleString()}
    </span>
  )
}
