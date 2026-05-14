import { useState, useEffect, useRef } from 'react'

export function useCountUp(
  target: number,
  duration: number = 800,
  enabled: boolean = true,
): number {
  const [value, setValue] = useState(enabled ? 0 : target)
  const rafRef = useRef<number | null>(null)
  const startValueRef = useRef(0)

  useEffect(() => {
    if (!enabled) {
      setValue(target)
      return
    }

    startValueRef.current = value
    const start = Date.now()
    const from = startValueRef.current

    function tick() {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic: progress = 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(from + (target - from) * eased))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, enabled])

  return value
}
