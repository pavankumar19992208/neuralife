import { Skeleton } from '@/components/ui/skeleton'
import type { KeyTermsContent, KeyTerm } from '../../types'

interface Props {
  content: KeyTermsContent | null
  isLoading: boolean
  isEink: boolean
  scale?: number
}

const sz = (px: number, scale: number) => `${Math.round(px / scale)}px`

export default function KeyTermsSegment({ content, isLoading, isEink, scale = 1 }: Props) {
  const gap = Math.round(10 / scale)
  const p = Math.round(14 / scale)
  const r = Math.round(12 / scale)

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{
            borderRadius: r, padding: p,
            background: isEink ? '#f9fafb' : '#eff6ff',
            border: `${Math.round(1 / scale)}px solid ${isEink ? '#d1d5db' : '#bfdbfe'}`,
          }}>
            <Skeleton style={{ height: sz(12, scale), width: '55%', marginBottom: sz(6, scale), borderRadius: Math.round(3 / scale) }} />
            <Skeleton style={{ height: sz(11, scale), width: '100%', borderRadius: Math.round(3 / scale) }} />
          </div>
        ))}
      </div>
    )
  }

  // Handle both raw array (LLM output) and { terms: [...] } wrapper
  const terms: KeyTerm[] = Array.isArray(content)
    ? (content as unknown as KeyTerm[])
    : (content?.terms ?? [])

  if (!terms.length) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap }}>
      {terms.map((kt, i) => (
        <div
          key={i}
          style={{
            borderRadius: r,
            padding: p,
            background: isEink ? '#ffffff' : '#eff6ff',
            border: `${Math.round(1 / scale)}px solid ${isEink ? '#111827' : '#bfdbfe'}`,
          }}
        >
          <p style={{ fontSize: sz(13, scale), fontWeight: 700, marginBottom: sz(4, scale), color: isEink ? '#111827' : '#1e40af', lineHeight: 1.4, margin: `0 0 ${sz(4, scale)} 0` }}>
            {kt.term}
          </p>
          <p style={{ fontSize: sz(12, scale), lineHeight: 1.55, color: isEink ? '#374151' : '#475569', margin: 0 }}>
            {kt.definition}
          </p>
          {kt.example && (
            <p style={{ fontSize: sz(11, scale), marginTop: sz(4, scale), fontStyle: 'italic', color: isEink ? '#6b7280' : '#60a5fa', margin: `${sz(4, scale)} 0 0 0` }}>
              e.g. {kt.example}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
