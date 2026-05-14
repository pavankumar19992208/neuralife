import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle2, X, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ParsedChapter } from '../hooks/useContentStudio'

interface Props {
  chapters: ParsedChapter[]
  onConfirm: () => void
  onCancel: () => void
  isSaving: boolean
  appendFrom?: number
}

export default function ParseConfirmModal({ chapters, onConfirm, onCancel, isSaving, appendFrom }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(chapters.map((c) => c.chapter_number)),
  )

  const totalTopics = chapters.reduce((sum, ch) => sum + ch.topics.length, 0)
  const syntheticCount = chapters.filter((c) => c.topics.some((t) => t.synthetic)).length

  function toggle(num: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {appendFrom != null ? 'Append Chapters' : 'Confirm Textbook Structure'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Parsed <strong>{chapters.length}</strong> chapters ·{' '}
              <strong>{totalTopics}</strong> topics
              {appendFrom != null && (
                <> · will be saved as <strong>Ch.{appendFrom}–{appendFrom + chapters.length - 1}</strong></>
              )}
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Note when topics were auto-created for chapters with no parsed topics */}
        {syntheticCount > 0 && (
          <div className="flex items-start gap-2 px-5 py-2.5 bg-blue-50 border-b border-blue-200 flex-shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-blue-800">
              {syntheticCount} chapter{syntheticCount > 1 ? 's' : ''} had no topics in the index — each treated as a single topic. You can re-parse later to add topics.
            </p>
          </div>
        )}

        {/* Chapter list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {chapters.map((ch) => (
            <div key={ch.chapter_number} className="rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggle(ch.chapter_number)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                {expanded.has(ch.chapter_number) ? (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                )}
                <span className="text-[11px] font-semibold text-slate-800 flex-1 leading-tight">
                  Ch.{ch.chapter_number} · {ch.title_en}
                  {ch.title_te && (
                    <span className="font-normal text-slate-500"> / {ch.title_te}</span>
                  )}
                </span>
                <span
                  className={`text-[10px] tabular-nums flex-shrink-0 font-medium ${
                    ch.topics.length === 0 ? 'text-amber-500' : 'text-slate-400'
                  }`}
                >
                  {ch.topics.length}T
                </span>
              </button>

              {expanded.has(ch.chapter_number) && (
                <div className="bg-white border-t border-slate-100">
                  {ch.topics.map((t) => (
                    <div
                      key={t.topic_number}
                      className="flex items-center gap-2 px-4 py-1.5 border-b border-slate-50 last:border-0"
                    >
                      <span className="text-[10px] text-slate-400 tabular-nums w-5 flex-shrink-0">
                        {t.topic_number}.
                      </span>
                      <span className="text-[11px] text-slate-700">
                        {t.title_en}
                        {t.title_te && (
                          <span className="text-slate-400"> / {t.title_te}</span>
                        )}
                        {t.synthetic && (
                          <span className="ml-1.5 text-[9px] font-medium text-blue-400 italic">(auto)</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-200 bg-white flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isSaving}
            className="gap-1.5 bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Save to Database
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
