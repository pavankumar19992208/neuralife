import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type { SvgDiagramContent, CssDiagramContent, RenderMode } from '../../types'
import CodeEditorModal from '../CodeEditorModal'

interface Props {
  svgContent: SvgDiagramContent | null
  cssContent: CssDiagramContent | null
  svgLoading: boolean
  cssLoading: boolean
  renderMode: RenderMode
  scale?: number
  onEditSvg?: (newContent: SvgDiagramContent) => void
  onEditCss?: (newContent: CssDiagramContent) => void
}

const sz = (px: number, scale: number) => `${Math.round(px / scale)}px`

export default function DiagramSegment({ svgContent, cssContent, svgLoading, cssLoading, renderMode, scale = 1, onEditSvg, onEditCss }: Props) {
  const [activeTab, setActiveTab] = useState<'svg' | 'css'>('svg')
  const [codeModal, setCodeModal] = useState<'svg' | 'css' | null>(null)
  const isEink = renderMode === 'eink'

  const showSvg = isEink ? true : activeTab === 'svg'
  const isLoading = showSvg ? svgLoading : cssLoading
  const hasContent = showSvg ? !!svgContent : !!cssContent

  const r = Math.round(10 / scale)
  const captionPad = `${sz(6, scale)} 0 0 0`

  if (isEink) {
    if (svgLoading) return <DiagramSkeleton scale={scale} />
    if (!svgContent) return null
    return (
      <div>
        <div
          style={{ borderRadius: r, border: `${Math.round(2 / scale)}px solid #111827`, overflow: 'hidden', background: '#ffffff' }}
          dangerouslySetInnerHTML={{ __html: svgContent.svg_code }}
        />
        {svgContent.caption && (
          <p style={{ fontSize: sz(11, scale), textAlign: 'center', color: '#6b7280', fontStyle: 'italic', padding: captionPad }}>
            {svgContent.caption}
          </p>
        )}
      </div>
    )
  }

  const tabR = Math.round(6 / scale)
  const tabPad = `${sz(6, scale)} ${sz(12, scale)}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: sz(8, scale) }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* Tab pills */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: Math.round(8 / scale), padding: Math.round(3 / scale) }}>
          {(['svg', 'css'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: tabPad, borderRadius: tabR, fontSize: sz(11, scale), fontWeight: 500, cursor: 'pointer', border: 'none',
                background: activeTab === tab ? '#ffffff' : 'transparent',
                color: activeTab === tab ? '#0f172a' : '#64748b',
                boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {tab === 'svg' ? '📄 E-Ink SVG' : '🎨 Color CSS'}
            </button>
          ))}
        </div>

        {/* </> edit button — right-aligned */}
        {((activeTab === 'svg' && svgContent && onEditSvg) || (activeTab === 'css' && cssContent && onEditCss)) && (
          <button
            onClick={() => setCodeModal(activeTab)}
            title={`Edit ${activeTab === 'svg' ? 'SVG' : 'HTML'} code`}
            style={{
              marginLeft: 'auto',
              padding: `${sz(4, scale)} ${sz(10, scale)}`,
              borderRadius: Math.round(6 / scale),
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              cursor: 'pointer',
              fontSize: sz(11, scale),
              color: '#64748b',
              fontFamily: 'monospace',
              fontWeight: 700,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            {'</>'}
          </button>
        )}
      </div>

      {isLoading && <DiagramSkeleton scale={scale} />}

      {!isLoading && hasContent && activeTab === 'svg' && svgContent && (
        <div>
          <div
            style={{ borderRadius: r, border: `${Math.round(1 / scale)}px solid #e2e8f0`, overflow: 'hidden', background: '#ffffff' }}
            dangerouslySetInnerHTML={{ __html: svgContent.svg_code }}
          />
          {svgContent.caption && (
            <p style={{ fontSize: sz(11, scale), textAlign: 'center', color: '#64748b', fontStyle: 'italic', padding: captionPad }}>
              {svgContent.caption}
            </p>
          )}
          {svgContent.interaction_hints?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: sz(6, scale), marginTop: sz(6, scale) }}>
              {svgContent.interaction_hints.map((h, i) => (
                <span key={i} style={{
                  fontSize: sz(10, scale), borderRadius: Math.round(999 / scale),
                  padding: `${sz(2, scale)} ${sz(8, scale)}`,
                  background: '#eff6ff', color: '#1d4ed8',
                  border: `${Math.round(1 / scale)}px solid #bfdbfe`,
                }}>
                  👆 {h}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {!isLoading && hasContent && activeTab === 'css' && cssContent && (
        <div>
          <div
            style={{ borderRadius: r, border: `${Math.round(1 / scale)}px solid #e2e8f0`, overflow: 'hidden' }}
            dangerouslySetInnerHTML={{ __html: `<style>${extractCss(cssContent.html)}</style>${stripStyleTag(cssContent.html)}` }}
          />
          {cssContent.caption && (
            <p style={{ fontSize: sz(11, scale), textAlign: 'center', color: '#64748b', fontStyle: 'italic', padding: captionPad }}>
              {cssContent.caption}
            </p>
          )}
        </div>
      )}

      {/* SVG code editor modal */}
      {codeModal === 'svg' && svgContent && onEditSvg && (
        <CodeEditorModal
          title="E-Ink SVG Diagram"
          language="svg"
          code={svgContent.svg_code}
          onSave={(newSvg) => onEditSvg({ ...svgContent, svg_code: newSvg })}
          onClose={() => setCodeModal(null)}
        />
      )}

      {/* CSS/HTML code editor modal */}
      {codeModal === 'css' && cssContent && onEditCss && (
        <CodeEditorModal
          title="Color CSS Diagram"
          language="html"
          code={cssContent.html}
          onSave={(newHtml) => onEditCss({ ...cssContent, html: newHtml })}
          onClose={() => setCodeModal(null)}
        />
      )}
    </div>
  )
}

function DiagramSkeleton({ scale }: { scale: number }) {
  return (
    <div style={{ borderRadius: Math.round(10 / scale), border: `${Math.round(1 / scale)}px solid #e2e8f0`, overflow: 'hidden' }}>
      <Skeleton style={{ width: '100%', height: sz(180, scale) }} />
    </div>
  )
}

function extractCss(html: string): string {
  const match = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
  return match ? match[1] : ''
}

function stripStyleTag(html: string): string {
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
}
