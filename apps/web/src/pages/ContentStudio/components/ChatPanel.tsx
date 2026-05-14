import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChatMessage, SegmentId } from '../types'
import { SEGMENT_LABELS } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  messages: ChatMessage[]
  isLoading: boolean
  topicTitle?: string
  onSend: (message: string, targetSegment?: SegmentId) => void
}

const QUICK_PROMPTS = [
  'Make the explanation simpler for students',
  'Add more real-world examples',
  'The diagram needs clearer labels',
  'Improve the key terms definitions',
  'Add more Foundation-level problems',
  'The activity type should be Slider-Parameter instead',
]

const TARGET_SEGMENTS: { value: SegmentId | ''; label: string }[] = [
  { value: '', label: 'All segments (general)' },
  ...([
    'concept_summary',
    'concept_explanation',
    'key_terms',
    'svg_diagram',
    'css_diagram',
    'did_you_know',
    'interaction',
    'problems',
    'prerequisites',
    'audio_text',
    'youtube_query',
  ] as SegmentId[]).map((id) => ({ value: id, label: SEGMENT_LABELS[id] })),
]

export default function ChatPanel({ isOpen, onClose, messages, isLoading, topicTitle, onSend }: Props) {
  const [input, setInput] = useState('')
  const [targetSegment, setTargetSegment] = useState<SegmentId | ''>('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [messages, isOpen])

  function handleSend() {
    const msg = input.trim()
    if (!msg || isLoading) return
    onSend(msg, targetSegment || undefined)
    setInput('')
  }

  function handleQuick(prompt: string) {
    onSend(prompt, targetSegment || undefined)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed right-0 top-0 h-full w-[420px] bg-white border-l border-slate-200 flex flex-col shadow-2xl z-50"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 bg-white">
        <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900">Refine with Claude</p>
          {topicTitle && (
            <p className="text-xs text-slate-400 truncate">{topicTitle}</p>
          )}
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Target segment selector */}
      <div className="px-4 pt-3 pb-1">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Target segment</label>
        <div className="relative mt-1">
          <select
            value={targetSegment}
            onChange={(e) => setTargetSegment(e.target.value as SegmentId | '')}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-8 text-xs text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
          >
            {TARGET_SEGMENTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-2 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 text-center pt-4">
              Ask Claude to refine any part of the generated content. Changes are applied immediately.
            </p>

            {/* Quick prompts */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Quick prompts</p>
              {QUICK_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleQuick(p)}
                  disabled={isLoading}
                  className="w-full text-left rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                  {msg.updatedSegments && Object.keys(msg.updatedSegments).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <p className={`text-[10px] font-semibold ${msg.role === 'user' ? 'text-white/70' : 'text-slate-500'}`}>
                        Updated: {Object.keys(msg.updatedSegments).map((k) => SEGMENT_LABELS[k as SegmentId]).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                  <span className="text-xs text-slate-500">Claude is thinking…</span>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Ask Claude to modify the content…"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 max-h-32"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="flex-shrink-0 h-9 w-9 rounded-xl p-0 bg-primary hover:bg-primary/90 disabled:opacity-40"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 px-1">Press Enter to send • Shift+Enter for newline</p>
      </div>
    </div>
  )
}
