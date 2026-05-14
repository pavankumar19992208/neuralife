import { useState, useRef, useEffect } from 'react'
import { X, Save, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  title: string
  language: 'svg' | 'html' | 'json'
  code: string
  onSave: (code: string) => void
  onClose: () => void
}

export default function CodeEditorModal({ title, language, code: initialCode, onSave, onClose }: Props) {
  const [draft, setDraft] = useState(initialCode)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  function handleSave() {
    if (language === 'json') {
      try {
        JSON.parse(draft)
      } catch (e) {
        setError(`JSON error: ${e instanceof Error ? e.message : String(e)}`)
        return
      }
    }
    setError(null)
    onSave(draft)
    onClose()
  }

  function handleReset() {
    setDraft(initialCode)
    setError(null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      onClose()
    }
    // Tab inserts spaces instead of losing focus
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = textareaRef.current!
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = draft.substring(0, start) + '  ' + draft.substring(end)
      setDraft(next)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      })
    }
  }

  const langLabel = language === 'svg' ? 'SVG' : language === 'html' ? 'HTML' : 'JSON'
  const hint = language === 'json'
    ? 'Edit JSON — Ctrl+S to save, Tab = 2 spaces'
    : language === 'svg'
    ? 'Edit SVG markup — Ctrl+S to save, Tab = 2 spaces'
    : 'Edit HTML/CSS — Ctrl+S to save, Tab = 2 spaces'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-5xl flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{ height: '70vh', background: '#1e1e2e' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ background: '#16162a', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="px-2 py-0.5 rounded font-mono font-bold uppercase tracking-widest"
              style={{ fontSize: 10, background: '#313244', color: '#cba6f7' }}
            >
              {langLabel}
            </span>
            <span className="text-sm font-semibold" style={{ color: '#cdd6f4' }}>{title}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-colors"
              style={{ color: '#9399b2', background: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#cdd6f4' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9399b2' }}
              title="Reset to original"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
            <Button
              size="sm"
              onClick={handleSave}
              className="h-7 gap-1.5 text-xs bg-primary hover:bg-primary/90"
            >
              <Save className="h-3 w-3" />
              Save
            </Button>
            <button
              onClick={onClose}
              className="ml-1 rounded-lg p-1.5 transition-colors"
              style={{ color: '#9399b2' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#cdd6f4' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9399b2' }}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Error bar */}
        {error && (
          <div
            className="px-5 py-2 flex-shrink-0"
            style={{ background: '#2d1b1b', borderBottom: '1px solid #7f1d1d' }}
          >
            <p className="text-xs font-mono" style={{ color: '#f87171' }}>{error}</p>
          </div>
        )}

        {/* Textarea editor */}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setError(null) }}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="flex-1 resize-none focus:outline-none px-5 py-4 min-h-0"
          style={{
            background: '#1e1e2e',
            color: '#cdd6f4',
            fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
            fontSize: 12.5,
            lineHeight: 1.7,
            caretColor: '#cba6f7',
          }}
        />

        {/* Footer */}
        <div
          className="px-5 py-2 flex-shrink-0 flex items-center justify-between"
          style={{ background: '#16162a', borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span className="text-[10px] font-mono" style={{ color: '#585b70' }}>{hint}</span>
          <span className="text-[10px] font-mono" style={{ color: '#45475a' }}>
            {draft.length.toLocaleString()} chars
          </span>
        </div>
      </div>
    </div>
  )
}
