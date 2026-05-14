import { Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import type { SegmentMap, RenderMode, SingleMedium, DeviceType } from '../types'
import { DEVICE_DIMENSIONS } from '../types'
import type { TopicProgress } from '../hooks/useContentStudio'
import ContentViewer from './ContentViewer'

interface Props {
  chapterTitle: string
  chapterNumber: number
  progress: TopicProgress[]
  segmentsMap: Record<string, Partial<Record<SingleMedium, SegmentMap>>>
  activeMedium: SingleMedium
  renderMode: RenderMode
  deviceType?: DeviceType
}

const sz = (px: number, scale: number) => `${Math.round(px / scale)}px`

export default function AllTopicsViewer({
  chapterTitle,
  chapterNumber,
  progress,
  segmentsMap,
  activeMedium,
  renderMode,
  deviceType = 'smartpad',
}: Props) {
  const isEink = renderMode === 'eink'
  const scale = DEVICE_DIMENSIONS[deviceType].scale
  const bgColor = isEink ? '#f5f5f0' : '#ffffff'
  const borderColor = isEink ? '#9ca3af' : '#e2e8f0'

  if (progress.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: sz(48, scale), textAlign: 'center', background: bgColor, minHeight: '100%' }}>
        <Loader2 style={{ width: sz(24, scale), height: sz(24, scale), color: '#1e40af', animation: 'spin 1s linear infinite', marginBottom: sz(12, scale) }} />
        <p style={{ fontSize: sz(13, scale), color: '#94a3b8' }}>Preparing topics…</p>
      </div>
    )
  }

  const doneCount = progress.filter((t) => t.status === 'done').length

  return (
    <div style={{ backgroundColor: bgColor, minHeight: '100%', fontFamily: 'Inter, sans-serif' }}>
      {/* ── Chapter header ──────────────────────────────────────── */}
      <div style={{
        padding: `${sz(20, scale)} ${sz(24, scale)} ${sz(16, scale)}`,
        borderBottom: `${Math.round(2 / scale)}px solid ${borderColor}`,
        background: isEink ? '#ececea' : '#f8fafc',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: sz(12, scale) }}>
          <div style={{
            width: sz(36, scale), height: sz(36, scale),
            borderRadius: sz(10, scale),
            background: isEink ? '#111827' : '#1e40af',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: sz(14, scale), fontWeight: 800, color: '#ffffff' }}>
              {chapterNumber}
            </span>
          </div>
          <div>
            <p style={{ fontSize: sz(10, scale), fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: isEink ? '#6b7280' : '#94a3b8', margin: `0 0 ${sz(3, scale)} 0` }}>
              Chapter {chapterNumber}
            </p>
            <h2 style={{ fontSize: sz(18, scale), fontWeight: 800, lineHeight: 1.25, color: isEink ? '#111827' : '#0f172a', margin: 0 }}>
              {chapterTitle}
            </h2>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: sz(12, scale) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: sz(5, scale) }}>
            <span style={{ fontSize: sz(11, scale), color: isEink ? '#6b7280' : '#64748b' }}>
              {doneCount} of {progress.length} topics generated
            </span>
            <span style={{ fontSize: sz(11, scale), fontWeight: 600, color: isEink ? '#111827' : '#1e40af' }}>
              {Math.round((doneCount / progress.length) * 100)}%
            </span>
          </div>
          <div style={{ height: sz(4, scale), borderRadius: sz(999, scale), background: isEink ? '#d1d5db' : '#e2e8f0', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.round((doneCount / progress.length) * 100)}%`,
              borderRadius: sz(999, scale),
              background: isEink ? '#374151' : '#1e40af',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      </div>

      {/* ── Topic list ──────────────────────────────────────────── */}
      {progress.map((tp, idx) => {
        const topicSegments = segmentsMap[tp.topicId]?.[activeMedium]
        const topicPad = `${sz(16, scale)} ${sz(24, scale)}`

        return (
          <div key={tp.topicId}>
            {/* Topic separator */}
            {idx > 0 && (
              <div style={{ height: Math.round(6 / scale), background: isEink ? '#e5e7eb' : '#f1f5f9' }} />
            )}

            {/* ── Topic header ───────────────────────────────── */}
            <div style={{
              padding: topicPad,
              background: tp.status === 'generating'
                ? (isEink ? '#f3f4f6' : '#eff6ff')
                : (isEink ? '#f5f5f0' : '#ffffff'),
              borderBottom: `${Math.round(1 / scale)}px solid ${borderColor}`,
              display: 'flex', alignItems: 'flex-start', gap: sz(12, scale),
            }}>
              {/* Status icon */}
              <div style={{ flexShrink: 0, marginTop: sz(2, scale) }}>
                {tp.status === 'done' && (
                  <CheckCircle2 style={{ width: sz(18, scale), height: sz(18, scale), color: isEink ? '#374151' : '#10b981' }} />
                )}
                {tp.status === 'generating' && (
                  <Loader2 style={{ width: sz(18, scale), height: sz(18, scale), color: isEink ? '#374151' : '#1e40af', animation: 'spin 1s linear infinite' }} />
                )}
                {tp.status === 'pending' && (
                  <Clock style={{ width: sz(18, scale), height: sz(18, scale), color: isEink ? '#9ca3af' : '#cbd5e1' }} />
                )}
                {tp.status === 'error' && (
                  <AlertCircle style={{ width: sz(18, scale), height: sz(18, scale), color: isEink ? '#374151' : '#ef4444' }} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: sz(10, scale), flexWrap: 'wrap' as const }}>
                  <p style={{ fontSize: sz(10, scale), fontWeight: 700, color: isEink ? '#6b7280' : '#94a3b8', letterSpacing: '0.06em', margin: 0 }}>
                    TOPIC {tp.topicNumber}
                  </p>
                  {tp.status === 'generating' && (
                    <span style={{
                      fontSize: sz(10, scale), fontWeight: 600,
                      padding: `${sz(2, scale)} ${sz(8, scale)}`,
                      borderRadius: sz(999, scale),
                      background: isEink ? '#e5e7eb' : '#dbeafe',
                      color: isEink ? '#374151' : '#1e40af',
                    }}>
                      Generating…
                    </span>
                  )}
                  {tp.status === 'done' && (
                    <span style={{
                      fontSize: sz(10, scale), fontWeight: 600,
                      padding: `${sz(2, scale)} ${sz(8, scale)}`,
                      borderRadius: sz(999, scale),
                      background: isEink ? '#e5e7eb' : '#dcfce7',
                      color: isEink ? '#374151' : '#166534',
                    }}>
                      Done
                    </span>
                  )}
                </div>
                <h3 style={{
                  fontSize: sz(16, scale), fontWeight: 700, lineHeight: 1.35,
                  color: isEink ? '#111827' : '#0f172a',
                  margin: `${sz(3, scale)} 0 0 0`,
                }}>
                  {tp.topicNumber}. {tp.title}
                </h3>
              </div>
            </div>

            {/* ── Topic content states ─────────────────────── */}
            {tp.status === 'pending' && (
              <div style={{
                margin: `${sz(12, scale)} ${sz(24, scale)}`,
                borderRadius: sz(10, scale), padding: `${sz(12, scale)} ${sz(16, scale)}`,
                background: isEink ? '#f9fafb' : '#f8fafc',
                border: `${Math.round(1 / scale)}px solid ${borderColor}`,
              }}>
                <p style={{ fontSize: sz(12, scale), color: isEink ? '#9ca3af' : '#94a3b8', margin: 0 }}>
                  Waiting to generate…
                </p>
              </div>
            )}

            {tp.status === 'generating' && !topicSegments && (
              <div style={{
                margin: `${sz(12, scale)} ${sz(24, scale)}`,
                borderRadius: sz(10, scale), padding: `${sz(12, scale)} ${sz(16, scale)}`,
                background: isEink ? '#eff6ff' : '#eff6ff',
                border: `${Math.round(1 / scale)}px solid ${isEink ? '#93c5fd' : '#bfdbfe'}`,
                display: 'flex', alignItems: 'center', gap: sz(10, scale),
              }}>
                <Loader2 style={{ width: sz(14, scale), height: sz(14, scale), color: isEink ? '#374151' : '#1e40af', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                <p style={{ fontSize: sz(12, scale), color: isEink ? '#374151' : '#1e40af', margin: 0 }}>
                  Generating content…
                </p>
              </div>
            )}

            {tp.status === 'error' && (
              <div style={{
                margin: `${sz(12, scale)} ${sz(24, scale)}`,
                borderRadius: sz(10, scale), padding: `${sz(12, scale)} ${sz(16, scale)}`,
                background: isEink ? '#fff1f2' : '#fff1f2',
                border: `${Math.round(1 / scale)}px solid ${isEink ? '#fca5a5' : '#fca5a5'}`,
              }}>
                <p style={{ fontSize: sz(12, scale), color: isEink ? '#374151' : '#dc2626', margin: 0 }}>
                  Generation failed for this topic.
                </p>
              </div>
            )}

            {topicSegments && (
              <ContentViewer
                segments={topicSegments}
                renderMode={renderMode}
                deviceType={deviceType}
                medium={activeMedium}
                hideHeader
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
