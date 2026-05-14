import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ButtonProps } from '@/components/ui/button'

interface LoadingButtonProps extends ButtonProps {
  loading: boolean
}

export function LoadingButton({ loading, disabled, children, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={loading || disabled} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </Button>
  )
}
