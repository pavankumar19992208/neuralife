import { useState } from 'react'
import { X, Plus, Trash2, Loader2, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Board, Medium } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

// Common AP/TS primary subject suggestions by grade
const SUGGESTIONS: Record<number, string[]> = {
  1: ['Mathematics', 'English', 'Telugu', 'Environmental Science'],
  2: ['Mathematics', 'English', 'Telugu', 'Environmental Science'],
  3: ['Mathematics', 'English', 'Telugu', 'Environmental Science', 'Hindi'],
  4: ['Mathematics', 'English', 'Telugu', 'Environmental Science', 'Hindi'],
  5: ['Mathematics', 'English', 'Telugu', 'Environmental Science', 'Hindi', 'Social Studies'],
}

interface SubjectRow {
  subject_en: string
  subject_te: string
}

interface Props {
  board: Board
  grade: number
  medium: Medium
  onClose: () => void
  onSaved: (subjects: Array<{ subject_en: string; subject_te: string | null }>) => void
}

export default function AddSubjectsModal({ board, grade, medium, onClose, onSaved }: Props) {
  const showTelugu = medium === 'TELUGU' || medium === 'BOTH'
  const suggestions = SUGGESTIONS[grade] ?? []

  const [rows, setRows] = useState<SubjectRow[]>([{ subject_en: '', subject_te: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addRow() {
    setRows((prev) => [...prev, { subject_en: '', subject_te: '' }])
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateRow(i: number, field: keyof SubjectRow, value: string) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  function addSuggestion(name: string) {
    // If already in list, skip
    if (rows.some((r) => r.subject_en.toLowerCase() === name.toLowerCase())) return
    // If last row is empty, fill it; otherwise add new row
    const lastRow = rows[rows.length - 1]
    if (!lastRow.subject_en.trim()) {
      setRows((prev) => prev.map((r, idx) => idx === prev.length - 1 ? { ...r, subject_en: name } : r))
    } else {
      setRows((prev) => [...prev, { subject_en: name, subject_te: '' }])
    }
  }

  async function handleSave() {
    const valid = rows.filter((r) => r.subject_en.trim())
    if (!valid.length) {
      setError('Add at least one subject name.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/content-studio/grade-subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board,
          grade,
          subjects: valid.map((r) => ({
            subject_en: r.subject_en.trim(),
            subject_te: r.subject_te.trim() || null,
          })),
        }),
      })
      if (!res.ok) {
        const json = (await res.json()) as { message?: string }
        throw new Error(json.message ?? `HTTP ${res.status}`)
      }
      const json = (await res.json()) as { data: Array<{ subject_en: string; subject_te: string | null }> }
      onSaved(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed — try again.')
    } finally {
      setSaving(false)
    }
  }

  const filledCount = rows.filter((r) => r.subject_en.trim()).length
  const unusedSuggestions = suggestions.filter((s) => !rows.some((r) => r.subject_en.toLowerCase() === s.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Add subjects for Grade {grade}</p>
              <p className="text-[11px] text-slate-400">{board} · saved to database</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Suggestions */}
          {unusedSuggestions.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Suggested ({board})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {unusedSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => addSuggestion(s)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Column headers */}
          <div className={`grid gap-2 ${showTelugu ? 'grid-cols-[1fr_1fr_auto]' : 'grid-cols-[1fr_auto]'}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">English name</p>
            {showTelugu && <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Telugu name</p>}
            <span />
          </div>

          {/* Subject rows */}
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className={`grid gap-2 items-center ${showTelugu ? 'grid-cols-[1fr_1fr_auto]' : 'grid-cols-[1fr_auto]'}`}>
                <input
                  type="text"
                  placeholder="e.g. Mathematics"
                  value={row.subject_en}
                  onChange={(e) => updateRow(i, 'subject_en', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {showTelugu && (
                  <input
                    type="text"
                    placeholder="ఉదా: గణితం"
                    value={row.subject_te}
                    onChange={(e) => updateRow(i, 'subject_te', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-telugu"
                    lang="te"
                  />
                )}
                <button
                  onClick={() => rows.length > 1 ? removeRow(i) : updateRow(i, 'subject_en', '')}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                  aria-label="Remove row"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add row */}
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add another subject
          </button>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          <p className="text-xs text-slate-400">
            {filledCount > 0 ? `${filledCount} subject${filledCount !== 1 ? 's' : ''} ready` : 'No subjects added yet'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || filledCount === 0}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Save subjects
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
