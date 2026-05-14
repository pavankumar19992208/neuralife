import type { FreestyleContent, SegmentId } from '../types'
import type { AuditCallbacks } from './SegmentAuditWrapper'
import { SegmentAuditWrapper } from './SegmentAuditWrapper'

interface Props {
  content: FreestyleContent | null | undefined
  isLoading: boolean
  auditCallbacks?: AuditCallbacks
}

const SEGMENT_ID: SegmentId = 'free_style'

export default function FreestyleViewer({ content, isLoading, auditCallbacks }: Props) {
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
          <div className="h-3 w-40 rounded bg-slate-100 animate-pulse" />
        </div>
        <div className="px-6 py-6 space-y-3">
          <div className="h-32 w-full rounded-xl bg-slate-100 animate-pulse" />
        </div>
      </div>
    )
  }

  if (!content?.html) return null

  const inner = (
    <div className="w-full max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Free Style</span>
        {content.title && (
          <span className="text-sm font-semibold text-slate-700">{content.title}</span>
        )}
      </div>
      <div
        className="w-full overflow-auto"
        /* srcdoc not available for raw div — use dangerouslySetInnerHTML for now;
           content is LLM-generated internal content, not user input */
        dangerouslySetInnerHTML={{ __html: content.html }}
        style={{ fontFamily: 'Inter, sans-serif' }}
      />
    </div>
  )

  if (auditCallbacks) {
    return (
      <div className="pt-6 relative">
        <SegmentAuditWrapper segmentId={SEGMENT_ID} label="Free Style" callbacks={auditCallbacks}>
          {inner}
        </SegmentAuditWrapper>
      </div>
    )
  }

  return <div className="pt-6">{inner}</div>
}
