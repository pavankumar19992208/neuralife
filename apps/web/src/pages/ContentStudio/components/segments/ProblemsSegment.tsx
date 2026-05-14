import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProblemsContent, Problem } from '../../types'

interface Props {
  content: ProblemsContent | null
  isLoading: boolean
  isEink: boolean
  scale?: number
}

const sz = (px: number, scale: number) => `${Math.round(px / scale)}px`

const DIFFICULTY_CONFIG = {
  foundation: { label: 'Foundation', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  standard:   { label: 'Standard',   color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  advanced:   { label: 'Advanced',   color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
} as const

function ProblemCard({ problem, index, isEink, scale }: { problem: Problem; index: number; isEink: boolean; scale: number }) {
  const [showHints, setShowHints] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [revealedHints, setRevealedHints] = useState(0)

  const p = Math.round(12 / scale)
  const r = Math.round(10 / scale)
  const btnR = Math.round(999 / scale)
  const btnPad = `${Math.round(3 / scale)}px ${Math.round(10 / scale)}px`

  return (
    <div style={{
      borderRadius: r, padding: p, marginBottom: sz(8, scale),
      background: '#ffffff',
      border: `${Math.round(1 / scale)}px solid ${isEink ? '#111827' : '#e2e8f0'}`,
    }}>
      <div style={{ display: 'flex', gap: sz(8, scale) }}>
        <span style={{ fontSize: sz(13, scale), fontWeight: 700, flexShrink: 0, color: isEink ? '#6b7280' : '#94a3b8', lineHeight: 1.6 }}>
          {index + 1}.
        </span>
        <p style={{ fontSize: sz(13, scale), lineHeight: 1.6, flex: 1, color: isEink ? '#111827' : '#1e293b', margin: 0 }}>
          {problem.text}
        </p>
      </div>

      <div style={{ marginTop: sz(8, scale), display: 'flex', gap: sz(6, scale) }}>
        <button
          onClick={() => { setShowHints(!showHints); if (!showHints) setRevealedHints(1) }}
          style={{
            fontSize: sz(11, scale), borderRadius: btnR, padding: btnPad, cursor: 'pointer',
            background: isEink ? '#ffffff' : '#fffbeb',
            border: `${Math.round(1 / scale)}px solid ${isEink ? '#9ca3af' : '#fcd34d'}`,
            color: isEink ? '#374151' : '#92400e',
          }}
        >
          💡 Hints
        </button>
        <button
          onClick={() => setShowSolution(!showSolution)}
          style={{
            fontSize: sz(11, scale), borderRadius: btnR, padding: btnPad, cursor: 'pointer',
            background: isEink ? '#ffffff' : '#f0fdf4',
            border: `${Math.round(1 / scale)}px solid ${isEink ? '#9ca3af' : '#86efac'}`,
            color: isEink ? '#374151' : '#166534',
          }}
        >
          ✓ Answer
        </button>
      </div>

      {showHints && (
        <div style={{ marginTop: sz(8, scale), display: 'flex', flexDirection: 'column', gap: sz(4, scale) }}>
          {problem.hints.slice(0, revealedHints).map((h, i) => (
            <div key={i} style={{
              borderRadius: Math.round(8 / scale), padding: Math.round(8 / scale),
              fontSize: sz(11, scale), lineHeight: 1.55,
              background: isEink ? '#fffbeb' : '#fffbeb',
              border: `${Math.round(1 / scale)}px solid ${isEink ? '#fcd34d' : '#fcd34d'}`,
              color: isEink ? '#374151' : '#78350f',
            }}>
              <span style={{ fontWeight: 600 }}>Hint {i + 1}:</span> {h}
            </div>
          ))}
          {revealedHints < problem.hints.length && (
            <button
              onClick={() => setRevealedHints((n) => n + 1)}
              style={{ fontSize: sz(11, scale), color: isEink ? '#6b7280' : '#d97706', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
            >
              Show next hint
            </button>
          )}
        </div>
      )}

      {showSolution && (
        <div style={{
          marginTop: sz(8, scale), borderRadius: Math.round(8 / scale), padding: Math.round(10 / scale),
          background: isEink ? '#f0fdf4' : '#f0fdf4',
          border: `${Math.round(1 / scale)}px solid ${isEink ? '#86efac' : '#86efac'}`,
        }}>
          <p style={{ fontSize: sz(12, scale), fontWeight: 700, marginBottom: sz(4, scale), color: isEink ? '#111827' : '#166534', margin: `0 0 ${sz(4, scale)} 0` }}>
            Answer: {problem.solution}
          </p>
          {problem.solution_steps?.length > 0 && (
            <ol style={{ margin: 0, paddingLeft: sz(16, scale), display: 'flex', flexDirection: 'column', gap: sz(3, scale), listStyle: 'none', padding: 0 }}>
              {problem.solution_steps.map((s, i) => (
                <li key={i} style={{ fontSize: sz(11, scale), lineHeight: 1.55, color: isEink ? '#374151' : '#15803d' }}>
                  {i + 1}. {s}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProblemsSegment({ content, isLoading, isEink, scale = 1 }: Props) {
  const [activeTab, setActiveTab] = useState<'foundation' | 'standard' | 'advanced'>('foundation')
  const [expanded, setExpanded] = useState(true)

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: sz(8, scale) }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ borderRadius: Math.round(10 / scale), padding: Math.round(12 / scale), background: isEink ? '#f9fafb' : '#f8fafc' }}>
            <Skeleton style={{ height: sz(12, scale), width: '100%', marginBottom: sz(6, scale), borderRadius: Math.round(3 / scale) }} />
            <Skeleton style={{ height: sz(12, scale), width: '66%', borderRadius: Math.round(3 / scale) }} />
          </div>
        ))}
      </div>
    )
  }

  if (!content) return null

  const tabs = (['foundation', 'standard', 'advanced'] as const)
  const activeProblems = content[activeTab] ?? []
  const totalCount = (content.foundation?.length ?? 0) + (content.standard?.length ?? 0) + (content.advanced?.length ?? 0)

  const headerP = `${Math.round(10 / scale)}px ${Math.round(14 / scale)}px`
  const r = Math.round(12 / scale)
  const tabR = Math.round(8 / scale)
  const tabP = `${Math.round(8 / scale)}px ${Math.round(4 / scale)}px`

  return (
    <div style={{
      borderRadius: r, overflow: 'hidden',
      border: `${Math.round(isEink ? 2 : 1 / scale)}px solid ${isEink ? '#111827' : '#e2e8f0'}`,
    }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: headerP, cursor: 'pointer', background: isEink ? '#f3f4f6' : '#f8fafc' }}
        onClick={() => setExpanded((e) => !e)}
      >
        <p style={{ fontSize: sz(13, scale), fontWeight: 700, color: isEink ? '#111827' : '#1e293b', margin: 0 }}>
          Problem Set ({totalCount} problems)
        </p>
        {expanded
          ? <ChevronUp style={{ width: sz(14, scale), height: sz(14, scale), color: '#94a3b8' }} />
          : <ChevronDown style={{ width: sz(14, scale), height: sz(14, scale), color: '#94a3b8' }} />
        }
      </div>

      {expanded && (
        <div style={{ padding: Math.round(12 / scale) }}>
          <div style={{ display: 'flex', gap: sz(6, scale), marginBottom: sz(12, scale) }}>
            {tabs.map((tab) => {
              const c = DIFFICULTY_CONFIG[tab]
              const count = content[tab]?.length ?? 0
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1, padding: tabP, borderRadius: tabR, cursor: 'pointer',
                    fontSize: sz(11, scale), fontWeight: 600, border: 'none',
                    background: activeTab === tab
                      ? (isEink ? '#111827' : c.color)
                      : (isEink ? '#ffffff' : '#ffffff'),
                    color: activeTab === tab
                      ? '#ffffff'
                      : (isEink ? '#4b5563' : '#64748b'),
                    boxShadow: activeTab === tab ? 'none' : `inset 0 0 0 ${Math.round(1 / scale)}px #e2e8f0`,
                  }}
                >
                  {c.label} ({count})
                </button>
              )
            })}
          </div>

          <div style={{ maxHeight: sz(340, scale), overflowY: 'auto' }}>
            {activeProblems.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: sz(12, scale), color: '#94a3b8', padding: sz(16, scale) }}>
                No problems in this tier
              </p>
            ) : (
              activeProblems.slice(0, 5).map((p, i) => (
                <ProblemCard key={p.id ?? i} problem={p} index={i} isEink={isEink} scale={scale} />
              ))
            )}
            {activeProblems.length > 5 && (
              <p style={{ textAlign: 'center', fontSize: sz(11, scale), color: '#94a3b8', padding: sz(8, scale) }}>
                +{activeProblems.length - 5} more problems
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
