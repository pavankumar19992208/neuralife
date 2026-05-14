import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  DidYouKnowContent,
  InteractionContent,
  PrerequisitesContent,
  AudioTextContent,
  YoutubeQueryContent,
  YoutubeVideoItem,
  PrerequisiteTopic,
} from '../../types'

const sz = (px: number, scale: number) => `${Math.round(px / scale)}px`

// ── Did You Know ──────────────────────────────────────────────────

interface DidYouKnowProps { content: DidYouKnowContent | null; isLoading: boolean; isEink: boolean; scale?: number }

export function DidYouKnowSegment({ content, isLoading, isEink, scale = 1 }: DidYouKnowProps) {
  if (isLoading) return <Skeleton style={{ height: sz(64, scale), width: '100%', borderRadius: Math.round(12 / scale) }} />
  if (!content) return null

  const fact = typeof content === 'string' ? content : (content as DidYouKnowContent).fact
  if (!fact) return null

  const source = typeof content === 'object' ? (content as DidYouKnowContent).source : undefined
  const p = Math.round(14 / scale)
  const r = Math.round(12 / scale)
  const iconSize = Math.round(22 / scale)

  return (
    <div style={{
      borderRadius: r, padding: p,
      display: 'flex', gap: Math.round(12 / scale), alignItems: 'flex-start',
      background: isEink ? '#fffbeb' : '#fffbeb',
      border: `${Math.round(isEink ? 2 : 1 / scale)}px solid ${isEink ? '#111827' : '#fcd34d'}`,
    }}>
      <span style={{ fontSize: iconSize, flexShrink: 0, lineHeight: 1 }}>💡</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: sz(11, scale), fontWeight: 700, marginBottom: sz(4, scale), color: isEink ? '#111827' : '#92400e', margin: `0 0 ${sz(4, scale)} 0`, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Did You Know?
        </p>
        <p style={{ fontSize: sz(13, scale), lineHeight: 1.6, color: isEink ? '#374151' : '#78350f', margin: 0 }}>
          {fact}
        </p>
        {source && (
          <p style={{ fontSize: sz(11, scale), marginTop: sz(4, scale), fontStyle: 'italic', color: isEink ? '#6b7280' : '#b45309', margin: `${sz(4, scale)} 0 0 0` }}>
            — {source}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Interaction ───────────────────────────────────────────────────

const INTERACTION_ICONS: Record<string, string> = {
  'Tap-to-Sequence': '🔢',
  'Label-the-Diagram': '🏷️',
  'Slider-Parameter': '🎚️',
  'Stylus-Fill-Equation': '✏️',
}

interface InteractionProps { content: InteractionContent | null; isLoading: boolean; isEink: boolean; scale?: number }

function TapToSequenceGame({ steps, isEink, scale }: { steps: string[]; isEink: boolean; scale: number }) {
  const [shuffled] = useState(() => [...steps].sort(() => Math.random() - 0.5))
  const [chosen, setChosen] = useState<string[]>([])
  const [result, setResult] = useState<'idle' | 'correct' | 'wrong'>('idle')

  const remaining = shuffled.filter((s) => !chosen.includes(s))

  function tap(step: string) {
    if (result !== 'idle') return
    const next = [...chosen, step]
    setChosen(next)
    if (next.length === steps.length) {
      setResult(next.every((s, i) => s === steps[i]) ? 'correct' : 'wrong')
    }
  }

  function reset() {
    setChosen([])
    setResult('idle')
  }

  const pillR = Math.round(6 / scale)
  const fs = sz(11, scale)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: Math.round(10 / scale) }}>
      {/* Chosen sequence */}
      <div style={{ minHeight: sz(36, scale) }}>
        <p style={{ fontSize: sz(10, scale), fontWeight: 700, color: isEink ? '#6b7280' : '#94a3b8', margin: `0 0 ${sz(4, scale)} 0`, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Your order
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: Math.round(4 / scale) }}>
          {chosen.map((s, i) => (
            <span key={i} style={{
              fontSize: fs, borderRadius: pillR, padding: `${Math.round(3 / scale)}px ${Math.round(8 / scale)}px`,
              background: result === 'correct' ? (isEink ? '#d1fae5' : '#d1fae5') : result === 'wrong' ? '#fee2e2' : (isEink ? '#e5e7eb' : '#dbeafe'),
              color: result === 'correct' ? '#065f46' : result === 'wrong' ? '#991b1b' : (isEink ? '#111827' : '#1e40af'),
              border: `${Math.round(1 / scale)}px solid ${result === 'correct' ? '#6ee7b7' : result === 'wrong' ? '#fca5a5' : (isEink ? '#9ca3af' : '#93c5fd')}`,
              fontWeight: 600,
            }}>
              {i + 1}. {s}
            </span>
          ))}
          {chosen.length === 0 && (
            <span style={{ fontSize: fs, color: isEink ? '#9ca3af' : '#94a3b8', fontStyle: 'italic' }}>Tap steps below to arrange them…</span>
          )}
        </div>
      </div>

      {/* Remaining steps to tap */}
      {result === 'idle' && remaining.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: Math.round(4 / scale) }}>
          {remaining.map((s, i) => (
            <button
              key={i}
              onClick={() => tap(s)}
              style={{
                fontSize: fs, borderRadius: pillR, padding: `${Math.round(4 / scale)}px ${Math.round(10 / scale)}px`,
                background: isEink ? '#ffffff' : '#f0fdfa',
                border: `${Math.round(1 / scale)}px solid ${isEink ? '#111827' : '#0d9488'}`,
                color: isEink ? '#111827' : '#0f766e',
                cursor: 'pointer', fontWeight: 500,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Result feedback */}
      {result !== 'idle' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(8 / scale) }}>
          <span style={{ fontSize: sz(16, scale) }}>{result === 'correct' ? '✅' : '❌'}</span>
          <p style={{ fontSize: fs, fontWeight: 700, color: result === 'correct' ? '#065f46' : '#991b1b', margin: 0 }}>
            {result === 'correct' ? 'Correct! Well done.' : 'Not quite — try again.'}
          </p>
          <button
            onClick={reset}
            style={{
              fontSize: sz(10, scale), borderRadius: pillR, padding: `${Math.round(2 / scale)}px ${Math.round(8 / scale)}px`,
              background: 'transparent', border: `${Math.round(1 / scale)}px solid ${isEink ? '#9ca3af' : '#cbd5e1'}`,
              color: isEink ? '#6b7280' : '#64748b', cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}

export function InteractionSegment({ content, isLoading, isEink, scale = 1 }: InteractionProps) {
  if (isLoading) return <Skeleton style={{ height: sz(72, scale), width: '100%', borderRadius: Math.round(12 / scale) }} />
  if (!content) return null

  const icon = INTERACTION_ICONS[content.type] ?? '🎮'
  const p = Math.round(14 / scale)
  const r = Math.round(12 / scale)
  const innerR = Math.round(8 / scale)
  const iconSize = Math.round(20 / scale)
  const hasGame = content.type === 'Tap-to-Sequence' && content.steps && content.steps.length > 1

  return (
    <div style={{
      borderRadius: r, padding: p,
      background: isEink ? '#f0fdf4' : '#f0fdfa',
      border: `${Math.round(isEink ? 2 : 1 / scale)}px solid ${isEink ? '#111827' : '#99f6e4'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(10 / scale), marginBottom: sz(8, scale) }}>
        <span style={{ fontSize: iconSize, lineHeight: 1 }}>{icon}</span>
        <div>
          <p style={{ fontSize: sz(12, scale), fontWeight: 700, color: isEink ? '#111827' : '#0f766e', margin: 0 }}>
            Activity: {content.type}
          </p>
          <p style={{ fontSize: sz(11, scale), color: isEink ? '#6b7280' : '#0d9488', margin: 0 }}>
            {content.description}
          </p>
        </div>
      </div>
      {hasGame ? (
        <TapToSequenceGame steps={content.steps!} isEink={isEink} scale={scale} />
      ) : (
        <div style={{
          borderRadius: innerR, padding: Math.round(10 / scale),
          background: isEink ? '#ffffff' : '#ccfbf1',
          border: `${Math.round(1 / scale)}px solid ${isEink ? '#9ca3af' : '#99f6e4'}`,
        }}>
          <p style={{ fontSize: sz(12, scale), lineHeight: 1.6, color: isEink ? '#374151' : '#0f766e', margin: 0 }}>
            {content.instructions}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Prerequisites ─────────────────────────────────────────────────

interface PrerequisitesProps { content: PrerequisitesContent | null; isLoading: boolean; isEink: boolean; scale?: number }

export function PrerequisitesSegment({ content, isLoading, isEink, scale = 1 }: PrerequisitesProps) {
  if (isLoading) return <Skeleton style={{ height: sz(48, scale), width: '100%', borderRadius: Math.round(10 / scale) }} />

  // Handle both raw array (LLM output) and { topics: [...] } wrapper
  const topics: PrerequisiteTopic[] = Array.isArray(content)
    ? (content as unknown as PrerequisiteTopic[])
    : (content?.topics ?? [])

  if (!topics.length) return null

  const p = Math.round(12 / scale)
  const r = Math.round(10 / scale)
  const pillR = Math.round(999 / scale)

  return (
    <div style={{
      borderRadius: r, padding: p,
      background: isEink ? '#f9fafb' : '#f8fafc',
      border: `${Math.round(1 / scale)}px solid ${isEink ? '#9ca3af' : '#e2e8f0'}`,
    }}>
      <p style={{ fontSize: sz(10, scale), fontWeight: 700, marginBottom: sz(8, scale), color: isEink ? '#6b7280' : '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: `0 0 ${sz(8, scale)} 0` }}>
        Prerequisites
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: Math.round(6 / scale) }}>
        {topics.map((t, i) => (
          <span key={i} style={{
            fontSize: sz(11, scale), borderRadius: pillR,
            padding: `${Math.round(3 / scale)}px ${Math.round(10 / scale)}px`,
            background: isEink ? '#ffffff' : '#ffffff',
            border: `${Math.round(1 / scale)}px solid ${isEink ? '#111827' : '#cbd5e1'}`,
            color: isEink ? '#374151' : '#475569',
          }}>
            Class {t.class_year} · {t.subject} — {t.title}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Audio Text ────────────────────────────────────────────────────

interface AudioTextProps { content: AudioTextContent | null; isLoading: boolean; isEink: boolean; scale?: number }

export function AudioTextSegment({ content, isLoading, isEink, scale = 1 }: AudioTextProps) {
  if (isLoading) return <Skeleton style={{ height: sz(40, scale), width: '100%', borderRadius: Math.round(10 / scale) }} />
  if (!content) return null

  // Handle both plain string and { text } object
  const text = typeof content === 'string' ? content : (content as AudioTextContent).text
  if (!text) return null

  const p = Math.round(12 / scale)
  const r = Math.round(10 / scale)

  return (
    <div style={{
      borderRadius: r, padding: p,
      display: 'flex', alignItems: 'flex-start', gap: Math.round(10 / scale),
      background: isEink ? '#f9fafb' : '#f8fafc',
      border: `${Math.round(1 / scale)}px solid ${isEink ? '#9ca3af' : '#e2e8f0'}`,
    }}>
      <span style={{ fontSize: sz(14, scale), flexShrink: 0, lineHeight: 1, marginTop: sz(2, scale) }}>🔊</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: sz(10, scale), fontWeight: 600, marginBottom: sz(4, scale), color: isEink ? '#6b7280' : '#94a3b8', margin: `0 0 ${sz(4, scale)} 0` }}>
          TTS Audio Text
        </p>
        <p style={{ fontSize: sz(11, scale), lineHeight: 1.55, color: isEink ? '#4b5563' : '#475569', margin: 0,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const }}>
          {text}
        </p>
      </div>
    </div>
  )
}

// ── YouTube Videos with Checklist ────────────────────────────────

interface YoutubeQueryProps { content: YoutubeQueryContent | null; isLoading: boolean; isEink: boolean; scale?: number }

export function YoutubeQuerySegment({ content, isLoading, isEink, scale = 1 }: YoutubeQueryProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set())

  if (isLoading) return <Skeleton style={{ height: sz(80, scale), width: '100%', borderRadius: Math.round(10 / scale) }} />
  if (!content) return null

  // Normalise: legacy string format → treat as single search-URL video
  const videos: YoutubeVideoItem[] = (() => {
    if (typeof content === 'string') {
      return [{ title: content as string, channel: '', search_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(content as string)}`, duration_estimate: '', language: 'ENGLISH' as const, why: '' }]
    }
    const c = content as YoutubeQueryContent
    if (Array.isArray(c.videos)) return c.videos.map((v) => Object.assign({ duration_estimate: '', language: 'ENGLISH' as 'ENGLISH' | 'TELUGU' }, v))
    return []
  })()

  if (!videos.length) return null

  const p = Math.round(12 / scale)
  const r = Math.round(10 / scale)
  const rowR = Math.round(8 / scale)
  const fs = sz(12, scale)
  const fsMeta = sz(10, scale)

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div style={{
      borderRadius: r, padding: p,
      background: isEink ? '#fef9ee' : '#fffbeb',
      border: `${Math.round(1 / scale)}px solid ${isEink ? '#111827' : '#fcd34d'}`,
    }}>
      <p style={{ fontSize: fsMeta, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: isEink ? '#6b7280' : '#92400e', margin: `0 0 ${sz(8, scale)} 0` }}>
        ▶ Recommended Videos — Auditor Checklist
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: Math.round(6 / scale) }}>
        {videos.map((v, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: Math.round(8 / scale),
            borderRadius: rowR, padding: `${Math.round(8 / scale)}px ${Math.round(10 / scale)}px`,
            background: checked.has(i) ? (isEink ? '#d1fae5' : '#d1fae5') : (isEink ? '#ffffff' : '#ffffff'),
            border: `${Math.round(1 / scale)}px solid ${checked.has(i) ? '#6ee7b7' : (isEink ? '#d1d5db' : '#e9d5ff')}`,
          }}>
            {/* Checkbox */}
            <button
              onClick={() => toggle(i)}
              aria-label={checked.has(i) ? 'Unmark video' : 'Mark video as reviewed'}
              style={{
                flexShrink: 0, width: sz(16, scale), height: sz(16, scale),
                borderRadius: Math.round(4 / scale),
                border: `${Math.round(1.5 / scale)}px solid ${checked.has(i) ? '#10b981' : (isEink ? '#9ca3af' : '#a78bfa')}`,
                background: checked.has(i) ? '#10b981' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: Math.round(2 / scale),
              }}
            >
              {checked.has(i) && <span style={{ fontSize: sz(9, scale), color: '#fff', fontWeight: 900, lineHeight: 1 }}>✓</span>}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <a
                href={v.search_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: fs, fontWeight: 600,
                  color: isEink ? '#111827' : '#cc0000',
                  textDecoration: 'underline', textDecorationColor: isEink ? '#6b7280' : '#fca5a5',
                  display: 'flex', alignItems: 'center', gap: Math.round(5 / scale),
                  marginBottom: Math.round(2 / scale),
                }}
              >
                <span style={{ fontSize: sz(14, scale), flexShrink: 0, lineHeight: 1 }}>▶</span>
                {v.title}
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(6 / scale), flexWrap: 'wrap', marginBottom: Math.round(2 / scale) }}>
                {v.channel && (
                  <span style={{ fontSize: fsMeta, color: isEink ? '#6b7280' : '#6d28d9' }}>
                    {v.channel}
                  </span>
                )}
                {v.language && (
                  <span style={{
                    fontSize: sz(9, scale), fontWeight: 700, letterSpacing: '0.04em',
                    padding: `${Math.round(1 / scale)}px ${Math.round(5 / scale)}px`,
                    borderRadius: Math.round(4 / scale),
                    background: v.language === 'TELUGU' ? (isEink ? '#d1d5db' : '#fde68a') : (isEink ? '#e5e7eb' : '#dbeafe'),
                    color: v.language === 'TELUGU' ? (isEink ? '#374151' : '#92400e') : (isEink ? '#374151' : '#1e40af'),
                  }}>
                    {v.language === 'TELUGU' ? 'TE' : 'EN'}
                  </span>
                )}
                {v.duration_estimate && (
                  <span style={{ fontSize: fsMeta, color: isEink ? '#9ca3af' : '#9ca3af' }}>
                    {v.duration_estimate}
                  </span>
                )}
              </div>
              {v.why && (
                <p style={{ fontSize: fsMeta, fontStyle: 'italic', color: isEink ? '#9ca3af' : '#8b5cf6', margin: `${Math.round(2 / scale)}px 0 0 0` }}>
                  {v.why}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: fsMeta, color: isEink ? '#9ca3af' : '#b45309', margin: `${sz(6, scale)} 0 0 0` }}>
        {checked.size}/{videos.length} reviewed
      </p>
    </div>
  )
}
