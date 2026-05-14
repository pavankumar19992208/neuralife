import { Skeleton } from '@/components/ui/skeleton'
import type { ConceptSummaryContent } from '../../types'

interface Props {
  content: ConceptSummaryContent | null
  isLoading: boolean
  isEink: boolean
  scale?: number
}

const sz = (px: number, scale: number) => `${Math.round(px / scale)}px`

export default function ConceptSummarySegment({ content, isLoading, isEink, scale = 1 }: Props) {
  const p = Math.round(20 / scale)
  const r = Math.round(16 / scale)

  if (isLoading) {
    return (
      <div style={{
        borderRadius: r,
        padding: p,
        background: isEink ? '#f3f4f6' : 'linear-gradient(135deg, #1e40af, #1d4ed8)',
        border: isEink ? `${Math.round(2 / scale)}px solid #111827` : 'none',
      }}>
        <Skeleton style={{
          height: sz(18, scale),
          width: '75%',
          borderRadius: Math.round(4 / scale),
          background: isEink ? '#d1d5db' : 'rgba(255,255,255,0.3)',
        }} />
      </div>
    )
  }

  if (!content) return null

  // Handle both plain string (raw LLM output) and { text: string } object
  const text = typeof content === 'string' ? content : (content as ConceptSummaryContent).text
  if (!text) return null

  return (
    <div style={{
      borderRadius: r,
      padding: p,
      background: isEink
        ? '#f3f4f6'
        : 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)',
      border: isEink ? `${Math.round(2 / scale)}px solid #111827` : 'none',
      boxShadow: isEink ? 'none' : '0 4px 16px rgba(30,64,175,0.25)',
    }}>
      <p style={{
        fontSize: sz(15, scale),
        fontWeight: 700,
        lineHeight: 1.55,
        color: isEink ? '#111827' : '#ffffff',
        fontFamily: 'Inter, sans-serif',
        margin: 0,
      }}>
        {text}
      </p>
    </div>
  )
}
