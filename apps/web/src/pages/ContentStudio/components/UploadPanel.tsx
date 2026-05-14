import { useRef, useState, useEffect, useCallback } from 'react'
import { Upload, FileText, ChevronDown, Loader2, CheckCircle2, AlertCircle, BookOpen, BookMarked, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ContentSession, Board, Medium, LLMProvider, TextbookStructure, DBChapter } from '../types'
import { BOARDS, SUBJECTS, MEDIUM_OPTIONS, LLM_PROVIDER_OPTIONS } from '../types'
import type { ParsedChapter } from '../hooks/useContentStudio'
import PdfPreviewModal from './PdfPreviewModal'
import ParseConfirmModal from './ParseConfirmModal'
import ParsingProgressModal from './ParsingProgressModal'
import AddSubjectsModal from './AddSubjectsModal'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

interface UploadPanelProps {
  session: Partial<ContentSession>
  textbookStructure: TextbookStructure | null
  isLoadingStructure: boolean
  loadError: string | null
  selectedTopicId: string | null
  isAllTopicsMode: boolean
  isAnyGenerating: boolean
  missingMedium: 'ENGLISH' | 'TELUGU' | null
  onSessionChange: (updates: Partial<ContentSession>) => void
  onLoadStructure: (board: string, grade: number, subject: string) => Promise<void>
  onParseIndexText: (text: string, images?: string[]) => Promise<{ chapters: ParsedChapter[]; garbledFontDetected?: boolean }>
  onSaveStructure: (board: string, grade: number, subject: string, chapters: ParsedChapter[]) => Promise<void>
  onAppendChapters: (textbookId: string, chapters: ParsedChapter[]) => Promise<void>
  onSelectTopic: (topicId: string, titleEn: string, titleTe: string | null, chapterTitleEn: string, chapterNumber: number, chapterTopics?: Array<{ number: number; title: string }>) => Promise<void>
  onSelectAllTopics: (chapterId: string, chapterTitleEn: string, chapterNumber: number) => void
  onGenerate: (session: ContentSession) => void
  onGenerateAllTopics: (chapter: DBChapter, session: Partial<ContentSession>) => void
  onStop: () => void
  onGenerateMissing: (topicId: string | null) => void
}

// ── Inline Select ─────────────────────────────────────────────────

function Select({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string
  value: string | number | undefined
  onChange: (v: string) => void
  options: { value: string | number; label: string }[]
  disabled?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        >
          <option value="">— Select —</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
      </div>
    </div>
  )
}

// ── Drop zone ─────────────────────────────────────────────────────

