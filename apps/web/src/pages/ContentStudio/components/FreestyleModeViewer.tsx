import { useState } from 'react'
import { CheckCircle2, Circle, AlertCircle, Loader2, MessageSquare, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import type { SegmentMap, SegmentId, SingleMedium } from '../types'
import { SEGMENT_LABELS, SEGMENT_ORDER } from '../types'
import type { AuditCallbacks } from './SegmentAuditWrapper'
import CodeEditorModal from './CodeEditorModal'
import ConceptSummarySegment from './segments/ConceptSummarySegment'
import ExplanationSegment from './segments/ExplanationSegment'
import KeyTermsSegment from './segments/KeyTermsSegment'
import DiagramSegment from './segments/DiagramSegment'
import ProblemsSegment from './segments/ProblemsSegment'
import {
  DidYouKnowSegment,
  InteractionSegment,
  PrerequisitesSegment,
  AudioTextSegment,
  YoutubeQuerySegment,
} from './segments/MiscSegments'
import type {
  ConceptSummaryContent,
  ConceptExplanationContent,
  KeyTermsContent,
  SvgDiagramContent,
  CssDiagramContent,
  DidYouKnowContent,
  InteractionContent,
  PrerequisitesContent,
  AudioTextContent,
  YoutubeQueryContent,
  ProblemsContent,
  FreestyleContent,
} from '../types'

// Segment IDs shown in the left nav (merged svg+css as one entry)
const NAV_SEGMENTS = SEGMENT_ORDER.filter((id) => id !== 'css_diagram') as SegmentId[]
const DISP_LABEL: Record<SegmentId, string> = {
  ...SEGMENT_LABELS,
  svg_diagram: 'Diagrams',
}

interface Props {
  segments: SegmentMap
  medium: SingleMedium
  auditCallbacks?: AuditCallbacks
  topicTitle?: string
}

function getContent<T>(segments: SegmentMap, id: SegmentId): T | null {
  return segments[id]?.status === 'complete' ? (segments[id].content as T) : null
}
function isLoading(segments: SegmentMap, id: SegmentId) {
  return segments[id]?.status === 'generating'
}

function StatusDot({ segments, id }: { segments: SegmentMap; id: SegmentId }) {
  const seg = segments[id] ?? segments['css_diagram']
  const s = seg?.status
  if (s === 'generating') return <Loader2 className="h-3 w-3 text-primary animate-spin flex-shrink-0" />
  if (s === 'complete') return <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0 inline-block" />
  if (s === 'error') return <AlertCircle className="h-3 w-3 text-red-400 flex-shrink-0" />
  return <span className="h-2 w-2 rounded-full bg-slate-200 flex-shrink-0 inline-block" />
}

// Segments that support direct code editing in FreestyleModeViewer
const CODE_EDITABLE: Partial<Record<SegmentId, 'json' | 'html'>> = {
  interaction: 'json',
  free_style: 'html',
}

export default function FreestyleModeViewer({ segments, medium, auditCallbacks, topicTitle }: Props) {
  const [selectedId, setSelectedId] = useState<SegmentId>(NAV_SEGMENTS[0])
  const [comment, setComment] = useState('')
  const [showComment, setShowComment] = useState(false)
  const [showCodeEditor, setShowCodeEditor] = useState(false)

  const currentIdx = NAV_SEGMENTS.indexOf(selectedId)
  const canPrev = currentIdx > 0
  const canNext = currentIdx < NAV_SEGMENTS.length - 1

  const isTelugu = medium === 'TELUGU'
  const isApproved = auditCallbacks?.getStatus(selectedId) === 'approved'
  const isRefining = auditCallbacks?.isRefining(selectedId) === true
  const codeType = CODE_EDITABLE[selectedId]
  const canEditCode = !!codeType && !!auditCallbacks?.onEditCode && segments[selectedId]?.status === 'complete'

  function submitComment() {
    const t = comment.trim()
    if (!t || !auditCallbacks) return
    auditCallbacks.onComment(selectedId, t)
    setComment('')
    setShowComment(false)
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── Left Nav ─────────────────────────────────────────────── */}
      <div className="w-52 flex-shrink-0 h-full overflow-y-auto border-r border-slate-200 bg-slate-50 py-3">
        {topicTitle && (
          <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
            {topicTitle}
          </p>
        )}
        {NAV_SEGMENTS.map((id) => {
          const active = id === selectedId
          const approved = auditCallbacks?.getStatus(id) === 'approved'
          return (
            <button
              key={id}
              onClick={() => setSelectedId(id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
                active
                  ? 'bg-white border-r-2 border-primary text-slate-900 font-semibold shadow-sm'
                  : 'text-slate-500 hover:bg-white hover:text-slate-800'
              }`}
            >
              <StatusDot segments={segments} id={id} />
              <span className="flex-1 text-xs truncate">{DISP_LABEL[id]}</span>
              {approved && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />}
            </button>
          )
        })}
      </div>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header row */}
        <div className="flex items-center justify-between px-8 py-3 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => canPrev && setSelectedId(NAV_SEGMENTS[currentIdx - 1])}
              disabled={!canPrev}
              aria-label="Previous segment"
              className="flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {currentIdx + 1} / {NAV_SEGMENTS.length}
              </p>
              <h2 className="text-base font-bold text-slate-900 leading-tight">{DISP_LABEL[selectedId]}</h2>
            </div>
            <button
              onClick={() => canNext && setSelectedId(NAV_SEGMENTS[currentIdx + 1])}
              disabled={!canNext}
              aria-label="Next segment"
              className="flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          </div>

          {/* Audit actions */}
          {auditCallbacks && (
            <div className="flex items-center gap-2">
              {canEditCode && (
                <button
                  onClick={() => setShowCodeEditor(true)}
                  title="Edit code directly"
                  className="flex items-center px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-colors font-mono"
                  aria-label="Edit code"
                >
                  {'</>'}
                </button>
              )}
              <button
                onClick={() => setShowComment((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                aria-label="Comment on segment"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Comment
              </button>
              <button
                onClick={() => auditCallbacks.onRegenerate(selectedId)}
                disabled={isRefining}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 disabled:opacity-40 transition-colors"
                aria-label="Regenerate segment"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefining ? 'animate-spin' : ''}`} />
                Regenerate
              </button>
              <button
                onClick={() => auditCallbacks.onApprove(selectedId)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  isApproved
                    ? 'bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700'
                }`}
                aria-label={isApproved ? 'Un-approve segment' : 'Approve segment'}
              >
                {isApproved
                  ? <><CheckCircle2 className="h-3.5 w-3.5" /> Approved</>
                  : <><Circle className="h-3.5 w-3.5" /> Approve</>
                }
              </button>
            </div>
          )}
        </div>

        {/* Comment box */}
        {showComment && (
          <div className="px-8 py-3 border-b border-blue-200 bg-blue-50 flex-shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 mb-2">
              Feedback for Claude — {DISP_LABEL[selectedId]}
            </p>
            <div className="flex gap-3">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe what needs to change… (Ctrl+Enter to send)"
                rows={2}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitComment() }}
                className="flex-1 resize-none rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={submitComment}
                  disabled={!comment.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  Send
                </button>
                <button
                  onClick={() => setShowComment(false)}
                  className="px-4 py-1.5 text-xs rounded-lg text-slate-500 hover:bg-blue-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Segment content */}
        <div className="flex-1 overflow-y-auto px-8 py-6" lang={isTelugu ? 'te' : 'en'} style={{ opacity: isRefining ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          {isRefining && (
            <div className="flex items-center gap-2 mb-4 text-slate-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Updating content…
            </div>
          )}
          <SegmentContent
            segmentId={selectedId}
            segments={segments}
            isTelugu={isTelugu}
            onEditCode={auditCallbacks?.onEditCode}
          />
        </div>

        {/* Code editor modal for interaction / free_style */}
        {showCodeEditor && canEditCode && auditCallbacks?.onEditCode && (
          <CodeEditorModal
            title={DISP_LABEL[selectedId]}
            language={codeType === 'html' ? 'html' : 'json'}
            code={(() => {
              if (codeType === 'html') {
                const fs = getContent<FreestyleContent>(segments, 'free_style')
                return (fs as { html?: string })?.html ?? ''
              }
              return JSON.stringify(segments[selectedId]?.content, null, 2)
            })()}
            onSave={(raw) => {
              if (codeType === 'html') {
                const prev = getContent<FreestyleContent>(segments, 'free_style') as Record<string, unknown> | null
                auditCallbacks.onEditCode!(selectedId, { ...(prev ?? {}), html: raw })
              } else {
                auditCallbacks.onEditCode!(selectedId, JSON.parse(raw))
              }
            }}
            onClose={() => setShowCodeEditor(false)}
          />
        )}

        {/* Approved overlay */}
        {isApproved && !isRefining && (
          <div className="flex-shrink-0 px-8 py-3 bg-emerald-50 border-t border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Segment approved</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Segment content renderer ──────────────────────────────────────

function SegmentContent({ segmentId, segments, isTelugu, onEditCode }: {
  segmentId: SegmentId
  segments: SegmentMap
  isTelugu: boolean
  onEditCode?: AuditCallbacks['onEditCode']
}) {
  const fontFamily = isTelugu ? "'Noto Sans Telugu', Inter, sans-serif" : 'Inter, sans-serif'

  switch (segmentId) {
    case 'concept_summary':
      return (
        <div style={{ maxWidth: 780, fontFamily }}>
          <ConceptSummarySegment
            content={getContent<ConceptSummaryContent>(segments, 'concept_summary')}
            isLoading={isLoading(segments, 'concept_summary')}
            isEink={false} scale={1}
          />
        </div>
      )
    case 'concept_explanation':
      return (
        <div style={{ maxWidth: 780, fontFamily }}>
          <ExplanationSegment
            content={getContent<ConceptExplanationContent>(segments, 'concept_explanation')}
            isLoading={isLoading(segments, 'concept_explanation')}
            isEink={false} scale={1}
          />
        </div>
      )
    case 'key_terms':
      return (
        <div style={{ maxWidth: 780, fontFamily }}>
          <KeyTermsSegment
            content={getContent<KeyTermsContent>(segments, 'key_terms')}
            isLoading={isLoading(segments, 'key_terms')}
            isEink={false} scale={1}
          />
        </div>
      )
    case 'svg_diagram':
      return (
        <div style={{ maxWidth: 960 }}>
          <DiagramSegment
            svgContent={getContent<SvgDiagramContent>(segments, 'svg_diagram')}
            cssContent={getContent<CssDiagramContent>(segments, 'css_diagram')}
            svgLoading={isLoading(segments, 'svg_diagram')}
            cssLoading={isLoading(segments, 'css_diagram')}
            renderMode="color" scale={1}
            onEditSvg={onEditCode ? (c) => onEditCode('svg_diagram', c) : undefined}
            onEditCss={onEditCode ? (c) => onEditCode('css_diagram', c) : undefined}
          />
        </div>
      )
    case 'did_you_know':
      return (
        <div style={{ maxWidth: 780, fontFamily }}>
          <DidYouKnowSegment
            content={getContent<DidYouKnowContent>(segments, 'did_you_know')}
            isLoading={isLoading(segments, 'did_you_know')}
            isEink={false} scale={1}
          />
        </div>
      )
    case 'interaction':
      return (
        <div style={{ maxWidth: 780, fontFamily }}>
          <InteractionSegment
            content={getContent<InteractionContent>(segments, 'interaction')}
            isLoading={isLoading(segments, 'interaction')}
            isEink={false} scale={1}
          />
        </div>
      )
    case 'problems':
      return (
        <div style={{ maxWidth: 900, fontFamily }}>
          <ProblemsSegment
            content={getContent<ProblemsContent>(segments, 'problems')}
            isLoading={isLoading(segments, 'problems')}
            isEink={false} scale={1}
          />
        </div>
      )
    case 'prerequisites':
      return (
        <div style={{ maxWidth: 780, fontFamily }}>
          <PrerequisitesSegment
            content={getContent<PrerequisitesContent>(segments, 'prerequisites')}
            isLoading={isLoading(segments, 'prerequisites')}
            isEink={false} scale={1}
          />
        </div>
      )
    case 'audio_text':
      return (
        <div style={{ maxWidth: 780, fontFamily }}>
          <AudioTextSegment
            content={getContent<AudioTextContent>(segments, 'audio_text')}
            isLoading={isLoading(segments, 'audio_text')}
            isEink={false} scale={1}
          />
        </div>
      )
    case 'youtube_query':
      return (
        <div style={{ maxWidth: 780, fontFamily }}>
          <YoutubeQuerySegment
            content={getContent<YoutubeQueryContent>(segments, 'youtube_query')}
            isLoading={isLoading(segments, 'youtube_query')}
            isEink={false} scale={1}
          />
        </div>
      )
    case 'free_style': {
      const fs = getContent<FreestyleContent>(segments, 'free_style')
      if (isLoading(segments, 'free_style')) {
        return (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Generating free style content…
          </div>
        )
      }
      if (!fs?.html) return <p className="text-sm text-slate-400 italic">No free style content yet.</p>
      return (
        <div className="w-full">
          {fs.title && (
            <h3 className="text-lg font-bold text-slate-800 mb-4">{fs.title}</h3>
          )}
          <div
            className="w-full"
            dangerouslySetInnerHTML={{ __html: fs.html }}
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
        </div>
      )
    }
    default:
      return null
  }
}
