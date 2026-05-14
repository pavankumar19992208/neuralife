import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { shake } from '@/lib/animations'
import { cn } from '@/lib/utils'

interface OTPInputProps {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
  hasError?: boolean
  autoFocus?: boolean
}

export function OTPInput({ value, onChange, disabled, hasError, autoFocus }: OTPInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const [digits, setDigits] = useState<string[]>(() =>
    value.padEnd(6, '').split('').slice(0, 6),
  )
  const controls = useAnimation()
  const prevError = useRef(false)

  // Sync external value → internal digits
  useEffect(() => {
    setDigits(value.padEnd(6, '').split('').slice(0, 6))
  }, [value])

  // Shake when hasError transitions to true
  useEffect(() => {
    if (hasError && !prevError.current) {
      void controls.start(shake.animate)
    }
    prevError.current = hasError ?? false
  }, [hasError, controls])

  // Auto-focus first box on mount
  useEffect(() => {
    if (autoFocus) {
      inputRefs.current[0]?.focus()
    }
  }, [autoFocus])

  const updateDigits = useCallback(
    (newDigits: string[]) => {
      setDigits(newDigits)
      onChange(newDigits.join(''))
    },
    [onChange],
  )

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    if (!raw) return
    const digit = raw[raw.length - 1]
    const next = [...digits]
    next[index] = digit
    updateDigits(next)
    if (index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits]
        next[index] = ''
        updateDigits(next)
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6)
    if (!text) return
    const next = Array(6).fill('')
    for (let i = 0; i < text.length; i++) next[i] = text[i]
    updateDigits(next)
    inputRefs.current[Math.min(text.length, 5)]?.focus()
  }

  return (
    <motion.div animate={controls} className="flex gap-3 justify-center">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`OTP digit ${i + 1}`}
          className={cn(
            'w-12 h-14 text-center text-xl font-semibold rounded-xl border shadow-sm',
            'transition-colors focus:outline-none focus:ring-2',
            hasError
              ? 'border-danger text-danger focus:ring-danger/30 bg-red-50'
              : 'border-border focus:border-primary focus:ring-primary/20 bg-white text-slate-900',
            disabled && 'opacity-50 cursor-not-allowed bg-slate-50',
          )}
        />
      ))}
    </motion.div>
  )
}
