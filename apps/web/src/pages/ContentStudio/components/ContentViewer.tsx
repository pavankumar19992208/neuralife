import type { SegmentMap, RenderMode, SegmentId, DeviceType } from '../types'
import { DEVICE_DIMENSIONS } from '../types'
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
import { SegmentAuditWrapper } from './SegmentAuditWrapper'
import type { AuditCallbacks } from './SegmentAuditWrapper'
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
} from '../types'

interface Props {
  segments: SegmentMap
  renderMode: RenderMode
  topicTitle?: string
  chapterTitle?: string
  deviceType?: DeviceType
  hideHeader?: boolean
  medium?: 'ENGLISH' | 'TELUGU'
  auditCallbacks?: AuditCallbacks
}

const sz = (px: number, scale: number) => `${Math.round(px / scale)}px`

function isLoading(segments: SegmentMap, id: SegmentId) {
  return segments[id].status === 'generating'
}

function getContent<T>(segments: SegmentMap, id: SegmentId): T | null {
  if (segments[id].status === 'complete') return segments[id].content as T
  return null
}

function SectionDivider({ label, isEink, scale }: { label: string; isEink: boolean; scale: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: sz(10, scale), margin: `${sz(4, scale)} 0` }}>
      <div style={{ height: Math.round(1 / scale), flex: 1, background: isEink ? '#d1d5db' : '#e2e8f0' }} />
      <span style={{
        fontSize: sz(10, scale), fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        color: isEink ? '#9ca3af' : '#94a3b8',
        flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{ height: Math.round(1 / scale), flex: 1, background: isEink ? '#d1d5db' : '#e2e8f0' }} />
    </div>
  )
}

function Auditable({ id, label, auditCallbacks, codeContent, codeType, children }: {
  id: SegmentId
  label: string
  auditCallbacks?: AuditCallbacks
  codeContent?: unknown
  codeType?: 'json'
  children: React.ReactNode
}) {
  if (!auditCallbacks) return <>{children}</>
  return (
    <SegmentAuditWrapper
      segmentId={id}
      label={label}
      callbacks={auditCallbacks}
      codeContent={codeContent}
      codeType={codeType}
    >
      {children}
    </SegmentAuditWrapper>
  )
}

