import { useState, useRef } from 'react'
import { MessageSquare, RefreshCw, CheckCircle2, Circle } from 'lucide-react'
import type { SegmentId } from '../types'
import CodeEditorModal from './CodeEditorModal'

export type AuditStatus = 'pending' | 'approved'

export interface AuditCallbacks {
  getStatus: (id: SegmentId) => AuditStatus
  onComment: (id: SegmentId, comment: string) => void
  onRegenerate: (id: SegmentId) => void
  onApprove: (id: SegmentId) => void
  isRefining: (id: SegmentId) => boolean
  onEditCode?: (id: SegmentId, newContent: unknown) => void
}

interface Props {
  segmentId: SegmentId
  label: string
  callbacks: AuditCallbacks
  children: React.ReactNode
  /** When set, shows the </> button and opens a code editor for this segment */
  codeContent?: unknown
  codeType?: 'json'
}

export function SegmentAuditWrapper({ segmentId, label, callbacks, children, codeContent, codeType }: Props) {
  const [showComment, setShowComment] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [showCodeEditor, setShowCodeEditor] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const status = callbacks.getStatus(segmentId)
  const isRefining = callbacks.isRefining(segmentId)
  const isApproved = status === 'approved'
  const canEditCode = codeType != null && codeContent != null && callbacks.onEditCode != null

  function submitComment() {
    const trimmed = commentText.trim()
    if (!trimmed) return
    callbacks.onComment(segmentId, trimmed)
    setCommentText('')
    setShowComment(false)
  }

  return (
    <div
      className="relative group"
      style={{
        borderRadius: 10,
        outline: isApproved ? '2px solid #10b981' : '2px solid transparent',
        outlineOffset: 2,
        transition: 'outline-color 0.2s',
      }}
    >
      {/* Segment content */}
      <div style={{ opacity: isRefining ? 0.5 : 1, transition: 'opacity 0.2s', pointerEvents: isRefining ? 'none' : undefined }}>
        {children}
      </div>

      {/* Refining spinner overlay */}
      {isRefining && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: 'rgba(255,255,255,0.7)' }}>
          <RefreshCw className="h-5 w-5 text-primary animate-spin" />
          <span className="ml-2 text-xs font-medium text-slate-600">Updating…</span>
        </div>
      )}

      {/* Audit icon strip — top right, shown on hover unless approved */}
      <div
        className={`absolute top-0 right-0 flex items-center gap-1 transition-opacity ${isApproved ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        style={{ transform: 'translateY(-100%)', paddingBottom: 4 }}
      >
        <span className="text-[10px] font-medium text-slate-400 mr-1">{label}</span>

        {/* Comment button */}
        <button
          onClick={() => { setShowComment((v) => !v); setTimeout(() => textareaRef.current?.focus(), 50) }}
          title="Comment — send feedback to Claude"
          className="flex items-center justify-center h-6 w-6 rounded-md bg-white border border-slate-200 shadow-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
          aria-label={`Comment on ${label}`}
        >
          <MessageSquare className="h-3.5 w-3.5 text-slate-500 hover:text-blue-600" />
        </button>

        {/* Regenerate button */}
        <button
          onClick={() => callbacks.onRegenerate(segmentId)}
          title="Regenerate — get a different version"
          disabled={isRefining}
          className="flex items-center justify-center h-6 w-6 rounded-md bg-white border border-slate-200 shadow-sm hover:bg-amber-50 hover:border-amber-300 transition-colors disabled:opacity-40"
          aria-label={`Regenerate ${label}`}
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500 hover:text-amber-600" />
        </button>

        {/* Approve / tick button */}
        <button
          onClick={() => callbacks.onApprove(segmentId)}
          title={isApproved ? 'Approved — click to un-approve' : 'Approve this segment'}
          className={`flex items-center justify-center h-6 w-6 rounded-md border shadow-sm transition-colors ${
            isApproved
              ? 'bg-emerald-500 border-emerald-600 hover:bg-emerald-600'
              : 'bg-white border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'
          }`}
          aria-label={isApproved ? `Un-approve ${label}` : `Approve ${label}`}
        >
          {isApproved
            ? <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            : <Circle className="h-3.5 w-3.5 text-slate-400 hover:text-emerald-600" />
          }
        </button>

        {/* Code editor button — only for code-editable segments */}
        {canEditCode && (
          <button
            onClick={() => setShowCodeEditor(true)}
            title="Edit code directly"
            className="flex items-center justify-center h-6 px-1.5 rounded-md bg-white border border-slate-200 shadow-sm hover:bg-violet-50 hover:border-violet-300 transition-colors font-mono font-bold text-[10px] text-slate-500 hover:text-violet-600"
            aria-label={`Edit ${label} code`}
          >
            {'</>'}
          </button>
        )}
      </div>

      {/* Code editor modal */}
      {showCodeEditor && canEditCode && (
        <CodeEditorModal
          title={`Edit ${label}`}
          language={codeType!}
          code={JSON.stringify(codeContent, null, 2)}
          onSave={(raw) => {
            callbacks.onEditCode!(segmentId, JSON.parse(raw))
          }}
          onClose={() => setShowCodeEditor(false)}
        />
      )}

      {/* Comment box */}
      {showComment && (
        <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-3 shadow-sm">
          <p className="text-[10px] font-semibold text-blue-700 mb-1.5 uppercase tracking-wide">
            Feedback for Claude — {label}
          </p>
          <textarea
            ref={textareaRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Describe what needs to change…"
            rows={3}
            className="w-full resize-none rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitComment() }}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setShowComment(false)}
              className="px-3 py-1 text-xs rounded-lg text-slate-500 hover:bg-blue-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitComment}
              disabled={!commentText.trim()}
              className="px-3 py-1 text-xs rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              Send to Claude
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
