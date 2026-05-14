import { useEffect, useRef, useState, useCallback } from 'react'
import { X, CheckSquare, Square, Loader2, Eye, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'

// Configure worker once at module load via CDN — avoids all Vite worker bundling issues
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

// ── Types ─────────────────────────────────────────────────────────

interface ThumbnailEntry {
  dataUrl: string
  text: string
}

interface Props {
  file: File | null
  onClose: () => void
  onConfirm: (selectedText: string, pageRange: [number, number], pageImages?: string[]) => void
  purpose: 'index' | 'chapter'
  model?: 'claude' | 'gemini'
}

const THUMB_SCALE = 0.3
const BATCH_SIZE = 6
const DEFAULT_MAX_RANGE = 50 // auto-render first N pages for large PDFs

// ── Component ─────────────────────────────────────────────────────

export default function PdfPreviewModal({ file, onClose, onConfirm, purpose, model = 'claude' }: Props) {
  const [docStatus, setDocStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [totalPages, setTotalPages] = useState(0)

  // range inputs (uncontrolled text — validated on apply)
  const [startInput, setStartInput] = useState('1')
  const [endInput, setEndInput] = useState('1')

  // committed range that drives the visible grid
  const [rangeStart, setRangeStart] = useState(1)
  const [rangeEnd, setRangeEnd] = useState(1)

  // thumbnails: pageNum → entry | 'loading' | undefined (not queued)
  const [thumbnails, setThumbnails] = useState<Record<number, ThumbnailEntry | 'loading'>>({})
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
  const [pendingCount, setPendingCount] = useState(0)
  const [extracting, setExtracting] = useState(false)
  const [textWarning, setTextWarning] = useState<string | null>(null)

  const pdfDocRef = useRef<PDFDocumentProxy | null>(null)
  const queuedRef = useRef<Set<number>>(new Set())  // pages already queued (avoid double-render)
  const abortRef = useRef(false)

  // ── Open PDF document ──────────────────────────────────────────

  useEffect(() => {
    if (!file) return
    abortRef.current = false
    queuedRef.current = new Set()
    setDocStatus('loading')
    setErrorMsg('')
    setTotalPages(0)
    setThumbnails({})
    setSelectedPages(new Set())
    setPendingCount(0)

    let cancelled = false

    ;(async () => {
      try {
        const buf = await file.arrayBuffer()
        if (cancelled) return
        const doc = await pdfjsLib.getDocument({ data: buf }).promise
        if (cancelled) { doc.destroy(); return }

        pdfDocRef.current = doc
        const total = doc.numPages
        const initialEnd = Math.min(total, DEFAULT_MAX_RANGE)

        setTotalPages(total)
        setRangeStart(1)
        setRangeEnd(initialEnd)
        setStartInput('1')
        setEndInput(String(initialEnd))
        setSelectedPages(new Set(Array.from({ length: initialEnd }, (_, i) => i + 1)))
        setDocStatus('ready')
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(e instanceof Error ? e.message : 'Failed to open PDF')
          setDocStatus('error')
        }
      }
    })()

    return () => {
      cancelled = true
      abortRef.current = true
      pdfDocRef.current?.destroy()
      pdfDocRef.current = null
    }
  }, [file])

  // ── Render thumbnails for a list of pages ─────────────────────

  const renderPages = useCallback(async (pages: number[]) => {
    const doc = pdfDocRef.current
    if (!doc) return

    const toRender = pages.filter((p) => !queuedRef.current.has(p))
    if (toRender.length === 0) return

    for (const p of toRender) queuedRef.current.add(p)

    setThumbnails((prev) => {
      const next = { ...prev }
      for (const p of toRender) next[p] = 'loading'
      return next
    })
    setPendingCount((c) => c + toRender.length)

    for (let i = 0; i < toRender.length; i += BATCH_SIZE) {
      if (abortRef.current) break
      const batch = toRender.slice(i, i + BATCH_SIZE)

      await Promise.allSettled(
        batch.map(async (pageNum) => {
          if (abortRef.current) return
          try {
            const page = await doc.getPage(pageNum)
            const vp = page.getViewport({ scale: THUMB_SCALE })
            const canvas = document.createElement('canvas')
            canvas.width = vp.width
            canvas.height = vp.height
            const ctx = canvas.getContext('2d')!
            await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise
            const dataUrl = canvas.toDataURL('image/jpeg', 0.75)

            const tc = await page.getTextContent()
            const text = tc.items
              .map((item) => ('str' in item ? item.str : ''))
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim()

            setThumbnails((prev) => ({ ...prev, [pageNum]: { dataUrl, text } }))
          } catch {
            setThumbnails((prev) => ({ ...prev, [pageNum]: { dataUrl: '', text: '' } }))
          } finally {
            setPendingCount((c) => Math.max(0, c - 1))
          }
        }),
      )
    }
  }, [])

  // Trigger render whenever committed range changes
  useEffect(() => {
    if (docStatus !== 'ready') return
    const pages = Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i)
    renderPages(pages)
  }, [docStatus, rangeStart, rangeEnd, renderPages])

  // ── Range controls ────────────────────────────────────────────

  function applyRange() {
    const s = Math.max(1, Math.min(parseInt(startInput) || 1, totalPages))
    const e = Math.max(s, Math.min(parseInt(endInput) || totalPages, totalPages))
    setStartInput(String(s))
    setEndInput(String(e))
    setRangeStart(s)
    setRangeEnd(e)
    setSelectedPages(new Set(Array.from({ length: e - s + 1 }, (_, i) => s + i)))
  }

  function togglePage(n: number) {
    setSelectedPages((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  // ── Confirm — extract text or render images depending on model ─

  async function handleConfirm() {
    const doc = pdfDocRef.current
    if (!doc) return
    setExtracting(true)
    setTextWarning(null)

    const sorted = [...selectedPages].sort((a, b) => a - b)
    const min = sorted[0] ?? rangeStart
    const max = sorted[sorted.length - 1] ?? rangeEnd

    // Vision path — Gemini reads page images directly (accurate for Telugu/complex scripts)
    if (model === 'gemini' && purpose === 'index') {
      const pageImages: string[] = []
      for (const pageNum of sorted) {
        try {
          const page = await doc.getPage(pageNum)
          const vp = page.getViewport({ scale: 1.5 })
          const canvas = document.createElement('canvas')
          canvas.width = vp.width
          canvas.height = vp.height
          const ctx = canvas.getContext('2d')!
          await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise
          pageImages.push(canvas.toDataURL('image/jpeg', 0.85))
        } catch { /* skip unrenderable pages */ }
      }
      if (pageImages.length === 0) {
        setTextWarning('Could not render page images. Try a different page selection.')
        setExtracting(false)
        return
      }
      onConfirm('', [min, max], pageImages)
      setExtracting(false)
      return
    }

    // Text path — for Claude or chapter PDFs
    const texts: string[] = []
    for (const pageNum of sorted) {
      const cached = thumbnails[pageNum]
      if (cached && cached !== 'loading') {
        if (cached.text) texts.push(cached.text)
      } else {
        try {
          const page = await doc.getPage(pageNum)
          const tc = await page.getTextContent()
          const text = tc.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim()
          if (text) texts.push(text)
        } catch { /* skip */ }
      }
    }

    const combined = texts.join('\n\n')
    if (combined.trim().length < 10) {
      setTextWarning(
        'No text could be extracted from the selected pages. This PDF appears to be image-based (scanned). ' +
        'Try switching to Gemini (uses visual page reading) or select pages containing visible text.',
      )
      setExtracting(false)
      return
    }

    onConfirm(combined, [min, max])
    setExtracting(false)
  }

  // ── Derived values ────────────────────────────────────────────

  const visiblePages = Array.from(
    { length: rangeEnd - rangeStart + 1 },
    (_, i) => rangeStart + i,
  )
  const selectedCount = selectedPages.size
  const renderedCount = visiblePages.filter(
    (p) => thumbnails[p] && thumbnails[p] !== 'loading',
  ).length

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="flex flex-col w-full max-w-5xl bg-white rounded-2xl overflow-hidden shadow-2xl"
        style={{ height: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {purpose === 'index' ? 'Select Index Pages' : 'Select Chapter Pages'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {docStatus === 'loading' && 'Opening PDF…'}
              {docStatus === 'error' && (
                <span className="text-red-500">{errorMsg}</span>
              )}
              {docStatus === 'ready' && (
                pendingCount > 0
                  ? `Rendering… ${renderedCount} / ${visiblePages.length} visible pages`
                  : `${totalPages} pages total · ${selectedCount} selected · click pages or set range`
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Range picker — visible as soon as doc is parsed */}
        {docStatus === 'ready' && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-2.5 border-b border-slate-100 bg-white flex-shrink-0">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Range:</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyRange()}
                className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs text-center focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-xs text-slate-400">–</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyRange()}
                className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs text-center focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-[10px] text-slate-400 tabular-nums">/ {totalPages}</span>
            </div>
            <button
              onClick={applyRange}
              className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors whitespace-nowrap"
            >
              <Eye className="h-3 w-3" />
              Preview Range
            </button>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setSelectedPages(new Set(visiblePages))}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedPages(new Set())}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Page grid */}
        <div
          className="flex-1 overflow-y-auto p-4 bg-slate-100"
          style={{ overscrollBehavior: 'contain', willChange: 'scroll-position' }}
        >
          {docStatus === 'loading' && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Opening PDF…</p>
            </div>
          )}

          {docStatus === 'error' && (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <p className="text-sm font-medium text-red-600">Could not open PDF</p>
              <p className="text-xs text-slate-500">{errorMsg}</p>
            </div>
          )}

          {docStatus === 'ready' && (
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}
            >
              {visiblePages.map((pageNum) => {
                const entry = thumbnails[pageNum]
                const isLoadingThumb = !entry || entry === 'loading'
                const selected = selectedPages.has(pageNum)

                return (
                  <div
                    key={pageNum}
                    onClick={() => togglePage(pageNum)}
                    className={`
                      flex flex-col items-center gap-1.5 cursor-pointer rounded-xl p-1.5 transition-all select-none
                      ${selected
                        ? 'bg-primary/10 ring-2 ring-primary'
                        : 'bg-white hover:bg-slate-50 ring-1 ring-slate-200 hover:ring-slate-300'
                      }
                    `}
                  >
                    <div className="w-full aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden">
                      {isLoadingThumb ? (
                        <Skeleton className="w-full h-full rounded-none" />
                      ) : entry.dataUrl ? (
                        <img
                          src={entry.dataUrl}
                          alt={`Page ${pageNum}`}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px]">
                          No preview
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {selected
                        ? <CheckSquare className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        : <Square className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                      }
                      <span className={`text-[10px] font-medium ${selected ? 'text-primary' : 'text-slate-500'}`}>
                        {pageNum}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Text warning — scanned/image PDF */}
        {textWarning && (
          <div className="flex items-start gap-2 px-5 py-3 border-t border-amber-200 bg-amber-50 flex-shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-amber-800 leading-relaxed">{textWarning}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 bg-white flex-shrink-0">
          <p className="text-xs text-slate-500">
            {selectedCount > 0 ? (
              model === 'gemini' && purpose === 'index'
                ? <>{selectedCount} page{selectedCount !== 1 ? 's' : ''} selected — <span className="font-medium text-blue-600">images sent to Gemini</span> (reads Telugu accurately)</>
                : `${selectedCount} page${selectedCount !== 1 ? 's' : ''} selected — text sent to Claude`
            ) : 'Select at least one page'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={selectedCount === 0 || extracting || docStatus !== 'ready'}
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              {extracting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Parse {selectedCount} Page{selectedCount !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