export default function ContentViewer({ segments, renderMode, topicTitle, chapterTitle, deviceType = 'smartpad', hideHeader = false, medium = 'ENGLISH', auditCallbacks }: Props) {
  const isEink = renderMode === 'eink'
  const scale = DEVICE_DIMENSIONS[deviceType].scale
  const isTelugu = medium === 'TELUGU'

  const outerPad = Math.round(24 / scale)
  const sectionGap = Math.round(20 / scale)
  const bgColor = isEink ? '#f5f5f0' : '#ffffff'
  const textColor = isEink ? '#111827' : '#0f172a'

  return (
    <div
      lang={isTelugu ? 'te' : 'en'}
      style={{
        background: bgColor,
        color: textColor,
        minHeight: '100%',
        fontFamily: isTelugu ? "'Noto Sans Telugu', Inter, sans-serif" : 'Inter, sans-serif',
        padding: outerPad,
        display: 'flex',
        flexDirection: 'column',
        gap: sectionGap,
      }}
    >
      {/* ── Topic header ──────────────────────────────────────── */}
      {!hideHeader && (topicTitle || chapterTitle) && (
        <div style={{ paddingBottom: sz(16, scale), borderBottom: `${Math.round(1 / scale)}px solid ${isEink ? '#9ca3af' : '#e2e8f0'}` }}>
          {chapterTitle && (
            <p style={{ fontSize: sz(10, scale), fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isEink ? '#6b7280' : '#94a3b8', marginBottom: sz(4, scale), margin: `0 0 ${sz(4, scale)} 0` }}>
              {chapterTitle}
            </p>
          )}
          {topicTitle && (
            <h1 style={{ fontSize: sz(22, scale), fontWeight: 800, lineHeight: 1.3, color: isEink ? '#111827' : '#0f172a', margin: 0 }}>
              {topicTitle}
            </h1>
          )}
        </div>
      )}

      {/* ── Concept Summary ───────────────────────────────────── */}
      <Auditable id="concept_summary" label="Concept Summary" auditCallbacks={auditCallbacks}>
        <ConceptSummarySegment
          content={getContent<ConceptSummaryContent>(segments, 'concept_summary')}
          isLoading={isLoading(segments, 'concept_summary')}
          isEink={isEink}
          scale={scale}
        />
      </Auditable>

      {/* ── Explanation ───────────────────────────────────────── */}
      <div>
        <SectionDivider label="Explanation" isEink={isEink} scale={scale} />
        <div style={{ marginTop: sz(12, scale) }}>
          <Auditable id="concept_explanation" label="Explanation" auditCallbacks={auditCallbacks}>
            <ExplanationSegment
              content={getContent<ConceptExplanationContent>(segments, 'concept_explanation')}
              isLoading={isLoading(segments, 'concept_explanation')}
              isEink={isEink}
              scale={scale}
            />
          </Auditable>
        </div>
      </div>

      {/* ── Diagram ───────────────────────────────────────────── */}
      <div>
        <SectionDivider label="Diagram" isEink={isEink} scale={scale} />
        <div style={{ marginTop: sz(12, scale) }}>
          <Auditable id="svg_diagram" label="E-Ink Diagram" auditCallbacks={auditCallbacks}>
            <DiagramSegment
              svgContent={getContent<SvgDiagramContent>(segments, 'svg_diagram')}
              cssContent={getContent<CssDiagramContent>(segments, 'css_diagram')}
              svgLoading={isLoading(segments, 'svg_diagram')}
              cssLoading={isLoading(segments, 'css_diagram')}
              renderMode={renderMode}
              scale={scale}
              onEditSvg={auditCallbacks?.onEditCode
                ? (c) => auditCallbacks.onEditCode!('svg_diagram', c)
                : undefined}
              onEditCss={auditCallbacks?.onEditCode
                ? (c) => auditCallbacks.onEditCode!('css_diagram', c)
                : undefined}
            />
          </Auditable>
        </div>
      </div>

      {/* ── Key Terms ─────────────────────────────────────────── */}
      <div>
        <SectionDivider label="Key Terms" isEink={isEink} scale={scale} />
        <div style={{ marginTop: sz(12, scale) }}>
          <Auditable id="key_terms" label="Key Terms" auditCallbacks={auditCallbacks}>
            <KeyTermsSegment
              content={getContent<KeyTermsContent>(segments, 'key_terms')}
              isLoading={isLoading(segments, 'key_terms')}
              isEink={isEink}
              scale={scale}
            />
          </Auditable>
        </div>
      </div>

      {/* ── Did You Know ──────────────────────────────────────── */}
      <Auditable id="did_you_know" label="Did You Know" auditCallbacks={auditCallbacks}>
        <DidYouKnowSegment
          content={getContent<DidYouKnowContent>(segments, 'did_you_know')}
          isLoading={isLoading(segments, 'did_you_know')}
          isEink={isEink}
          scale={scale}
        />
      </Auditable>

      {/* ── Activity ──────────────────────────────────────────── */}
      <div>
        <SectionDivider label="Activity" isEink={isEink} scale={scale} />
        <div style={{ marginTop: sz(12, scale) }}>
          <Auditable
            id="interaction"
            label="Activity"
            auditCallbacks={auditCallbacks}
            codeContent={getContent(segments, 'interaction') ?? undefined}
            codeType="json"
          >
            <InteractionSegment
              content={getContent<InteractionContent>(segments, 'interaction')}
              isLoading={isLoading(segments, 'interaction')}
              isEink={isEink}
              scale={scale}
            />
          </Auditable>
        </div>
      </div>

      {/* ── Problems ──────────────────────────────────────────── */}
      <div>
        <SectionDivider label="Problems" isEink={isEink} scale={scale} />
        <div style={{ marginTop: sz(12, scale) }}>
          <Auditable id="problems" label="Problems" auditCallbacks={auditCallbacks}>
            <ProblemsSegment
              content={getContent<ProblemsContent>(segments, 'problems')}
              isLoading={isLoading(segments, 'problems')}
              isEink={isEink}
              scale={scale}
            />
          </Auditable>
        </div>
      </div>

      {/* ── Utility sections (condensed) ──────────────────────── */}
      <Auditable id="prerequisites" label="Prerequisites" auditCallbacks={auditCallbacks}>
        <PrerequisitesSegment
          content={getContent<PrerequisitesContent>(segments, 'prerequisites')}
          isLoading={isLoading(segments, 'prerequisites')}
          isEink={isEink}
          scale={scale}
        />
      </Auditable>
      <Auditable id="audio_text" label="Audio Text" auditCallbacks={auditCallbacks}>
        <AudioTextSegment
          content={getContent<AudioTextContent>(segments, 'audio_text')}
          isLoading={isLoading(segments, 'audio_text')}
          isEink={isEink}
          scale={scale}
        />
      </Auditable>
      <Auditable id="youtube_query" label="Videos" auditCallbacks={auditCallbacks}>
        <YoutubeQuerySegment
          content={getContent<YoutubeQueryContent>(segments, 'youtube_query')}
          isLoading={isLoading(segments, 'youtube_query')}
          isEink={isEink}
          scale={scale}
        />
      </Auditable>

      {/* Bottom padding so FAB doesn't cover last section */}
      <div style={{ height: sz(80, scale) }} />
    </div>
  )
}
