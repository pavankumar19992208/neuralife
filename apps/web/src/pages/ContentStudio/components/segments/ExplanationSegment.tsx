import { Skeleton } from '@/components/ui/skeleton'
import type { ConceptExplanationContent } from '../../types'

interface Props {
  content: ConceptExplanationContent | null
  isLoading: boolean
  isEink: boolean
  scale?: number
}

const sz = (px: number, scale: number) => `${Math.round(px / scale)}px`

function renderInline(text: string, isEink: boolean): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ fontWeight: 700, color: isEink ? '#111827' : '#1e40af' }}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

function renderMarkdown(text: string, isEink: boolean, scale: number): React.ReactNode[] {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let key = 0

  for (const line of lines) {
    if (!line.trim()) {
      nodes.push(<div key={key++} style={{ height: sz(6, scale) }} />)
      continue
    }

    const numMatch = line.match(/^(\d+)\.\s+(.+)/)
    if (numMatch) {
      nodes.push(
        <div key={key++} style={{ display: 'flex', gap: sz(8, scale), marginBottom: sz(5, scale) }}>
          <span style={{ fontSize: sz(14, scale), fontWeight: 700, flexShrink: 0, color: isEink ? '#111827' : '#1d4ed8', lineHeight: 1.65, minWidth: sz(20, scale) }}>
            {numMatch[1]}.
          </span>
          <span style={{ fontSize: sz(14, scale), lineHeight: 1.65, color: isEink ? '#1f2937' : '#334155' }}>
            {renderInline(numMatch[2], isEink)}
          </span>
        </div>
      )
      continue
    }

    if (line.match(/^[-*]\s+/)) {
      const c = line.replace(/^[-*]\s+/, '')
      nodes.push(
        <div key={key++} style={{ display: 'flex', gap: sz(8, scale), marginBottom: sz(5, scale) }}>
          <span style={{ flexShrink: 0, fontSize: sz(14, scale), color: isEink ? '#374151' : '#0d9488', lineHeight: 1.65 }}>•</span>
          <span style={{ fontSize: sz(14, scale), lineHeight: 1.65, color: isEink ? '#1f2937' : '#334155' }}>
            {renderInline(c, isEink)}
          </span>
        </div>
      )
      continue
    }

    if (line.startsWith('### ')) {
      nodes.push(
        <p key={key++} style={{ fontSize: sz(15, scale), fontWeight: 700, marginTop: sz(14, scale), marginBottom: sz(5, scale), color: isEink ? '#111827' : '#0f172a', margin: `${sz(14, scale)} 0 ${sz(5, scale)} 0` }}>
          {line.replace('### ', '')}
        </p>
      )
      continue
    }
    if (line.startsWith('## ')) {
      nodes.push(
        <p key={key++} style={{ fontSize: sz(17, scale), fontWeight: 700, marginTop: sz(16, scale), marginBottom: sz(6, scale), color: isEink ? '#111827' : '#0f172a', margin: `${sz(16, scale)} 0 ${sz(6, scale)} 0` }}>
          {line.replace('## ', '')}
        </p>
      )
      continue
    }

    nodes.push(
      <p key={key++} style={{ fontSize: sz(14, scale), lineHeight: 1.65, marginBottom: sz(6, scale), color: isEink ? '#1f2937' : '#374155' }}>
        {renderInline(line, isEink)}
      </p>
    )
  }

  return nodes
}

export default function ExplanationSegment({ content, isLoading, isEink, scale = 1 }: Props) {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: sz(8, scale) }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} style={{ height: sz(14, scale), width: i % 3 === 2 ? '66%' : '100%', borderRadius: Math.round(4 / scale) }} />
        ))}
      </div>
    )
  }

  if (!content) return null

  // Handle both plain string (raw LLM output) and { text: string } object
  const text = typeof content === 'string' ? content : (content as ConceptExplanationContent).text
  if (!text) return null

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {renderMarkdown(text, isEink, scale)}
    </div>
  )
}
