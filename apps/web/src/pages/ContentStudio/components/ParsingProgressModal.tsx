import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import type { LLMProvider } from '../types'

const STEPS = [
  'Reading table of contents…',
  'Identifying chapter structure…',
  'Extracting topic names…',
  'Mapping bilingual titles…',
  'Finalizing structure…',
]

interface Props {
  model: LLMProvider
}

export default function ParsingProgressModal({ model }: Props) {
  const [stepIndex, setStepIndex] = useState(0)

  // Cycle through steps every ~4 seconds so the user sees progress
  useEffect(() => {
    const id = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
    }, 4000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Analyzing Textbook Structure</h3>
          <p className="text-xs text-slate-500 mt-1">
            Using{' '}
            <span className={`font-semibold ${model === 'gemini' ? 'text-blue-600' : 'text-violet-600'}`}>
              {model === 'gemini' ? 'Gemini 2.5 Flash' : 'Claude Sonnet'}
            </span>
            {' '}to extract chapters and topics
          </p>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-3">
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: '5%' }}
              animate={{ width: `${Math.round(((stepIndex + 1) / STEPS.length) * 85) + 5}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Animated step label */}
        <div className="px-6 pb-6 text-center min-h-[36px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={stepIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-xs text-slate-500"
            >
              {STEPS[stepIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Bottom tip */}
        <div className="border-t border-slate-100 px-6 py-3 bg-slate-50">
          <p className="text-[10px] text-slate-400 text-center">
            This may take a few seconds for large textbooks
          </p>
        </div>
      </motion.div>
    </div>
  )
}