function DropZone({
  label,
  icon,
  accept,
  isLoading,
  isLoaded,
  filename,
  onFile,
  disabled,
}: {
  label: string
  icon: React.ReactNode
  accept: string
  isLoading?: boolean
  isLoaded?: boolean
  filename?: string
  onFile: (f: File) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && !disabled) onFile(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative cursor-pointer rounded-xl border-2 border-dashed p-3 text-center transition-colors
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${isDragging ? 'border-primary bg-primary/5'
          : isLoaded ? 'border-success/40 bg-success/5'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />
      {isLoading ? (
        <div className="flex flex-col items-center gap-1.5">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-xs text-slate-500">Parsing…</p>
        </div>
      ) : isLoaded ? (
        <div className="flex items-center gap-2 justify-center">
          <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
          <p className="text-xs text-slate-600 truncate max-w-[160px]">{filename}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
            {icon}
          </div>
          <p className="text-xs font-medium text-slate-700">{label}</p>
          <p className="text-[10px] text-slate-400">Click or drag PDF</p>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────

export default function UploadPanel({
  session,
  textbookStructure,
  isLoadingStructure,
  loadError,
  selectedTopicId,
  isAllTopicsMode,
  isAnyGenerating,
  missingMedium,
  onSessionChange,
  onLoadStructure,
  onParseIndexText,
  onSaveStructure,
  onAppendChapters,
  onSelectTopic,
  onSelectAllTopics,
  onGenerate,
  onGenerateAllTopics,
  onStop,
  onGenerateMissing,
}: UploadPanelProps) {
  // Local chapter/topic selection
  const [localChapterId, setLocalChapterId] = useState<string>('')
  const [localTopicValue, setLocalTopicValue] = useState<string>('') // '' | 'ALL' | topicId

  // Index PDF modal
  const [indexPdfFile, setIndexPdfFile] = useState<File | null>(null)
  const [showIndexModal, setShowIndexModal] = useState(false)
  const [parsedChapters, setParsedChapters] = useState<ParsedChapter[] | null>(null)
  const [showParseConfirm, setShowParseConfirm] = useState(false)
  const [indexError, setIndexError] = useState<string | null>(null)
  const [savingIndex, setSavingIndex] = useState(false)
  const [showReparse, setShowReparse] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isAppendMode, setIsAppendMode] = useState(false)
  const [garbledFontWarning, setGarbledFontWarning] = useState(false)

  // Chapter PDF modal
  const [chapterPdfFile, setChapterPdfFile] = useState<File | null>(null)
  const [showChapterModal, setShowChapterModal] = useState(false)
  const [chapterLoaded, setChapterLoaded] = useState(false)
  const [chapterFileName, setChapterFileName] = useState<string | null>(null)

  // DB-backed subjects for grades not in the static SUBJECTS constant
  const [dbSubjects, setDbSubjects] = useState<Array<{ subject_en: string; subject_te: string | null }>>([])
  const [isFetchingSubjects, setIsFetchingSubjects] = useState(false)
  const [showAddSubjectsModal, setShowAddSubjectsModal] = useState(false)

  const chapters = textbookStructure?.chapters ?? []
  const selectedChapter = chapters.find((c) => c.id === localChapterId) ?? null
  const topics = selectedChapter?.topics ?? []

  const grades = Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: `Grade ${i + 1}` }))

  const staticSubjects = session.grade ? (SUBJECTS[session.grade] ?? []) : []
  const staticSubjectOptions = staticSubjects.map((s) => ({ value: s, label: s }))
  const dbSubjectOptions = dbSubjects.map((s) => ({ value: s.subject_en, label: s.subject_en }))
  const subjectOptions = staticSubjectOptions.length > 0 ? staticSubjectOptions : dbSubjectOptions
  const subjectsAreEmpty = !!session.grade && !!session.board && staticSubjects.length === 0 && dbSubjects.length === 0

  const fetchDbSubjects = useCallback(async (board: string, grade: number) => {
    setIsFetchingSubjects(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/content-studio/grade-subjects?board=${encodeURIComponent(board)}&grade=${grade}`)
      if (res.ok) {
        const json = (await res.json()) as { data: Array<{ subject_en: string; subject_te: string | null }> }
        setDbSubjects(json.data ?? [])
      }
    } catch {
      // silently ignore — subjects will just show empty
    } finally {
      setIsFetchingSubjects(false)
    }
  }, [])

  // Fetch DB subjects whenever board+grade change and static list is empty
  useEffect(() => {
    if (session.board && session.grade && staticSubjects.length === 0) {
      void fetchDbSubjects(session.board, session.grade)
    } else {
      setDbSubjects([])
    }
  }, [session.board, session.grade])
  const syllabusComplete = !!(session.board && session.grade && session.subject)

  // Auto-load textbook structure when syllabus is complete
  useEffect(() => {
    if (session.board && session.grade && session.subject) {
      onLoadStructure(session.board, session.grade, session.subject)
      // Reset local chapter/topic selection
      setLocalChapterId('')
      setLocalTopicValue('')
    }
  }, [session.board, session.grade, session.subject])

  // Reset topic when chapter changes
  useEffect(() => {
    setLocalTopicValue('')
  }, [localChapterId])

  // Reset local state when structure is loaded fresh
  useEffect(() => {
    if (textbookStructure?.exists) {
      setLocalChapterId('')
      setLocalTopicValue('')
    }
  }, [textbookStructure?.exists])

  // ── Topic selection ────────────────────────────────────────────

  async function handleTopicChange(value: string) {
    setLocalTopicValue(value)
    if (!selectedChapter) return

    if (value === 'ALL') {
      onSelectAllTopics(selectedChapter.id, selectedChapter.title_en, selectedChapter.chapter_number)
    } else if (value) {
      const topic = topics.find((t) => t.id === value)
      if (topic) {
        await onSelectTopic(
          topic.id,
          topic.title_en,
          topic.title_te,
          selectedChapter.title_en,
          selectedChapter.chapter_number,
          selectedChapter.topics.map((t) => ({ number: t.topic_number, title: t.title_en })),
        )
      }
    }
  }

  // ── Index PDF ──────────────────────────────────────────────────

  function handleIndexFile(file: File) {
    setIndexError(null)
    setIndexPdfFile(file)
    setShowIndexModal(true)
  }

  async function handleIndexParsed(text: string, pageImages?: string[]) {
    setShowIndexModal(false)
    setIndexError(null)
    setIsParsing(true)
    try {
      const result = await onParseIndexText(text, pageImages)
      if (!result?.chapters?.length) {
        setIndexError('No chapters found — try selecting more pages or different pages.')
        return
      }
      setGarbledFontWarning(result.garbledFontDetected === true)
      // Auto-create a synthetic topic for any chapter that has no parsed topics
      const normalized = result.chapters.map((ch) => ({
        ...ch,
        topics: ch.topics.length > 0
          ? ch.topics
          : [{ topic_number: 1, title_en: ch.title_en, title_te: ch.title_te, synthetic: true }],
      }))
      setParsedChapters(normalized)
      setShowParseConfirm(true)
    } catch {
      setIndexError('Failed to parse. Try again or switch the AI model.')
    } finally {
      setIsParsing(false)
    }
  }

  async function handleConfirmSave() {
    if (!parsedChapters || !session.board || !session.grade || !session.subject) return
    setSavingIndex(true)
    try {
      if (isAppendMode && textbookStructure?.textbook?.id) {
        await onAppendChapters(textbookStructure.textbook.id, parsedChapters)
      } else {
        await onSaveStructure(session.board, session.grade, session.subject, parsedChapters)
      }
      setShowParseConfirm(false)
      setParsedChapters(null)
      setShowReparse(false)
      setIsAppendMode(false)
    } catch {
      setIndexError('Failed to save. Try again.')
      setShowParseConfirm(false)
    } finally {
      setSavingIndex(false)
    }
  }

  // ── Chapter PDF ────────────────────────────────────────────────

  function handleChapterFile(file: File) {
    setChapterPdfFile(file)
    setShowChapterModal(true)
  }

  function handleChapterConfirm(text: string) {
    setShowChapterModal(false)
    setChapterLoaded(true)
    setChapterFileName(chapterPdfFile?.name ?? null)
    onSessionChange({ topicContext: text })
  }

  // ── Generate ───────────────────────────────────────────────────

  const isTopicSelected = localTopicValue !== '' && localTopicValue !== 'ALL' && !!selectedTopicId
  const isAllTopicsSelected = localTopicValue === 'ALL' && !!localChapterId && topics.length > 0

  const canGenerate = !!(
    session.board &&
    session.grade &&
    session.subject &&
    session.medium &&
    !isAnyGenerating &&
    (isTopicSelected || isAllTopicsSelected)
  )

  function handleGenerate() {
    if (!canGenerate) return

    if (isAllTopicsSelected && selectedChapter) {
      onGenerateAllTopics(selectedChapter, session)
    } else {
      onGenerate({
        board: session.board!,
        grade: session.grade!,
        subject: session.subject!,
        chapterNumber: session.chapterNumber ?? 1,
        chapterTitle: session.chapterTitle!,
        topicTitle: session.topicTitle!,
        topicContext: session.topicContext ?? '',
        medium: session.medium ?? 'ENGLISH',
        model: session.model ?? 'claude',
      })
    }
  }

  const showTopicSection = syllabusComplete && !isLoadingStructure && textbookStructure?.exists
  const showChapterPdfSection = isTopicSelected || isAllTopicsSelected

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white border-r border-slate-200">
      <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <h2 className="text-sm font-bold text-slate-900">Content Setup</h2>
        <p className="text-xs text-slate-400 mt-0.5">Configure syllabus, select topic, generate</p>
      </div>

      <div className="flex-1 space-y-5 p-5 overflow-y-auto">

        {/* ── Syllabus selectors ──────────────────────────── */}
        <div className="space-y-3">
          <Select
            label="Board / Syllabus"
            value={session.board}
            onChange={(v) => onSessionChange({ board: v as Board, subject: undefined })}
            options={BOARDS}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Grade"
              value={session.grade}
              onChange={(v) => onSessionChange({ grade: parseInt(v), subject: undefined })}
              options={grades}
            />
            <Select
              label="Medium"
              value={session.medium}
              onChange={(v) => onSessionChange({ medium: v as Medium })}
              options={MEDIUM_OPTIONS}
            />
          </div>
          {/* Subject — with DB-fetch fallback for grades without static subjects */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</label>
              {isFetchingSubjects && (
                <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
              )}
              {!isFetchingSubjects && session.board && session.grade && staticSubjects.length === 0 && (
                <button
                  onClick={() => setShowAddSubjectsModal(true)}
                  className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                >
                  <PlusCircle className="h-3 w-3" />
                  {dbSubjects.length > 0 ? 'Edit subjects' : 'Add subjects'}
                </button>
              )}
            </div>
            {subjectsAreEmpty ? (
              <button
                onClick={() => setShowAddSubjectsModal(true)}
                className="w-full flex items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-400 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors"
              >
                <PlusCircle className="h-4 w-4 flex-shrink-0" />
                No subjects for Grade {session.grade} — click to add
              </button>
            ) : (
              <div className="relative">
                <select
                  value={session.subject ?? ''}
                  onChange={(e) => onSessionChange({ subject: e.target.value })}
                  disabled={!session.grade || isFetchingSubjects}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                >
                  <option value="">— Select —</option>
                  {subjectOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            )}
          </div>

          {/* ── AI Model selector ───────────────────── */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">AI Model</label>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
              {LLM_PROVIDER_OPTIONS.map((opt) => {
                const isSelected = (session.model ?? 'claude') === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => onSessionChange({ model: opt.value as LLMProvider })}
                    title={opt.description}
                    className={`flex-1 flex flex-col items-center justify-center px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-white shadow-sm text-slate-900'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span className="font-semibold">{opt.label}</span>
                    <span className={`text-[9px] font-normal mt-0.5 ${isSelected ? 'text-slate-400' : 'text-slate-400/60'}`}>
                      {opt.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* ── Textbook structure section ───────────────────── */}
        {syllabusComplete && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5" />
                Chapters &amp; Topics
              </p>
              {showTopicSection && !showReparse && (
                <button
                  onClick={() => { setIsAppendMode(true); setShowReparse(true); setIndexError(null) }}
                  className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                >
                  <PlusCircle className="h-3 w-3" />
                  More chapters
                </button>
              )}
            </div>

            {/* Loading */}
            {isLoadingStructure && (
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                <p className="text-xs text-slate-500">Checking database…</p>
              </div>
            )}

            {/* API / DB error */}
            {!isLoadingStructure && loadError && (
              <div className="flex items-start gap-1.5 rounded-lg bg-danger/5 border border-danger/20 px-3 py-2.5">
                <AlertCircle className="h-3.5 w-3.5 text-danger mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-danger">{loadError}</p>
              </div>
            )}

            {/* Not in DB → upload index PDF */}
            {!isLoadingStructure && textbookStructure && (!textbookStructure.exists || showReparse) && (
              <div className="space-y-2">
                {!textbookStructure.exists && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                    <p className="text-[11px] text-amber-700 font-medium">
                      No textbook structure found. Upload the index/TOC PDF to extract chapter &amp; topic titles.
                    </p>
                  </div>
                )}

                {showReparse && textbookStructure.exists && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
                    <p className="text-[11px] text-blue-700 font-medium">
                      {isAppendMode
                        ? `Upload the Semester 2 index PDF. Chapters will be appended after Ch.${chapters.length} with continuing numbers.`
                        : 'Re-upload index PDF to update the chapter & topic structure.'}
                    </p>
                  </div>
                )}

                {garbledFontWarning && (
                  <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-amber-800">
                      This PDF uses a legacy Telugu font — Telugu titles couldn't be read as text and were set to blank. Switch to <strong>Gemini</strong> model and re-upload to extract Telugu titles from page images.
                    </p>
                  </div>
                )}

                {indexError && (
                  <div className="flex items-start gap-1.5 rounded-lg bg-danger/5 border border-danger/20 px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 text-danger mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-danger">{indexError}</p>
                  </div>
                )}

                <DropZone
                  label="Upload Index / TOC PDF"
                  icon={<FileText className="h-4 w-4 text-slate-500" />}
                  accept=".pdf"
                  onFile={handleIndexFile}
                />

                {showReparse && (
                  <button
                    onClick={() => { setShowReparse(false); setIndexError(null); setIsAppendMode(false) }}
                    className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    ✕ Cancel {isAppendMode ? 'append' : 're-upload'}
                  </button>
                )}
              </div>
            )}

            {/* Found in DB → chapter + topic dropdowns */}
            {showTopicSection && (
              <div className="space-y-3">
                <Select
                  label="Chapter"
                  value={localChapterId}
                  onChange={(v) => setLocalChapterId(v)}
                  options={chapters.map((ch) => {
                    const title =
                      session.medium === 'TELUGU' && ch.title_te
                        ? ch.title_te
                        : session.medium === 'BOTH' && ch.title_te
                        ? `${ch.title_en} / ${ch.title_te}`
                        : ch.title_en
                    return { value: ch.id, label: `Ch.${ch.chapter_number} · ${title}` }
                  })}
                  disabled={isAnyGenerating}
                />

                {localChapterId && (
                  <Select
                    label="Topic"
                    value={localTopicValue}
                    onChange={handleTopicChange}
                    options={[
                      { value: 'ALL', label: `📚 All Topics (${topics.length} topics)` },
                      ...topics.map((t) => {
                        const topicTitle =
                          session.medium === 'TELUGU' && t.title_te
                            ? t.title_te
                            : session.medium === 'BOTH' && t.title_te
                            ? `${t.title_en} / ${t.title_te}`
                            : t.title_en
                        return { value: t.id, label: `${t.topic_number}. ${topicTitle}` }
                      }),
                    ]}
                    disabled={isAnyGenerating}
                  />
                )}

                {/* Missing medium banner (single-topic mode only) */}
                {!isAllTopicsMode && missingMedium && !isAnyGenerating && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 space-y-2">
                    <p className="text-[11px] text-amber-800 font-medium">
                      {missingMedium === 'TELUGU'
                        ? 'Telugu content not yet generated for this topic.'
                        : 'English content not yet generated for this topic.'}{' '}
                      Generate it now using the existing content as reference.
                    </p>
                    <button
                      onClick={() => onGenerateMissing(selectedTopicId)}
                      className="rounded-lg bg-amber-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 transition-colors"
                    >
                      Generate {missingMedium === 'TELUGU' ? 'Telugu' : 'English'} Content
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Re-parse option */}
            {showTopicSection && !showReparse && (
              <button
                onClick={() => {
                  setIndexError(null)
                  setIndexPdfFile(null)
                  setShowReparse(true)
                }}
                className="text-[10px] text-slate-400 hover:text-primary transition-colors"
              >
                ↑ Re-upload index PDF to update structure
              </button>
            )}
          </div>
        )}

        {!syllabusComplete && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-5 text-center">
            <p className="text-[11px] text-slate-400">
              Select board, grade, and subject to load the chapter &amp; topic list
            </p>
          </div>
        )}

        {/* ── Selected topic / all-topics info ────────────── */}
        {(session.topicTitle || isAllTopicsSelected) && (
          <>
            <div className="border-t border-slate-100" />
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <BookMarked className="h-3.5 w-3.5" />
                {isAllTopicsSelected ? 'Generating' : 'Selected Topic'}
              </p>
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                {isAllTopicsSelected ? (
                  <>
                    <p className="text-[11px] text-primary font-semibold truncate">
                      All {topics.length} topics in this chapter
                    </p>
                    {selectedChapter && (
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {selectedChapter.title_en}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-[11px] text-primary font-semibold truncate">{session.topicTitle}</p>
                    {session.chapterTitle && (
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{session.chapterTitle}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Chapter PDF (optional context) ──────────────── */}
        {showChapterPdfSection && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Chapter PDF{' '}
              <span className="font-normal normal-case">
                {isAllTopicsSelected ? '(recommended for context)' : '(optional — adds context)'}
              </span>
            </p>
            <DropZone
              label="Upload Chapter PDF"
              icon={<Upload className="h-4 w-4 text-slate-500" />}
              accept=".pdf"
              isLoaded={chapterLoaded}
              filename={chapterFileName ?? undefined}
              onFile={handleChapterFile}
            />
            {chapterLoaded && (
              <p className="text-[10px] text-slate-400">
                Text extracted — Claude will use this as context for generation.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Generate button (pinned bottom) ──────────────── */}
      <div className="border-t border-slate-200 p-4 bg-white flex-shrink-0">
        {isAnyGenerating ? (
          <Button
            onClick={onStop}
            variant="outline"
            className="w-full gap-2 border-danger text-danger hover:bg-danger/5"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Stop Generation
          </Button>
        ) : (
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full gap-2 bg-primary hover:bg-primary/90 disabled:opacity-40"
          >
            <span className="text-base leading-none">▶</span>
            {isAllTopicsSelected
              ? `Generate All ${topics.length} Topics`
              : 'Generate Content'}
          </Button>
        )}
        {!canGenerate && !isAnyGenerating && (
          <p className="mt-2 text-center text-[10px] text-slate-400">
            {!session.board
              ? 'Select board'
              : !session.grade
              ? 'Select grade'
              : !session.subject
              ? 'Select subject'
              : !session.medium
              ? 'Select medium'
              : !localChapterId
              ? 'Select a chapter'
              : !localTopicValue
              ? 'Select a topic or All Topics'
              : ''}
          </p>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────── */}
      {isParsing && <ParsingProgressModal model={session.model ?? 'claude'} />}

      {showIndexModal && indexPdfFile && (
        <PdfPreviewModal
          file={indexPdfFile}
          purpose="index"
          model={session.model ?? 'claude'}
          onClose={() => setShowIndexModal(false)}
          onConfirm={(_text, _range, images) => void handleIndexParsed(_text, images)}
        />
      )}

      {showParseConfirm && parsedChapters && (
        <ParseConfirmModal
          chapters={parsedChapters}
          onConfirm={() => void handleConfirmSave()}
          onCancel={() => { setShowParseConfirm(false); setParsedChapters(null) }}
          isSaving={savingIndex}
          appendFrom={isAppendMode && chapters.length > 0 ? Math.max(...chapters.map((c) => c.chapter_number)) + 1 : undefined}
        />
      )}

      {showChapterModal && chapterPdfFile && (
        <PdfPreviewModal
          file={chapterPdfFile}
          purpose="chapter"
          onClose={() => setShowChapterModal(false)}
          onConfirm={(text) => handleChapterConfirm(text)}
        />
      )}

      {showAddSubjectsModal && session.board && session.grade && (
        <AddSubjectsModal
          board={session.board as Board}
          grade={session.grade}
          medium={session.medium ?? 'ENGLISH'}
          onClose={() => setShowAddSubjectsModal(false)}
          onSaved={(saved) => {
            setDbSubjects(saved)
            setShowAddSubjectsModal(false)
          }}
        />
      )}
    </div>
  )
}
